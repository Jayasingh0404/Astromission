import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CommanderAIPanel } from './components/CommanderAIPanel';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { MissionSelectionPage } from './pages/MissionSelectionPage';
import { MissionBriefingPage } from './pages/MissionBriefingPage';
import { MissionControlPage } from './pages/MissionControlPage';
import { LearningCenterPage } from './pages/LearningCenterPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ClassroomPage } from './pages/ClassroomPage';
import { AdminPage } from './pages/AdminPage';
import { useMissionStore } from './store/useMissionStore';
import { X } from 'lucide-react';

export const App: React.FC = () => {
  const {
    initializeAuth,
    loadCatalogs,
    commanderOpen,
    setCommanderOpen,
    activeSession,
    selectedPlanet,
    toastMessage,
    clearToast,
  } = useMissionStore();

  useEffect(() => {
    initializeAuth();
    loadCatalogs();
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen flex flex-col bg-space-950 text-slate-100">
        <Navbar />

        {/* Global Toast Notification Banner */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl p-4 shadow-2xl border backdrop-blur-xl flex items-start justify-between gap-3 bg-space-900/95 border-cyan-400 text-white">
            <div className="space-y-0.5">
              <div className="font-bold text-xs text-cyan-300">{toastMessage.title}</div>
              <div className="text-xs text-slate-200">{toastMessage.message}</div>
            </div>
            <button
              type="button"
              onClick={clearToast}
              className="text-slate-400 hover:text-white"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Collapsible Commander AI Drawer */}
        <CommanderAIPanel
          isOpen={commanderOpen}
          onClose={() => setCommanderOpen(false)}
          sessionId={activeSession?.id}
          planet={activeSession?.planet || selectedPlanet}
        />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/missions" element={<MissionSelectionPage />} />
            <Route path="/briefing" element={<MissionBriefingPage />} />
            <Route path="/mission-control/:sessionId" element={<MissionControlPage />} />
            <Route path="/learning" element={<LearningCenterPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/classrooms" element={<ClassroomPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;

