import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Award,
  Rocket,
  CheckCircle2,
  Flame,
  Sparkles,
  Save,
  Play,
} from 'lucide-react';
import { api } from '../services/api';
import { useMissionStore } from '../store/useMissionStore';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, ensureAuthenticatedOrGuest, showToast } = useMissionStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarId, setAvatarId] = useState('commander-luna');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    await ensureAuthenticatedOrGuest();
    const data = await api.getProfile();
    setProfileData(data);
    if (data.user) {
      setDisplayName(data.user.display_name || '');
      setBio(data.user.bio || '');
      setAvatarId(data.user.avatar_id || 'commander-luna');
      setLanguage(data.user.preferred_language || 'en');
    }
  };

  useEffect(() => {
    loadProfile().catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedUser = await api.updateProfile({
        display_name: displayName,
        bio,
        avatar_id: avatarId,
        preferred_language: language,
      });
      setUser(updatedUser);
      showToast('Profile Saved', 'Your commander profile has been updated.', 'success');
      await loadProfile();
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not update profile.', 'critical');
    } finally {
      setSaving(false);
    }
  };

  const u = profileData?.user || user;
  const achievements = profileData?.achievements || [];
  const recentSessions = profileData?.recent_sessions || [];
  const successRate =
    u && u.missions_attempted > 0
      ? Math.round((u.missions_completed / u.missions_attempted) * 100)
      : 0;

  const avatars = [
    { id: 'commander-luna', label: 'Lunar Commander' },
    { id: 'commander-ares', label: 'Mars Pioneer' },
    { id: 'eclss-specialist', label: 'ECLSS Engineer' },
    { id: 'flight-director', label: 'Flight Director' },
  ];

  return (
    <div className="min-h-screen cosmic-bg py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Commander Header */}
        <div className="glass-panel rounded-2xl p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-space-950 font-extrabold text-2xl shadow-lg">
              {(u?.display_name || 'C')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{u?.display_name || 'Commander'}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-mono uppercase">
                  Level {u?.level || 1} • {u?.is_guest ? 'Guest' : u?.role}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">{u?.bio}</p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">@{u?.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-space-950 border border-slate-800 text-center">
              <div className="text-lg font-extrabold text-cyan-400">{u?.missions_attempted || 0}</div>
              <div className="text-[11px] text-slate-400">Missions Attempted</div>
            </div>
            <div className="p-3 rounded-xl bg-space-950 border border-slate-800 text-center">
              <div className="text-lg font-extrabold text-emerald-400">{u?.missions_completed || 0}</div>
              <div className="text-[11px] text-slate-400">Completed ({successRate}%)</div>
            </div>
            <div className="p-3 rounded-xl bg-space-950 border border-slate-800 text-center">
              <div className="text-lg font-extrabold text-violet-400">{u?.xp_points || 0} XP</div>
              <div className="text-[11px] text-slate-400">Experience Points</div>
            </div>
            <div className="p-3 rounded-xl bg-space-950 border border-slate-800 text-center">
              <div className="text-lg font-extrabold text-amber-400 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4" /> {u?.mission_streak || 0}
              </div>
              <div className="text-[11px] text-slate-400">Learning Pts: {u?.learning_points || 0}</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column: Edit Profile & Skill Progress */}
          <div className="lg:col-span-5 space-y-6">
            <form onSubmit={handleSaveProfile} className="glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-cyan-400" /> Update Commander Profile
              </h2>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Avatar Badge</label>
                <div className="grid grid-cols-2 gap-2">
                  {avatars.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setAvatarId(av.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium text-left ${
                        avatarId === av.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-space-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {av.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Commander Bio</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Preferred Learning Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
                  className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                >
                  <option value="en">English (Default)</option>
                  <option value="hi">Hindi (हिन्दी — Bilingual Support)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold text-xs flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>

            {/* Engineering Skill Progress */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" /> Aerospace Engineering Skills
              </h2>
              <div className="space-y-3">
                {Object.entries(
                  u?.skill_progress || {
                    'Life Support (ECLSS)': 70,
                    'Power Grid Engineering': 75,
                    'Radiation Protection': 65,
                    'Space Agriculture': 60,
                    'Emergency Triage': 70,
                  }
                ).map(([skill, val]) => (
                  <div key={skill} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-200 font-medium">{skill}</span>
                      <span className="font-mono text-cyan-300">{Number(val)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-space-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full"
                        style={{ width: `${Math.min(100, Number(val))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Achievements & Recent Mission History */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" /> Achievement Badges ({achievements.filter((a: any) => a.unlocked).length}/{achievements.length})
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {achievements.map((ach: any) => (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      ach.unlocked
                        ? 'bg-cyan-500/15 border-cyan-400/50 text-white'
                        : 'bg-space-950/60 border-slate-800/80 text-slate-400 opacity-75'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        ach.unlocked ? 'bg-amber-400 text-space-950' : 'bg-space-800 text-slate-500'
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white truncate">{ach.title}</span>
                        <span className="text-[10px] font-mono text-cyan-300">+{ach.xp_reward} XP</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">{ach.description}</p>
                      {ach.unlocked && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Unlocked
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Missions */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-cyan-400" /> Recent Mission Activity
                </h2>
                <Link to="/missions" className="text-xs text-cyan-400 hover:underline">
                  + Launch New Mission
                </Link>
              </div>

              {recentSessions.length === 0 ? (
                <div className="p-6 rounded-xl bg-space-950/70 border border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-400">No missions launched yet.</p>
                  <Link
                    to="/missions"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 text-space-950 font-bold text-xs"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Your First Mission
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentSessions.map((sess: any) => (
                    <div
                      key={sess.id}
                      className="p-3.5 rounded-xl bg-space-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-sm text-white">{sess.mission_name}</div>
                        <div className="text-xs text-slate-400">
                          Planet: <span className="uppercase text-cyan-300 font-mono">{sess.planet}</span> • Difficulty:{' '}
                          <span className="capitalize">{sess.difficulty}</span> • Day {sess.current_day}/{sess.target_duration_days}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {sess.total_score !== null && (
                          <span className="px-2.5 py-1 rounded bg-violet-500/20 text-violet-300 font-mono text-xs font-bold">
                            Score: {sess.total_score}
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-mono uppercase ${
                            sess.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : sess.status === 'failed'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-cyan-500/20 text-cyan-300'
                          }`}
                        >
                          {sess.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/mission-control/${sess.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold text-xs"
                        >
                          {sess.status === 'active' ? 'Resume' : 'Inspect'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

