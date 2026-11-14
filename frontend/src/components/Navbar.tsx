import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Rocket,
  Compass,
  BookOpen,
  BarChart3,
  User as UserIcon,
  GraduationCap,
  ShieldCheck,
  LogOut,
  Bot,
} from 'lucide-react';
import { useMissionStore } from '../store/useMissionStore';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, activeSession, setCommanderOpen, commanderOpen } = useMissionStore();

  const handleLogout = () => {
    api.logout();
    setUser(null);
    navigate('/');
  };

  const navItems = [
    { path: '/missions', label: 'Missions', icon: Compass },
    ...(activeSession ? [{ path: `/mission-control/${activeSession.id}`, label: 'Mission Control', icon: Rocket }] : []),
    { path: '/learning', label: 'Learning Center', icon: BookOpen },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/classrooms', label: 'Classroom', icon: GraduationCap },
    { path: '/profile', label: 'Profile', icon: UserIcon },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-space-950/90 backdrop-blur-md border-b border-cyan-500/20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Rocket className="w-5 h-5 text-space-950 transform group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-base text-white block leading-none">
              ASTROMISSION
            </span>
            <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">
              NASA Space Apps 2026
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-space-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: AI Commander & Auth */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCommanderOpen(!commanderOpen)}
            className="px-3 py-1.5 rounded-lg bg-violet-600/25 hover:bg-violet-600/40 border border-violet-400/40 text-violet-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Commander AI</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="px-2.5 py-1.5 rounded-lg bg-space-800 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 hover:border-cyan-500/40"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="max-w-[110px] truncate font-medium">{user.display_name}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  {user.is_guest ? 'Guest' : user.role}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg bg-space-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth"
                className="px-3 py-1.5 rounded-lg bg-space-800 hover:bg-space-700 text-slate-200 text-xs font-medium border border-slate-700"
              >
                Sign In
              </Link>
              <Link
                to="/missions"
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold text-xs shadow-md shadow-cyan-500/20"
              >
                Launch Mission
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Row */}
      <div className="flex md:hidden overflow-x-auto px-3 py-1.5 gap-1 border-t border-slate-800/80 bg-space-950">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 whitespace-nowrap ${
                active ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              <Icon className="w-3 h-3" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
};

