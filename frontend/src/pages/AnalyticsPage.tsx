import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart3, Rocket, Award, Activity, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { useMissionStore } from '../store/useMissionStore';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { ensureAuthenticatedOrGuest } = useMissionStore();
  const [overview, setOverview] = useState<any>(null);
  const [missionsList, setMissionsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await ensureAuthenticatedOrGuest();
        const [ov, mList] = await Promise.all([
          api.getAnalyticsOverview(),
          api.getAnalyticsMissions(),
        ]);
        setOverview(ov);
        setMissionsList(mList);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const historyData = overview?.resource_history || [];
  const scoreBreakdownData = overview?.score_breakdown || [];

  return (
    <div className="min-h-screen cosmic-bg py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Real Mission Snapshot Telemetry (Recharts)
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1">
              Mission Performance & Telemetry Analytics
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Inspect authentic time-series resource snapshots, crew condition trends, and weighted scoring breakdowns.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/missions')}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold text-xs flex items-center gap-1.5"
          >
            <Rocket className="w-4 h-4" /> Launch New Mission
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Missions Attempted', value: overview?.missions_attempted ?? 0, color: 'text-cyan-400' },
            { label: 'Missions Completed', value: overview?.missions_completed ?? 0, color: 'text-emerald-400' },
            { label: 'Success Rate', value: `${overview?.success_rate ?? 0}%`, color: 'text-sky-400' },
            { label: 'Average Score', value: overview?.average_score ?? 0, color: 'text-violet-400' },
            { label: 'Quizzes & Badges', value: `${overview?.quizzes_completed ?? 0} / ${overview?.achievements_unlocked ?? 0}`, color: 'text-amber-400' },
          ].map((kpi, idx) => (
            <div key={idx} className="glass-panel rounded-xl p-4 text-center">
              <div className={`text-2xl font-extrabold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-slate-400 mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        {historyData.length === 0 && !loading ? (
          <div className="glass-panel rounded-2xl p-8 text-center space-y-3">
            <BarChart3 className="w-10 h-10 text-cyan-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">No Mission Telemetry Snapshots Yet</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              ASTROMISSION never invents fake chart data. Launch a Moon or Mars mission and advance at least one day to
              populate live time-series telemetry charts!
            </p>
            <button
              type="button"
              onClick={() => navigate('/briefing')}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 text-space-950 font-bold text-xs"
            >
              Launch Mission Now
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Chart 1: Oxygen, Water, Food & Energy Over Time */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> Core Life-Support & Power Reserves Over Time
                </h2>
                <span className="text-[11px] font-mono text-slate-400">{overview?.latest_mission_name}</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#080D1E', borderColor: '#22d3ee', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="oxygen" name="Oxygen (kg)" stroke="#22d3ee" strokeWidth={2} />
                    <Line type="monotone" dataKey="water" name="Water (L)" stroke="#38bdf8" strokeWidth={2} />
                    <Line type="monotone" dataKey="food" name="Food (kg)" stroke="#4ade80" strokeWidth={2} />
                    <Line type="monotone" dataKey="energy" name="Energy (kWh)" stroke="#fbbf24" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Crew Health, Shielding & Infrastructure Stability */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-violet-400" /> Crew Health, Shielding & Base Condition (%)
                </h2>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#080D1E', borderColor: '#a78bfa', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="crew_health" name="Crew Health (%)" stroke="#f43f5e" strokeWidth={2} />
                    <Line
                      type="monotone"
                      dataKey="radiation_shielding"
                      name="Radiation Shielding (%)"
                      stroke="#a78bfa"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="infrastructure_condition"
                      name="Infrastructure (%)"
                      stroke="#34d399"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Weighted Score Breakdown */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 lg:col-span-2">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Weighted Engineering Score Breakdown (0–100 per Category)
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#080D1E', borderColor: '#22d3ee', fontSize: '12px' }}
                    />
                    <Bar dataKey="score" name="Category Score (/100)" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Mission History Table */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-base text-white">Complete Mission Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase">
                  <th className="py-2.5 px-3">Mission</th>
                  <th className="py-2.5 px-3">Planet</th>
                  <th className="py-2.5 px-3">Difficulty</th>
                  <th className="py-2.5 px-3">Progress</th>
                  <th className="py-2.5 px-3">Crew Health</th>
                  <th className="py-2.5 px-3">Science Pts</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {missionsList.map((m) => (
                  <tr key={m.id} className="hover:bg-space-900/60">
                    <td className="py-2.5 px-3 font-semibold text-white">{m.mission_name}</td>
                    <td className="py-2.5 px-3 uppercase font-mono text-cyan-300">{m.planet}</td>
                    <td className="py-2.5 px-3 capitalize">{m.difficulty}</td>
                    <td className="py-2.5 px-3 font-mono">
                      Day {m.current_day}/{m.target_duration_days}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">{m.crew_health}%</td>
                    <td className="py-2.5 px-3 font-mono text-violet-300">{m.science_points}</td>
                    <td className="py-2.5 px-3 uppercase font-mono">{m.status}</td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/mission-control/${m.id}`)}
                        className="px-2.5 py-1 rounded bg-cyan-500 text-space-950 font-bold"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

