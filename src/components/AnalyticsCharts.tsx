"use client";
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import type { StudentAnalytics } from '../services/analyticsService';

// --- Shared Types & Data ---
export interface Student {
  id: string;
  name: string;
  avatar: string;
  overallAvg: number;
  trend: number[];
  subjects: Record<string, number>;
  attendance: number;
  parentEngagement: number;
  submissions: {
    submitted: number;
    late: number;
    missing: number;
  };
  recentGrades: number[];
  risk: string;
}

// --- Helpers ---
const getGradeBand = (score: number) => {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 50) return 'C';
  return 'F';
};

const getBandColor = (band: string) => {
  switch (band) {
    case 'A': return 'emerald';
    case 'B': return 'blue';
    case 'C': return 'amber';
    default: return 'red';
  }
};

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-100 text-blue-600',
    'bg-emerald-100 text-emerald-600',
    'bg-amber-100 text-amber-600',
    'bg-red-100 text-red-600',
    'bg-indigo-100 text-indigo-600',
    'bg-purple-100 text-purple-600'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const LegendDot = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${
      color === 'emerald' ? 'bg-emerald-500' :
      color === 'blue' ? 'bg-blue-500' :
      color === 'amber' ? 'bg-amber-500' :
      'bg-red-500'
    }`} />
    <span className="text-[10px] font-bold text-slate-500">{label}</span>
  </div>
);

const EngagementRow = ({ color, label, count, pct }: { color: string, label: string, count: number, pct: number }) => (
  <div className="flex items-center justify-between text-[11px] font-medium">
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        color === 'emerald' ? 'bg-emerald-500' :
        color === 'amber' ? 'bg-amber-500' :
        'bg-red-500'
      }`} />
      <span className="text-slate-600">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-slate-900 font-bold">{count}</span>
      <span className="text-slate-400">{pct.toFixed(0)}%</span>
    </div>
  </div>
);

export const PerformanceDistribution = ({ students = [] }: { students?: StudentAnalytics[] }) => {
  const distribution = useMemo(() => {
    const bands: Record<string, number> = { A: 0, B: 0, C: 0, F: 0 };
    const avatarMap: Record<string, string[]> = { A: [], B: [], C: [], F: [] };
    
    students.forEach(s => {
      const band = getGradeBand(s.overallAvg);
      bands[band]++;
      avatarMap[band].push(s.avatar);
    });

    const maxCount = Math.max(...Object.values(bands) as number[]);
    return { bands, avatarMap, maxCount };
  }, [students]);

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm h-full">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Performance Distribution</p>
      <div className="space-y-6">
        {(['A', 'B', 'C', 'F'] as const).map(band => {
          const count = distribution.bands[band];
          const width = (count / (distribution.maxCount || 1)) * 100;
          const color = getBandColor(band);
          
          return (
            <div key={band} className="flex items-center gap-4">
              <div className="w-24 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                  band === 'A' ? 'bg-emerald-100 text-emerald-600' :
                  band === 'B' ? 'bg-blue-100 text-blue-600' :
                  band === 'C' ? 'bg-amber-100 text-amber-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {band === 'A' ? 'Excellent' : 
                   band === 'B' ? 'Good' : 
                   band === 'C' ? 'Developing' : 'At Risk'}
                </span>
                <span className="text-xs font-bold text-slate-700">{count}</span>
              </div>
              <div className="flex-1 h-2.5 bg-slate-50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  className={`h-full rounded-full ${
                    color === 'emerald' ? 'bg-emerald-500' :
                    color === 'blue' ? 'bg-blue-500' :
                    color === 'amber' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                />
              </div>
              <div className="flex -space-x-2">
                {distribution.avatarMap[band].slice(0, 4).map((initials, idx) => (
                  <div key={idx} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold ${getAvatarColor(initials)}`}>
                    {initials}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export const ParentEngagementChart = ({ students = [] }: { students?: StudentAnalytics[] }) => {
  const engagementData = useMemo(() => {
    const high = students.filter(s => s.parentEngagement >= 70).length;
    const mod = students.filter(s => s.parentEngagement >= 40 && s.parentEngagement < 70).length;
    const low = students.filter(s => s.parentEngagement < 40).length;
    const total = students.length;

    const highPct = (high / total) * 100;
    const modPct = (mod / total) * 100;

    return { high, mod, low, highPct, modPct, total };
  }, [students]);

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm h-full">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Parent Engagement</p>
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10">
        <div 
          className="w-32 h-32 lg:w-40 lg:h-40 rounded-full flex items-center justify-center relative shrink-0"
          style={{
            background: `conic-gradient(
              #10b981 0% ${engagementData.highPct}%,
              #f59e0b ${engagementData.highPct}% ${engagementData.highPct + engagementData.modPct}%,
              #ef4444 ${engagementData.highPct + engagementData.modPct}% 100%
            )`
          }}
        >
          <div className="w-[85px] h-[85px] lg:w-[110px] lg:h-[110px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
            <span className="text-xl lg:text-2xl font-black text-slate-800">{engagementData.total}</span>
            <span className="text-[7px] lg:text-[8px] font-bold text-slate-400 uppercase tracking-widest">students</span>
          </div>
        </div>
        <div className="w-full max-w-[220px] space-y-3">
          <EngagementRow color="emerald" label="Highly Engaged" count={engagementData.high} pct={engagementData.highPct} />
          <EngagementRow color="amber" label="Moderately Engaged" count={engagementData.mod} pct={engagementData.modPct} />
          <EngagementRow color="red" label="Low Engagement" count={engagementData.low} pct={100 - (engagementData.highPct + engagementData.modPct)} />
        </div>
      </div>
    </div>
  );
};
