"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Eye, 
  EyeOff, 
  Calendar, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  BookOpen,
  X,
  Clock,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as homeworkService from '../services/homeworkService';
import * as studentsService from '../services/studentsService';

// --- Shared Types & Data ---

interface Student {
  id: string;
  name: string;
  initials: string;
}

interface DailyEntry {
  id: string;
  date: string;          // "YYYY-MM-DD"
  section: string;       // e.g. "Grade 7A"
  subject: string;
  type: "Homework" | "Classwork";
  title: string;
  description: string;
  maxScore: number;
  scores: Record<string, number | null>;  // studentId → score or null
  parentVisible: boolean;
}

const SECTIONS = ["Grade 7A", "Grade 7B", "Grade 8A", "Grade 8B", "Grade 9A", "Grade 10A"];// --- Helpers ---

function getMonday(date: Date | string) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeeksInMonth(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks: { start: Date; end: Date }[] = [];
  let current = getMonday(firstDay);
  while (current <= lastDay) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({ start: weekStart, end: weekEnd });
    current = new Date(current);
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function getCurrentWeekIndex(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const weeks = getWeeksInMonth(monthStart);
  return weeks.findIndex(w => date >= w.start && date <= w.end);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getEntryTypesForDay(date: Date, allEntries: DailyEntry[]) {
  const types = allEntries
    .filter(e => isSameDay(new Date(e.date), date))
    .map(e => e.type);
  return [...new Set(types)].slice(0, 4);
}

const ENTRY_DOT_COLORS: Record<string, string> = {
  'Homework':  '#f59e0b',
  'Classwork': '#7c3aed',
  'Exam':      '#ef4444',
  'Quiz':      '#0891b2',
  'Project':   '#10b981',
};

const getSubjectColor = (subject: string) => {
  switch (subject) {
    case 'Mathematics': return '#1a237e';
    case 'Physics': return '#7c3aed';
    case 'English': return '#0891b2';
    case 'Biology': return '#059669';
    case 'History': return '#d97706';
    case 'Chemistry': return '#dc2626';
    default: return '#1a237e';
  }
};

interface HomeworksModuleProps {
  globalGrade?: string;
  globalSection?: string;
}

const HomeworksModule = ({ globalGrade = "Grade 7", globalSection = "Sec A" }: HomeworksModuleProps) => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  
  // Derive selectedSection from props
  const selectedSection = `${globalGrade}${globalSection.replace('Sec ', '')}`;

  const [sectionStudents, setSectionStudents] = useState<import('../services/studentsService').Student[]>([]);

  // Load entries from service whenever selectedSection changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await homeworkService.getEntries(selectedSection);
        if (!cancelled) setEntries(data);
      } catch {
        // keep existing empty state
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSection]);

  // Load section students from service whenever selectedSection changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await studentsService.getStudentsBySection(selectedSection);
        if (!cancelled) setSectionStudents(data);
      } catch {
        // keep existing empty state
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSection]);
  
  const [subjectFilter, setSubjectFilter] = useState("All Subjects");
  const [typeFilter, setTypeFilter] = useState("All");
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date("2025-06-02T00:00:00");
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [selectedWeekIndex, setSelectedWeekIndex] = useState(() => {
    return getCurrentWeekIndex(new Date("2025-06-02T00:00:00"));
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date("2025-06-02T00:00:00");
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const allHomeworkEntries = entries;

  const weeksInMonth = useMemo(() => 
    getWeeksInMonth(viewMonth), 
    [viewMonth]
  );

  const currentWeek = weeksInMonth[selectedWeekIndex] ?? weeksInMonth[0];

  const daysInWeek = useMemo(() => {
    if (!currentWeek) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeek.start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeek]);

  const entriesForSelectedDay = useMemo(() =>
    allHomeworkEntries.filter(e => 
      isSameDay(new Date(e.date), selectedDate)
    ),
    [allHomeworkEntries, selectedDate]
  );

  const handlePrevMonth = () => {
    const prev = new Date(viewMonth);
    prev.setMonth(prev.getMonth() - 1);
    setViewMonth(prev);
    setSelectedWeekIndex(0);
    setSelectedDate(getMonday(prev));
  };

  const handleNextMonth = () => {
    const next = new Date(viewMonth);
    next.setMonth(next.getMonth() + 1);
    setViewMonth(next);
    setSelectedWeekIndex(0);
    setSelectedDate(getMonday(next));
  };

  const handleSelectWeek = (index: number) => {
    setSelectedWeekIndex(index);
    const weekStart = weeksInMonth[index]?.start;
    if (weekStart) {
      const monday = new Date(weekStart);
      const dayOfWeek = monday.getDay();
      const adjustedMonday = new Date(monday);
      if (dayOfWeek === 0) adjustedMonday.setDate(monday.getDate() + 1);
      setSelectedDate(adjustedMonday);
    }
  };

  const handleSelectDay = (date: Date) => {
    const isWeekend = [0, 6].includes(date.getDay());
    if (isWeekend) return;
    setSelectedDate(date);
  };

  const handleToday = () => {
    const today = new Date("2025-06-02T00:00:00");
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    setViewMonth(monthStart);
    setSelectedWeekIndex(getCurrentWeekIndex(today));
    setSelectedDate(today);
  };

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);

  // New Entry Form State
  const [newEntry, setNewEntry] = useState({
    date: "2025-06-02",
    type: "Homework" as "Homework" | "Classwork",
    subject: "Mathematics",
    section: SECTIONS[0],
    title: "",
    description: "",
    maxScore: 10,
    parentVisible: true
  });

  // Selected Entry & Local Score State
  const selectedEntry = entries.find(e => e.id === selectedEntryId) || null;
  const [editScores, setEditScores] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (selectedEntry) {
      setEditScores(selectedEntry.scores);
    }
  }, [selectedEntry?.id]);

  // Filters
  const filteredEntries = useMemo(() => {
    return entriesForSelectedDay.filter(entry => {
      const isSameSection = entry.section === selectedSection;
      const isSameSubject = subjectFilter === "All Subjects" || entry.subject === subjectFilter;
      const isSameType = typeFilter === "All" || entry.type === typeFilter;
      
      return isSameSection && isSameSubject && isSameType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entriesForSelectedDay, selectedSection, subjectFilter, typeFilter]);

  // Grouped Entries
  const groupedEntries = useMemo(() => {
    const groups: Record<string, DailyEntry[]> = {};
    filteredEntries.forEach(entry => {
      const date = new Date(entry.date);
      const key = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  // Metrics
  const metrics = useMemo(() => {
    const totalEntries = filteredEntries.length;
    let totalScore = 0;
    let scoreCount = 0;
    let missingScores = 0;
    let parentVisibleCount = 0;

    filteredEntries.forEach(e => {
      if (e.parentVisible) parentVisibleCount++;
      Object.values(e.scores).forEach(s => {
        if (typeof s === 'number') {
          totalScore += s;
          scoreCount++;
        } else {
          missingScores++;
        }
      });
    });

    // Correction: mean of all entered scores relative to their max scores
    let weightedSum = 0;
    let weightedCount = 0;
    filteredEntries.forEach(e => {
      Object.values(e.scores).forEach(s => {
        if (typeof s === 'number') {
          weightedSum += (s / e.maxScore);
          weightedCount++;
        }
      });
    });
    const trueAvg = weightedCount > 0 ? (weightedSum / weightedCount) * 100 : 0;

    return {
      entriesCount: totalEntries,
      avg: trueAvg,
      missing: missingScores,
      visible: parentVisibleCount
    };
  }, [filteredEntries]);

  // Handlers
  const handleToggleParentVisible = async (id: string) => {
    await homeworkService.toggleParentVisibility(id);
    const refreshed = await homeworkService.getEntries(selectedSection);
    setEntries(refreshed);
  };

  const handleUpdateScore = (studentId: string, value: string) => {
    const num = value === "" ? null : parseFloat(value);
    setEditScores(prev => ({ ...prev, [studentId]: num }));
  };

  const handleSaveScores = async () => {
    if (!selectedEntryId) return;
    await homeworkService.updateEntryScores(selectedEntryId, editScores);
    const refreshed = await homeworkService.getEntries(selectedSection);
    setEntries(refreshed);
    setSaveConfirm(true);
    setTimeout(() => setSaveConfirm(false), 2000);
  };

  const handleCreateEntry = async () => {
    const students = sectionStudents;
    const emptyScores: Record<string, number | null> = {};
    students.forEach(s => emptyScores[s.id] = null);

    const entryData: Omit<import('../services/homeworkService').DailyEntry, 'id'> = {
      ...newEntry,
      scores: emptyScores
    };

    const created = await homeworkService.createEntry(entryData);
    const refreshed = await homeworkService.getEntries(selectedSection);
    setEntries(refreshed);
    setSelectedEntryId(created.id);
    setIsModalOpen(false);
    // Reset form
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      type: "Homework",
      subject: "Mathematics",
      section: SECTIONS[0],
      title: "",
      description: "",
      maxScore: 10,
      parentVisible: true
    });
  };

  const handleBulkAction = (type: 'avg' | 'clear' | 'present') => {
    if (!selectedEntry) return;
    const students = sectionStudents;
    const newScores = { ...editScores };

    if (type === 'avg') {
      const currentScores = Object.values(editScores).filter(s => s !== null) as number[];
      const avg = currentScores.length > 0 ? Math.round(currentScores.reduce((a, b) => a + b, 0) / currentScores.length) : selectedEntry.maxScore;
      students.forEach(s => { if (newScores[s.id] === null) newScores[s.id] = avg; });
    } else if (type === 'clear') {
      students.forEach(s => newScores[s.id] = null);
    } else if (type === 'present') {
      students.forEach(s => { if (newScores[s.id] === null) newScores[s.id] = selectedEntry.maxScore; });
    }

    setEditScores(newScores);
  };

  const currentStudents = sectionStudents;

  return (
    <div className="flex-1 space-y-6">
      {/* TOP CONTROLS BAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a237e]/20"
          >
            {["All", "Homework", "Classwork"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1a237e] text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-blue-900 transition-colors shadow-sm"
          >
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      {/* IMPROVED DATE NAVIGATION UI */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Header row: Month & Year pagination, Week pills, and Today button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-slate-700 min-w-[100px] text-center capitalize">
              {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Week pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1 shrink-0">Weeks</span>
            {weeksInMonth.map((week, idx) => {
              const isActive = idx === selectedWeekIndex;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectWeek(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center justify-center border ${
                    isActive
                      ? 'bg-[#1a237e] border-[#1a237e] text-white shadow-sm shadow-blue-900/20'
                      : 'border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleToday}
            className="text-[10px] font-black uppercase tracking-widest text-[#1a237e] hover:bg-blue-50/50 border border-transparent hover:border-blue-100 rounded-lg px-3 py-2 text-center transition-all self-end sm:self-auto shrink-0"
          >
            Today
          </button>
        </div>

        {/* Day strip */}
        <div className="grid grid-cols-7 gap-2">
          {daysInWeek.map((date, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date("2025-06-02T00:00:00"));
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6

            const dayTypes = getEntryTypesForDay(date, allHomeworkEntries);

            return (
              <button
                key={idx}
                disabled={isWeekend}
                onClick={() => handleSelectDay(date)}
                className={`flex flex-col items-center p-3 rounded-xl transition-all relative select-none ${
                  isWeekend
                    ? 'bg-slate-50/40 opacity-40 cursor-not-allowed border border-transparent'
                    : isSelected
                    ? 'bg-[#1a237e] text-white scale-[1.03] shadow-md shadow-blue-900/30'
                    : 'bg-white border border-slate-100 text-slate-700 hover:border-[#1a237e]/40 hover:bg-blue-50/20 active:scale-98'
                }`}
              >
                {/* Weekday name short */}
                <span className={`text-[10px] font-black tracking-widest uppercase mb-1 ${
                  isSelected ? 'text-blue-200' : 'text-slate-400'
                }`}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>

                {/* Day of Month */}
                <span className={`text-sm font-bold tracking-tight ${
                  isSelected ? 'text-white' : 'text-slate-800'
                } ${isToday && !isSelected ? 'text-[#1a237e] underline decoration-2 underline-offset-4' : ''}`}>
                  {date.getDate()}
                </span>

                {/* Colored dots represent homework/classwork types */}
                <div className="flex gap-1 justify-center mt-2 h-1.5 w-full">
                  {!isWeekend && dayTypes.map((type, dIdx) => (
                    <div
                      key={dIdx}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: ENTRY_DOT_COLORS[type] || '#1a237e' }}
                      title={type}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black tracking-widest text-[#1a237e] uppercase mb-1">This Week's Entries</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-800">{metrics.entriesCount}</h3>
            <span className="text-[10px] text-slate-400 font-medium">homework + classwork</span>
          </div>
          <div className="mt-2 h-1 w-full bg-blue-50 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-full" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Avg Score</p>
          <div className="flex items-baseline gap-2">
            <h3 className={`text-2xl font-black ${
              metrics.avg >= 75 ? 'text-emerald-500' : metrics.avg >= 50 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {metrics.avg.toFixed(1)}%
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">class average</span>
          </div>
          <div className="mt-2 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
            <div className={`h-full ${
              metrics.avg >= 75 ? 'bg-emerald-500' : metrics.avg >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`} style={{ width: `${metrics.avg}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black tracking-widest text-amber-500 uppercase mb-1">Missing Scores</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-800">{metrics.missing}</h3>
            <span className="text-[10px] text-slate-400 font-medium">not yet graded</span>
          </div>
          <div className="mt-2 h-1 w-full bg-amber-50 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: metrics.missing > 0 ? '60%' : '0%' }} />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black tracking-widest text-emerald-500 uppercase mb-1">Parent Visible</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-800">{metrics.visible}</h3>
            <span className="text-[10px] text-slate-400 font-medium">shared with parents</span>
          </div>
          <div className="mt-2 h-1 w-full bg-emerald-50 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${(metrics.visible / (metrics.entriesCount || 1)) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="w-full">
        {/* LEFT: ENTRY LIST */}
        <div className="w-full space-y-8">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
              <BookOpen size={40} className="text-slate-300 mb-4" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">No entries for this day</p>
              <p className="text-xs text-slate-400 mt-1">Create one with the New Entry button above</p>
            </div>
          ) : (
            Object.entries(groupedEntries).map(([dateLabel, dayEntries]) => (
              <div key={dateLabel} className="space-y-4">
                <div className="flex items-center gap-3 sticky top-0 bg-slate-50/90 backdrop-blur-sm py-2 px-1 z-10">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#1a237e] font-bold">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', month: 'short', day: 'numeric' 
                    })} · {entriesForSelectedDay.length} {entriesForSelectedDay.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(dayEntries as DailyEntry[]).map(entry => {
                    const gradedCount = Object.values(entry.scores).filter(s => s !== null).length;
                    const totalCount = Object.keys(entry.scores).length;
                    const gradedPct = (gradedCount / totalCount) * 100;
                    
                    const totalScoreSum = Object.values(entry.scores).reduce((acc: number, s) => acc + (s || 0), 0);
                    const avg = gradedCount > 0 ? totalScoreSum / gradedCount : 0;
                    const avgPct = (avg / entry.maxScore) * 100;

                    return (
                      <motion.div 
                        key={entry.id}
                        layoutId={entry.id}
                        onClick={() => setSelectedEntryId(entry.id)}
                        className={`bg-white rounded-xl border-l-[3px] shadow-sm p-4 space-y-3 cursor-pointer group transition-all relative ${
                          selectedEntryId === entry.id ? 'ring-2 ring-[#1a237e]/20 border-slate-200' : 'border border-slate-100 hover:border-slate-200'
                        }`}
                        style={{ borderLeftColor: getSubjectColor(entry.subject) }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-100`} style={{ color: getSubjectColor(entry.subject) }}>
                              {entry.subject}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                              entry.type === 'Homework' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'
                            }`}>
                              {entry.type}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleParentVisible(entry.id);
                            }}
                            className={`p-1 transition-colors ${entry.parentVisible ? 'text-emerald-500' : 'text-slate-300'} hover:bg-slate-50 rounded`}
                            title={entry.parentVisible ? "Visible to parents" : "Hidden from parents"}
                          >
                            {entry.parentVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 tracking-tight">{entry.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-1">{entry.description}</p>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-300" />
                            <span>{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users size={12} className="text-slate-300" />
                            <span>{entry.section}</span>
                          </div>
                          <span className="text-slate-300 font-mono">/ {entry.maxScore}</span>
                        </div>

                        <div className="space-y-1.5 mt-2">
                          <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                            <span className="text-slate-400 font-black">Scores</span>
                            <span className="text-slate-500">{gradedCount} / {totalCount} graded</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${gradedPct}%` }}
                              className={`h-full rounded-full ${
                                avgPct >= 75 ? 'bg-emerald-500' : avgPct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-1">
                          <span className="text-xs font-bold text-slate-700">
                            Avg: <span className={avgPct >= 75 ? 'text-emerald-600' : avgPct >= 50 ? 'text-amber-600' : 'text-red-500'}>
                              {avg.toFixed(1)} / {entry.maxScore}
                            </span>
                          </span>
                          <button 
                            className="text-xs font-bold text-[#1a237e] border border-[#1a237e]/30 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors uppercase tracking-widest"
                          >
                            Enter Grades
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SIDE SHEET DRAWER FOR GRADE ENTRY */}
      <AnimatePresence>
        {selectedEntry && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEntryId(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80]"
            />

            {/* Slide-out side sheet panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:max-w-xl md:max-w-2xl bg-white shadow-2xl z-[90] flex flex-col h-full border-l border-slate-100"
            >
              {/* Detailed Grade Entry Panel */}
              <div className="h-full flex flex-col overflow-hidden">
                <div className="p-6 space-y-4 border-b border-slate-100 bg-slate-50/20 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-100`} style={{ color: getSubjectColor(selectedEntry.subject) }}>
                        {selectedEntry.subject}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        selectedEntry.type === 'Homework' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'
                      }`}>
                        {selectedEntry.type}
                      </span>
                    </div>
                    {/* Close Panel Button */}
                    <button
                      onClick={() => setSelectedEntryId(null)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="Close Panel"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">{selectedEntry.title}</h3>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      <span>{new Date(selectedEntry.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <span className="text-slate-200">·</span>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-slate-400" />
                      <span>{selectedEntry.section}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400">MAX</span>
                      <span className="font-bold text-slate-700">/ {selectedEntry.maxScore}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 mt-2 shadow-sm">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Parent visibility</p>
                      <p className={`text-[10px] font-bold ${selectedEntry.parentVisible ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {selectedEntry.parentVisible ? 'Currently visible to parents' : 'Hidden from parents'}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleToggleParentVisible(selectedEntry.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                        selectedEntry.parentVisible ? 'bg-[#1a237e]' : 'bg-slate-200'
                      }`}
                    >
                      <motion.div 
                        animate={{ x: selectedEntry.parentVisible ? 16 : 0 }}
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                  <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student Scores</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400">Sorted by Rank</span>
                      <ChevronDown size={12} className="text-slate-300" />
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 sticky top-[41px] z-10">
                      <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-3 font-black">Student</th>
                        <th className="px-2 py-3 font-black text-center">Score</th>
                        <th className="px-2 py-3 font-black text-center">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentStudents.map(student => {
                        const score = editScores[student.id];
                        const scorePct = score !== null ? (score / selectedEntry.maxScore) * 100 : null;
                        
                        let borderColor = 'border-slate-200';
                        if (score !== null) {
                          if (scorePct! >= 75) borderColor = 'border-emerald-300';
                          else if (scorePct! >= 50) borderColor = 'border-amber-300';
                          else borderColor = 'border-red-300';
                        }

                        return (
                          <tr key={student.id} className="group hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
                                  (student.avatar ?? '').length > 1 ? 'bg-[#1a237e]/10 text-[#1a237e]' : 'bg-slate-100 text-slate-400'
                                }}`}>
                                  {student.avatar ?? ''}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-700 truncate leading-tight">{student.name}</p>
                                  <p className="text-[10px] font-mono text-slate-400">{student.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <input 
                                  type="number"
                                  min="0"
                                  max={selectedEntry.maxScore}
                                  value={score === null || score === undefined ? "" : score}
                                  onChange={(e) => handleUpdateScore(student.id, e.target.value)}
                                  placeholder="—"
                                  className={`w-12 h-9 text-center border-2 rounded-xl text-sm font-bold text-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#1a237e] ${borderColor}`}
                                />
                                <span className="text-[10px] font-bold text-slate-300">/ {selectedEntry.maxScore}</span>
                              </div>
                            </td>
                            <td className="px-2 py-4">
                              <div className="flex justify-center">
                                {scorePct !== null ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                                    scorePct >= 90 ? 'bg-emerald-100 text-emerald-700' :
                                    scorePct >= 75 ? 'bg-blue-100 text-blue-700' :
                                    scorePct >= 50 ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {scorePct >= 90 ? 'A' : scorePct >= 75 ? 'B' : scorePct >= 50 ? 'C' : 'F'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-300 text-[10px] font-black uppercase tracking-widest">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 sm:px-6 sm:py-4 space-y-3 border-t border-slate-100 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)] shrink-0">
                  <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
                    <button 
                      onClick={() => handleBulkAction('clear')}
                      className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-2.5 sm:py-1.5 rounded-xl transition-all text-center"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-0">
                    <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-4 sm:gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Class Avg</span>
                        <span className="text-sm font-black text-slate-800">
                          {(() => {
                            const scores = Object.values(editScores).filter(s => s !== null) as number[];
                            if (scores.length === 0) return '—';
                            return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                          })()}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {Object.values(editScores).filter(s => s !== null).length} graded · {Object.values(editScores).filter(s => s === null).length} missing
                      </span>
                    </div>
                    
                    <div className="relative">
                      <button 
                        onClick={handleSaveScores}
                        className="w-full sm:w-auto bg-[#1a237e] text-white rounded-xl px-6 py-3 sm:py-2.5 text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-900 active:scale-95 transition-all"
                      >
                        Save Scores
                      </button>
                      <AnimatePresence>
                        {saveConfirm && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.5, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: -45 }}
                            exit={{ opacity: 0, scale: 0.5, y: -10 }}
                            className="absolute left-1/2 -translate-x-1/2 p-2 px-4 bg-emerald-600 text-white rounded-full text-xs font-black flex items-center gap-2 whitespace-nowrap shadow-xl z-30"
                          >
                            Saved <CheckCircle size={14} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* NEW ENTRY MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 md:p-10 flex flex-col gap-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">New Activity</h2>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">Homework or Classwork Entry</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {/* Type Selection */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Type</p>
                  <div className="p-1 bg-slate-100 rounded-2xl flex gap-1 border border-slate-200">
                    {["Homework", "Classwork"].map(t => (
                      <button
                        key={t}
                        onClick={() => setNewEntry(prev => ({ ...prev, type: t as any }))}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          newEntry.type === t ? 'bg-[#1a237e] text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                    <input 
                      type="date"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section</p>
                    <select 
                      value={newEntry.section}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, section: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/10"
                    >
                      {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</p>
                  <select 
                    value={newEntry.subject}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/10"
                  >
                    {["Mathematics", "Physics", "English", "Biology", "History", "Chemistry"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</p>
                  <input 
                    type="text"
                    placeholder="e.g. Linear Equations Practice"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/10"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</p>
                  <textarea 
                    rows={2}
                    placeholder="Brief description of the activity..."
                    value={newEntry.description}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/10 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1a237e] shadow-sm">
                      <Eye size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Visible to parents</p>
                      <p className="text-[10px] text-slate-400 font-medium">Shared in the parent mobile app</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setNewEntry(prev => ({ ...prev, parentVisible: !prev.parentVisible }))}
                    className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${
                      newEntry.parentVisible ? 'bg-[#1a237e]' : 'bg-slate-200'
                    }`}
                  >
                    <motion.div 
                      animate={{ x: newEntry.parentVisible ? 20 : 0 }}
                      className="w-5 h-5 bg-white rounded-full shadow-md"
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 border-2 border-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateEntry}
                  disabled={!newEntry.title}
                  className="flex-1 py-4 bg-[#1a237e] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/30 hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  Create Activity
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default React.memo(HomeworksModule);
