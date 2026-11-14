import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Globe, Activity, FileText, KeyRound } from 'lucide-react';
import { api } from '../services/api';
import { useMissionStore } from '../store/useMissionStore';
import { User } from '../types/astromission';

export const AdminPage: React.FC = () => {
  const { user, setUser, showToast } = useMissionStore();
  const [health, setHealth] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadAdminData = async () => {
    try {
      const [h, u, s, logs] = await Promise.all([
        api.getAdminHealth(),
        api.getAdminUsers(),
        api.getAdminScenarios(),
        api.getAdminAuditLogs(),
      ]);
      setHealth(h);
      setUsersList(u);
      setScenarios(s);
      setAuditLogs(logs);
    } catch {
      // handled by role check
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    }
  }, [user?.role]);

  const handleSwitchToDemoAdmin = async () => {
    try {
      const res = await api.login('admin@astromission.edu', 'AdminPassword123!');
      setUser(res.user);
      showToast('Admin Console Unlocked', 'Signed in as Flight Director Kranz', 'success');
    } catch (err: any) {
      showToast('Admin Login Error', err.message, 'critical');
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    try {
      await api.updateAdminUserRole(targetUserId, newRole);
      showToast('Role Updated', `User role changed to ${newRole} (Audit logged).`, 'success');
      await loadAdminData();
    } catch (err: any) {
      showToast('Error', err.message, 'critical');
    }
  };

  const handleUpdateScenarioDuration = async (scenarioId: string, days: number) => {
    try {
      await api.updateAdminScenario(scenarioId, { default_duration_days: days });
      showToast('Scenario Updated', `Default mission duration updated to ${days} days.`, 'success');
      await loadAdminData();
    } catch (err: any) {
      showToast('Error', err.message, 'critical');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[calc(100vh-4rem)] cosmic-bg flex items-center justify-center p-6">
        <div className="glass-panel rounded-2xl max-w-md w-full p-8 text-center space-y-4">
          <ShieldCheck className="w-12 h-12 text-cyan-400 mx-auto" />
          <h1 className="text-xl font-bold text-white">Administrator Authorization Required</h1>
          <p className="text-xs text-slate-300">
            This console is restricted to authorized ASTROMISSION administrators. For Space Apps evaluation, you can
            switch to the pre-seeded Flight Director Admin account in one click:
          </p>
          <button
            type="button"
            onClick={handleSwitchToDemoAdmin}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 font-extrabold text-xs flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" /> Sign In as Demo Administrator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cosmic-bg py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            Role-Based Access Control • System Operations
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-1 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400" /> ASTROMISSION Administrator Dashboard
          </h1>
        </div>

        {/* Health Status Metrics */}
        {health && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {Object.entries(health.counts || {}).map(([k, v]: [string, any]) => (
              <div key={k} className="glass-panel rounded-xl p-3 text-center">
                <div className="text-xl font-extrabold text-cyan-400">{v}</div>
                <div className="text-[10px] font-mono uppercase text-slate-400 mt-0.5">
                  {k.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          {/* User & Role Management */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" /> User & Role Management
            </h2>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase">
                    <th className="py-2 px-2">User</th>
                    <th className="py-2 px-2">Email</th>
                    <th className="py-2 px-2">Role</th>
                    <th className="py-2 px-2">Change Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 px-2 font-semibold text-white">{u.display_name}</td>
                      <td className="py-2 px-2 text-slate-400 font-mono">{u.email}</td>
                      <td className="py-2 px-2 font-mono uppercase text-cyan-300">{u.role}</td>
                      <td className="py-2 px-2">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-space-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        >
                          <option value="student">student</option>
                          <option value="teacher">teacher</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scenario Configuration */}
          <div className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-violet-400" /> Mission Scenario Configuration
            </h2>
            <div className="space-y-3">
              {scenarios.map((sc) => (
                <div key={sc.id} className="p-4 rounded-xl bg-space-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{sc.name}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] uppercase">
                      {sc.planet}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{sc.tagline}</p>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-300">Default Duration: {sc.default_duration_days} Days</span>
                    <div className="flex gap-1.5">
                      {[10, 15, 20].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleUpdateScenarioDuration(sc.id, d)}
                          className={`px-2 py-1 rounded font-mono text-[11px] ${
                            sc.default_duration_days === d
                              ? 'bg-cyan-500 text-space-950 font-bold'
                              : 'bg-space-800 text-slate-300'
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Audit Logs */}
        <div className="glass-panel rounded-2xl p-6 space-y-3">
          <h2 className="font-bold text-base text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" /> Administrative Audit Log
          </h2>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400">
              No administrative configuration changes logged yet. Try updating a scenario duration or user role above.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg bg-space-950 border border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="text-cyan-400 font-bold">{log.action}</span> on{' '}
                    <span className="text-white">
                      {log.resource_type}:{log.resource_id}
                    </span>{' '}
                    — {JSON.stringify(log.details)}
                  </div>
                  <span className="text-slate-500 text-[11px]">{log.created_at}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

