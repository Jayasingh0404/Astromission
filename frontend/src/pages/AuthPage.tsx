import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, UserCheck, KeyRound, Sparkles, GraduationCap, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useMissionStore } from '../store/useMissionStore';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, showToast } = useMissionStore();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        const res = await api.login(email || username, password);
        setUser(res.user);
        showToast('Welcome Back, Commander!', `Signed in as ${res.user.display_name}`, 'success');
        navigate('/missions');
      } else if (mode === 'register') {
        const res = await api.register({
          username,
          email,
          password,
          role,
          display_name: displayName || username,
        });
        setUser(res.user);
        showToast('Profile Created!', `Welcome aboard ASTROMISSION, ${res.user.display_name}`, 'success');
        navigate('/missions');
      } else {
        const res = await api.forgotPassword(email, password);
        showToast('Password Reset', res.message, 'info');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLaunch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.guestLogin();
      setUser(res.user);
      showToast('Guest Commander Active', 'You can play full Moon and Mars missions immediately!', 'info');
      navigate('/missions');
    } catch (err: any) {
      setError(err.message || 'Could not initialize guest session.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoQuickLogin = async (demoEmail: string, demoPass: string, dest: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(demoEmail, demoPass);
      setUser(res.user);
      showToast('Demo Role Activated', `Logged in as ${res.user.display_name} (${res.user.role})`, 'success');
      navigate(dest);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] cosmic-bg py-12 px-4 flex items-center justify-center">
      <div className="max-w-4xl w-full grid md:grid-cols-12 gap-8 items-start">
        {/* Left Form Card */}
        <div className="md:col-span-7 glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {mode === 'login'
                  ? 'Mission Commander Sign In'
                  : mode === 'register'
                  ? 'Create Astronaut Profile'
                  : 'Reset Commander Password'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Save your missions, achievements, and classroom progress.
              </p>
            </div>
            <Rocket className="w-7 h-7 text-cyan-400" />
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-space-950 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-lg transition-colors ${
                mode === 'login' ? 'bg-cyan-500 text-space-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 rounded-lg transition-colors ${
                mode === 'register' ? 'bg-cyan-500 text-space-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => setMode('reset')}
              className={`py-2 rounded-lg transition-colors ${
                mode === 'reset' ? 'bg-cyan-500 text-space-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Reset Password
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="cadet_nova"
                      className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Commander Nova"
                      className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Account Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                        role === 'student'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-space-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" /> Student / Player
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                        role === 'teacher'
                          ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                          : 'bg-space-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" /> Teacher / Educator
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {mode === 'login' ? 'Email or Username' : 'Email Address'}
              </label>
              <input
                type={mode === 'login' ? 'text' : 'email'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@astromission.edu"
                className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {mode === 'reset' ? 'New Password' : 'Password'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 font-extrabold text-sm transition-colors"
            >
              {loading
                ? 'Authenticating...'
                : mode === 'login'
                ? 'Sign In to Mission Control'
                : mode === 'register'
                ? 'Create Account & Launch'
                : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Right Quick-Access Guest & Demo Role Switcher */}
        <div className="md:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-6 space-y-3 border-cyan-400/40">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <Sparkles className="w-4 h-4" /> Instant Guest Commander Mode
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Want to jump straight into a Moon or Mars simulation without registering? Launch a temporary Guest
              Commander session with full access to 3D base construction and Commander AI.
            </p>
            <button
              type="button"
              onClick={handleGuestLaunch}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-space-950 font-extrabold text-xs shadow-md"
            >
              Continue as Guest Commander
            </button>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-violet-300 font-bold text-sm">
              <KeyRound className="w-4 h-4" /> 1-Click Demo Role Evaluation
            </div>
            <p className="text-xs text-slate-400">
              Pre-seeded accounts for judges and educators to test Student, Teacher (Classroom{' '}
              <code className="text-cyan-300">ASTRO2026</code>), and Administrator experiences:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoQuickLogin('student@astromission.edu', 'StudentPassword123!', '/missions')}
                className="w-full p-2.5 rounded-xl bg-space-950 hover:bg-space-800 border border-slate-700 text-left flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">Cadet Aria Vance (Student)</div>
                  <div className="text-[11px] text-slate-400">student@astromission.edu</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">STUDENT</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoQuickLogin('teacher@astromission.edu', 'TeacherPassword123!', '/classrooms')}
                className="w-full p-2.5 rounded-xl bg-space-950 hover:bg-space-800 border border-slate-700 text-left flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">Dr. Elena Sagan (Educator)</div>
                  <div className="text-[11px] text-slate-400">teacher@astromission.edu</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono text-[10px]">TEACHER</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoQuickLogin('admin@astromission.edu', 'AdminPassword123!', '/admin')}
                className="w-full p-2.5 rounded-xl bg-space-950 hover:bg-space-800 border border-slate-700 text-left flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">Flight Director Kranz (Admin)</div>
                  <div className="text-[11px] text-slate-400">admin@astromission.edu</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> ADMIN
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

