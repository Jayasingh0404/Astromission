import { create } from 'zustand';
import {
  User,
  MissionScenario,
  FacilityCatalogItem,
  MissionSession,
  SessionFacility,
} from '../types/astromission';
import { api } from '../services/api';

interface MissionStoreState {
  user: User | null;
  authLoading: boolean;
  missions: MissionScenario[];
  facilitiesCatalog: FacilityCatalogItem[];
  selectedPlanet: 'moon' | 'mars';
  selectedDifficulty: 'beginner' | 'intermediate' | 'expert';
  activeSession: MissionSession | null;
  selectedFacilityId: string | null;
  placementFacilityType: string | null;
  viewMode: '3d' | '2d';
  commanderOpen: boolean;
  lastDayReport: any | null;
  toastMessage: { title: string; message: string; level: 'info' | 'warning' | 'critical' | 'success' } | null;

  initializeAuth: () => Promise<void>;
  ensureAuthenticatedOrGuest: () => Promise<User>;
  setUser: (user: User | null) => void;
  setSelectedPlanet: (planet: 'moon' | 'mars') => void;
  setSelectedDifficulty: (diff: 'beginner' | 'intermediate' | 'expert') => void;
  setActiveSession: (session: MissionSession | null) => void;
  setSelectedFacilityId: (id: string | null) => void;
  setPlacementFacilityType: (fType: string | null) => void;
  setViewMode: (mode: '3d' | '2d') => void;
  setCommanderOpen: (open: boolean) => void;
  setLastDayReport: (report: any | null) => void;
  showToast: (title: string, message: string, level?: 'info' | 'warning' | 'critical' | 'success') => void;
  clearToast: () => void;
  loadCatalogs: () => Promise<void>;
}

export const useMissionStore = create<MissionStoreState>((set, get) => ({
  user: null,
  authLoading: true,
  missions: [],
  facilitiesCatalog: [],
  selectedPlanet: 'moon',
  selectedDifficulty: 'intermediate',
  activeSession: null,
  selectedFacilityId: null,
  placementFacilityType: null,
  viewMode: '3d',
  commanderOpen: false,
  lastDayReport: null,
  toastMessage: null,

  initializeAuth: async () => {
    set({ authLoading: true });
    try {
      const token = localStorage.getItem('astromission_token');
      if (token) {
        const me = await api.getMe();
        set({ user: me, authLoading: false });
        return;
      }
    } catch {
      api.logout();
    }
    set({ user: null, authLoading: false });
  },

  ensureAuthenticatedOrGuest: async () => {
    const existing = get().user;
    if (existing) return existing;
    const res = await api.guestLogin();
    set({ user: res.user });
    return res.user;
  },

  setUser: (user) => set({ user }),
  setSelectedPlanet: (planet) => set({ selectedPlanet: planet }),
  setSelectedDifficulty: (diff) => set({ selectedDifficulty: diff }),
  setActiveSession: (session) => set({ activeSession: session }),
  setSelectedFacilityId: (id) => set({ selectedFacilityId: id }),
  setPlacementFacilityType: (fType) => set({ placementFacilityType: fType }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setCommanderOpen: (open) => set({ commanderOpen: open }),
  setLastDayReport: (report) => set({ lastDayReport: report }),

  showToast: (title, message, level = 'info') => {
    set({ toastMessage: { title, message, level } });
    setTimeout(() => {
      if (get().toastMessage?.title === title) {
        set({ toastMessage: null });
      }
    }, 5000);
  },

  clearToast: () => set({ toastMessage: null }),

  loadCatalogs: async () => {
    try {
      const [missions, facilitiesCatalog] = await Promise.all([
        api.getMissions(),
        api.getFacilitiesCatalog(),
      ]);
      set({
        missions: Array.isArray(missions) ? missions : [],
        facilitiesCatalog: Array.isArray(facilitiesCatalog) ? facilitiesCatalog : [],
      });
    } catch (err) {
      console.error('Failed to load mission catalogs:', err);
    }
  },
}));

export function getSelectedFacility(state: MissionStoreState): SessionFacility | null {
  if (!state.activeSession || !state.selectedFacilityId) return null;
  return state.activeSession.facilities.find((f) => f.id === state.selectedFacilityId) || null;
}
