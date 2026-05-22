"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Download, Edit, ClipboardList } from 'lucide-react';
import { useSharedActivities } from '../sharedStore';
import { getStudents, getGrades, saveGrade } from '../services';

// --- Types ---
interface Student {
  id: string;
  name: string;
  scores: Record<string, number | null>;
}

// --- Helpers ---
const getGradePill = (pct: number) => {
  if (pct >= 90) return { label: 'A', bg: 'bg-emerald-50', text: 'text-emerald-800' };
  if (pct >= 75) return { label: 'B', bg: 'bg-blue-50',    text: 'text-blue-800' };
  if (pct >= 50) return { label: 'C', bg: 'bg-amber-50',   text: 'text-amber-700' };
  return                 { label: 'F', bg: 'bg-red-50',     text: 'text-red-700' };
};

const getScoreColor = (pct: number) => {
  if (pct >= 90) return 'text-green-700';
  if (pct >= 75) return 'text-blue-700';
  if (pct >= 50) return 'text-amber-700';
  return 'text-red-600';
};

const getBarColor = (pct: number) => {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 75) return 'bg-blue-600';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-red-500';
};

const getNameColor = (name: string) => {
  const colors = [
    ['bg-blue-100', 'text-blue-700'],
    ['bg-purple-100', 'text-purple-700'],
    ['bg-amber-100', 'text-amber-700'],
    ['bg-red-100', 'text-red-700'],
    ['bg-emerald-100', 'text-emerald-700'],
    ['bg-rose-100', 'text-rose-700'],
  ];
  const hash = name.split('').reduce((a, c) => c.charCodeAt(0) + a, 0);
  return colors[hash % colors.length];
};

const MetricCard = ({ label, value, subtitle, colorClass }: { label: string, value: string | number, subtitle: string, colorClass: string }) => (
  <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <h3 className={`text-2xl font-mono font-bold ${colorClass} mt-1`}>{value}</h3>
    <p className="text-[10px] font-medium text-slate-400 mt-1">{subtitle}</p>
  </div>
);

interface GradebookModuleProps {
  defaultGrade?: string;
  defaultSection?: string;
}

const GradebookModule: React.FC<GradebookModuleProps> = ({ defaultGrade, defaultSection }) => {
  const { activities: allActivities } = useSharedActivities();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Initialise students from the service on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const serviceStudents = await getStudents();
        if (!cancelled) {
          setStudents(serviceStudents.map(s => ({ id: s.id, name: s.name, scores: {} })));
        }
      } catch {
        // keep empty state on error
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Merge grades from the service whenever the selected activity changes
  useEffect(() => {
    if (!selectedActivityId) return;
    let cancelled = false;
    (async () => {
      try {
        const gradeRecords = await getGrades(selectedActivityId);
        if (!cancelled) {
          setStudents(prev => prev.map(s => {
            const record = gradeRecords.find(r => r.studentId === s.id);
            if (!record) return s;
            return {
              ...s,
              scores: { ...s.scores, [selectedActivityId]: record.score },
            };
          }));
        }
      } catch {
        // keep existing scores on error
      }
    })();
    return () => { cancelled = true; };
  }, [selectedActivityId]);

  // On mount or when activities load, default to first non-draft activity
  useEffect(() => {
    if (!selectedActivityId && allActivities.length > 0) {
      const first = allActivities.find(a => a.status !== 'Draft');
      if (first) setSelectedActivityId(first.id);
    }
  }, [allActivities, selectedActivityId]);

  const selectedActivity = useMemo(() =>
    allActivities.find(a => a.id === selectedActivityId),
    [allActivities, selectedActivityId]
  );

  // --- Computed Values ---
  const studentRows = useMemo(() => {
    if (!selectedActivity) return [];
    return students.map(student => {
      const score = student.scores[selectedActivity.id] ?? null;
      const max = selectedActivity.maxScore;
      const pct = score !== null ? Math.round((score / max) * 100) : null;
      const grade = pct !== null ? getGradePill(pct) : null;
      const submitted = score !== null;
      return { ...student, score, max, pct, grade, submitted };
    });
  }, [students, selectedActivity]);

  const classStats = useMemo(() => {
    if (!selectedActivity) return null;
    const scored = studentRows.filter(s => s.score !== null);
    const avg = scored.length > 0
      ? scored.reduce((a, s) => a + (s.pct ?? 0), 0) / scored.length
      : 0;
    const avgRaw = scored.length > 0
      ? scored.reduce((a, s) => a + (s.score ?? 0), 0) / scored.length
      : 0;
    
    // safe reduce for best student
    const top = scored.reduce((best: any, s: any) =>
      s.score > (best?.score ?? -1) ? s : best, null as any
    );
    
    const below50 = scored.filter(s => (s.pct ?? 0) < 50).length;
    const missing = studentRows.filter(s => !s.submitted).length;
    return { avg, avgRaw, top, below50, missing, gradedCount: scored.length };
  }, [studentRows, selectedActivity]);

  const taskSubmissionPct = (act: any) => {
    const scored = students.filter(s =>
      s.scores[act.id] !== null && s.scores[act.id] !== undefined
    ).length;
    return Math.round((scored / students.length) * 100);
  };

  // --- Score Edit Handler ---
  const handleScoreChange = (studentId: string, activityId: string, value: string) => {
    const num = value === '' ? null : Math.max(0,
      Math.min(selectedActivity?.maxScore ?? 100, parseFloat(value))
    );
    setStudents(prev => prev.map(s =>
      s.id === studentId
        ? { ...s, scores: { ...s.scores, [activityId]: num } }
        : s
    ));
  };

  // Persist the current score for a student to the service (called on blur / Enter)
  const handleScorePersist = (studentId: string, activityId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const score = student.scores[activityId] ?? null;
    saveGrade(activityId, studentId, score).catch(() => {
      // silently ignore persistence errors — local state is already updated
    });
  };

  return (
    <div className="flex-1 space-y-5">
      {/* ── TOP CONTROLS ── */}
      <div className="flex items-center justify-between gap-3">
        <button className="flex items-center gap-2 border border-slate-200 
          rounded-lg px-3 py-2 text-sm text-slate-600 bg-white 
          hover:bg-slate-50 transition-colors">
          <Download size={15} /> Export CSV
        </button>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 
            text-sm font-medium text-white shadow-sm transition-all ${
            isEditMode
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-[#1a237e] hover:bg-blue-900'
          }`}
        >
          <Edit size={15} />
          {isEditMode ? 'Save Grades' : 'Enter Grades'}
        </button>
      </div>

      {/* ── METRIC CARDS (5 cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Students"
          value={students.length}
          subtitle="in section"
          colorClass="text-blue-600"
        />

        <MetricCard
          label="Task Avg"
          value={classStats ? `${Math.round(classStats.avg)}%` : '—'}
          subtitle="this activity"
          colorClass={
            classStats
              ? classStats.avg >= 75
                ? 'text-emerald-600'
                : classStats.avg >= 50
                ? 'text-amber-500'
                : 'text-red-500'
              : 'text-slate-400'
          }
        />

        <MetricCard
          label="Top Score"
          value={classStats?.top 
            ? `${classStats.top.score}/${selectedActivity?.maxScore}` 
            : '—'}
          subtitle={classStats?.top?.name ?? '—'}
          colorClass="text-emerald-600"
        />

        <MetricCard
          label="Below 50%"
          value={classStats?.below50 ?? '—'}
          subtitle="need attention"
          colorClass="text-red-500"
        />

        <MetricCard
          label="Missing"
          value={classStats?.missing ?? '—'}
          subtitle="not submitted"
          colorClass="text-amber-500"
        />
      </div>

      {/* ── TASK SELECTOR STRIP ── */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 
        shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest 
            text-slate-400">Select Activity</span>
          <span className="text-[10px] text-slate-400">
            {allActivities.filter(a => a.status !== 'Draft').length} activities
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {allActivities
            .filter(a => a.status !== 'Draft')
            .map(act => {
              const isActive = act.id === selectedActivityId;
              const subPct = taskSubmissionPct(act);
              return (
                <button
                  key={act.id}
                  onClick={() => {
                    setSelectedActivityId(act.id);
                    setIsEditMode(false);
                  }}
                  className={`flex flex-col gap-1.5 p-3 rounded-xl 
                    border flex-shrink-0 min-w-[140px] text-left 
                    transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1a237e] border-[#1a237e] shadow-md shadow-blue-900/20'
                      : 'bg-white border-slate-200 hover:border-[#1a237e] hover:bg-blue-50/20'
                  }`}
                >
                  {/* Type badge */}
                  <span className={`self-start text-[9px] font-bold px-1.5 
                    py-0.5 rounded ${
                    isActive
                      ? 'bg-white/15 text-white/70'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {act.type}
                  </span>

                  {/* Title */}
                  <span className={`text-xs font-medium leading-tight ${
                    isActive ? 'text-white' : 'text-slate-800'
                  }`}>
                    {act.title}
                  </span>

                  {/* Max + graded count */}
                  <span className={`text-[10px] ${
                    isActive ? 'text-white/50' : 'text-slate-400'
                  }`}>
                    Max {act.maxScore} pts · {
                      students.filter(s =>
                        s.scores[act.id] !== null &&
                        s.scores[act.id] !== undefined
                      ).length
                    }/{students.length} graded
                  </span>

                  {/* Submission progress bar */}
                  <div className={`h-1 rounded-full overflow-hidden ${
                    isActive ? 'bg-white/20' : 'bg-slate-100'
                  }`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        isActive ? 'bg-white/60' :
                        subPct === 100 ? 'bg-emerald-500' :
                        subPct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${subPct}%` }}
                    />
                  </div>
                </button>
              );
            })
          }
        </div>
      </div>

      {/* ── RESULTS TABLE ── */}
      {!selectedActivity ? (
        <div className="bg-white border border-slate-100 rounded-xl 
          flex flex-col items-center justify-center py-16 shadow-sm">
          <ClipboardList size={36} className="text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">
            Select an activity above to view results
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl 
          overflow-hidden shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-[10px] font-black uppercase 
                  tracking-widest text-slate-400 px-4 py-3 min-w-[200px]">
                  Student
                </th>
                <th className="text-center text-[10px] font-black uppercase 
                  tracking-widest text-slate-400 px-4 py-3">
                  Score /{selectedActivity.maxScore}
                </th>
                <th className="text-center text-[10px] font-black uppercase 
                  tracking-widest text-slate-400 px-4 py-3 min-w-[120px]">
                  Percentage
                </th>
                <th className="text-center text-[10px] font-black uppercase 
                  tracking-widest text-slate-400 px-4 py-3">
                  Grade
                </th>
                <th className="text-center text-[10px] font-black uppercase 
                  tracking-widest text-slate-400 px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map(student => {
                const [avatarBg, avatarText] = getNameColor(student.name);
                return (
                  <tr
                    key={student.id}
                    className={`border-b border-slate-50 transition-colors ${
                      !student.submitted
                        ? 'bg-red-50/30 hover:bg-red-50/50'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Student name + ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center 
                          justify-center text-[10px] font-bold flex-shrink-0 
                          shadow-sm ${avatarBg} ${avatarText}`}>
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">
                            {student.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {student.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3 text-center">
                      {isEditMode || editingStudentId === student.id ? (
                        <input
                          type="number"
                          min="0"
                          max={selectedActivity.maxScore}
                          step="0.5"
                          autoFocus={editingStudentId === student.id}
                          placeholder={String(selectedActivity.maxScore)}
                          value={student.score ?? ''}
                          onChange={e => handleScoreChange(
                            student.id, selectedActivity.id, e.target.value
                          )}
                          onBlur={() => {
                            handleScorePersist(student.id, selectedActivity.id);
                            setEditingStudentId(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleScorePersist(student.id, selectedActivity.id);
                              setEditingStudentId(null);
                            }
                          }}
                          className="w-16 border border-slate-200 rounded-lg 
                            px-2 py-1 text-sm text-center font-medium 
                            outline-none focus:ring-2 focus:ring-[#1a237e]/15 
                            focus:border-[#1a237e]/40 transition-all bg-white"
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingStudentId(student.id)}
                          className={`text-sm font-medium cursor-pointer hover:bg-slate-100 px-2 py-1 rounded transition-colors ${
                            student.pct !== null
                              ? getScoreColor(student.pct)
                              : 'text-slate-300 italic hover:text-slate-500'
                          }`}
                          title="Click to edit grade inline"
                        >
                          {student.score !== null
                            ? `${student.score}`
                            : '—'}
                        </span>
                      )}
                    </td>

                    {/* Percentage + mini bar */}
                    <td className="px-4 py-3">
                      {student.pct !== null ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-medium ${
                            getScoreColor(student.pct)
                          }`}>
                            {student.pct}%
                          </span>
                          <div className="w-16 h-1 bg-slate-100 rounded-full 
                            overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all 
                                duration-500 ${getBarColor(student.pct)}`}
                              style={{ width: `${student.pct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-sm 
                          text-center block">—</span>
                      )}
                    </td>

                    {/* Grade pill */}
                    <td className="px-4 py-3 text-center">
                      {student.grade ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] 
                          font-black ${student.grade.bg} ${student.grade.text}`}>
                          {student.grade.label}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Status pill */}
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] 
                        font-medium ${
                        student.submitted
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {student.submitted ? 'Submitted' : 'Missing'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Class average footer row */}
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="px-4 py-3">
                  <span className="text-xs font-bold text-slate-500 
                    uppercase tracking-tight">Class Average</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-medium text-slate-700">
                    {classStats
                      ? `${classStats.avgRaw.toFixed(1)}`
                      : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-bold ${
                    classStats
                      ? getScoreColor(Math.round(classStats.avg))
                      : 'text-slate-400'
                  }`}>
                    {classStats ? `${Math.round(classStats.avg)}%` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {classStats && (() => {
                    const g = getGradePill(Math.round(classStats.avg));
                    return (
                      <span className={`px-2 py-0.5 rounded text-[10px] 
                        font-black ${g.bg} ${g.text}`}>
                        {g.label}
                      </span>
                    );
                  })()}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── GRADE LEGEND ── */}
      <div className="flex items-center gap-3 justify-center flex-wrap py-1">
        {[
          { label: 'A', range: '90–100%', bg: 'bg-emerald-50', text: 'text-emerald-800' },
          { label: 'B', range: '75–89%',  bg: 'bg-blue-50',    text: 'text-blue-800' },
          { label: 'C', range: '50–74%',  bg: 'bg-amber-50',   text: 'text-amber-700' },
          { label: 'F', range: '<50%',    bg: 'bg-red-50',     text: 'text-red-700' },
        ].map(({ label, range, bg, text }, i, arr) => (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[9px] 
                font-black ${bg} ${text}`}>{label}</span>
              <span className="text-[10px] text-slate-400">{range}</span>
            </div>
            {i < arr.length - 1 && (
              <span className="text-slate-200">·</span>
            )}
          </React.Fragment>
        ))}
        <span className="text-slate-200">·</span>
        <span className="text-[10px] text-slate-400 italic">
          — not submitted
        </span>
      </div>
    </div>
  );
};

export default React.memo(GradebookModule);
