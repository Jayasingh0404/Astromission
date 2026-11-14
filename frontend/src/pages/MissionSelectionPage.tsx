import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Moon,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ArrowRight,
  Sun,
  ShieldAlert,
  Thermometer,
} from 'lucide-react';
import { useMissionStore } from '../store/useMissionStore';

export const MissionSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    missions,
    loadCatalogs,
    selectedPlanet,
    setSelectedPlanet,
    selectedDifficulty,
    setSelectedDifficulty,
    ensureAuthenticatedOrGuest,
  } = useMissionStore();

  useEffect(() => {
    loadCatalogs();
  }, []);

  const handleProceedToBriefing = async (planet: 'moon' | 'mars') => {
    setSelectedPlanet(planet);
    await ensureAuthenticatedOrGuest();
    navigate('/briefing');
  };

  const moonScenario = missions.find((m) => m.planet === 'moon');
  const marsScenario = missions.find((m) => m.planet === 'mars');

  const renderScenarioCard = (
    planet: 'moon' | 'mars',
    scenario: typeof moonScenario,
    accentClass: string
  ) => {
    const isSelected = selectedPlanet === planet;
    const isMoon = planet === 'moon';

    return (
      <div
        key={planet}
        onClick={() => setSelectedPlanet(planet)}
        className={`cursor-pointer rounded-2xl p-6 sm:p-8 transition-all border-2 flex flex-col justify-between space-y-6 ${
          isSelected
            ? isMoon
              ? 'bg-space-900/95 border-cyan-400 shadow-2xl shadow-cyan-500/15'
              : 'bg-space-900/95 border-amber-400 shadow-2xl shadow-amber-500/15'
            : 'glass-panel border-slate-800 hover:border-slate-600'
        }`}
      >
        <div className="space-y-4">
          {/* Header & Planet Visual */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className={`text-xs font-mono uppercase tracking-widest ${accentClass}`}>
                {isMoon ? 'LUNAR SOUTH POLE MISSION' : 'MARTIAN DELTA EXPEDITION'}
              </span>
              <h2 className="text-2xl font-extrabold text-white">
                {scenario?.name || (isMoon ? 'Artemis Shackleton Crater Outpost' : 'Ares Jezero Delta Research Base')}
              </h2>
              <p className="text-xs text-slate-300">
                {scenario?.tagline ||
                  (isMoon
                    ? 'Establish humanity’s permanent foothold at the Lunar South Pole.'
                    : 'Sustain a self-reliant human research colony on the Red Planet.')}
              </p>
            </div>
            <div
              className={`w-16 h-16 rounded-full shrink-0 flex items-center justify-center shadow-lg ${
                isMoon
                  ? 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-700'
                  : 'bg-gradient-to-br from-orange-400 via-red-600 to-amber-900'
              }`}
            >
              {isMoon ? (
                <Moon className="w-8 h-8 text-space-950" />
              ) : (
                <Globe className="w-8 h-8 text-space-950" />
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {scenario?.description}
          </p>

          {/* Environmental Constraints Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-space-950 border border-slate-800">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Solar Flux
              </div>
              <div className="font-mono font-bold text-xs text-white mt-0.5">
                {isMoon ? '100% Peak / 22% Shadow' : '68% Peak / Dust Drops'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-space-950 border border-slate-800">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <ShieldAlert className="w-3.5 h-3.5 text-violet-400" /> Ambient GCR
              </div>
              <div className="font-mono font-bold text-xs text-white mt-0.5">
                {isMoon ? '1.35 mSv/day (Vacuum)' : '0.78 mSv/day (Thin CO2)'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-space-950 border border-slate-800">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Thermometer className="w-3.5 h-3.5 text-cyan-400" /> Gravity & Temp
              </div>
              <div className="font-mono font-bold text-xs text-white mt-0.5">
                {isMoon ? '0.166g • -203°C/+121°C' : '0.378g • -110°C/+20°C'}
              </div>
            </div>
          </div>

          {/* Major Hazards */}
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Major Planetary Hazards
            </div>
            <ul className="space-y-1 text-xs text-slate-300">
              {(scenario?.major_hazards || []).map((haz, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-rose-400 mt-0.5">•</span>
                  <span>{haz}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mission Objectives */}
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Primary Mission Objectives
            </div>
            <ul className="space-y-1 text-xs text-slate-300">
              {(scenario?.objectives || []).map((obj, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>{obj.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Select & Proceed CTA */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleProceedToBriefing(planet);
          }}
          className={`w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${
            isMoon
              ? 'bg-cyan-500 hover:bg-cyan-400 text-space-950 shadow-lg shadow-cyan-500/20'
              : 'bg-amber-500 hover:bg-amber-400 text-space-950 shadow-lg shadow-amber-500/20'
          }`}
        >
          Configure {isMoon ? 'Moon' : 'Mars'} Mission Briefing <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen cosmic-bg py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Step 1 of 2 — Planetary Destination
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Select Your Space Mission</h1>
            <p className="text-sm text-slate-300 mt-1">
              Choose between the Lunar South Pole and Mars’ Jezero Crater, and set your engineering challenge tier.
            </p>
          </div>

          {/* Difficulty Selector */}
          <div className="glass-panel rounded-xl p-2 flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 px-2 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Difficulty:
            </span>
            {(['beginner', 'intermediate', 'expert'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                  selectedDifficulty === diff
                    ? 'bg-cyan-500 text-space-950'
                    : 'text-slate-300 hover:bg-space-800'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Moon vs Mars Cards */}
        <div className="grid lg:grid-cols-2 gap-8">
          {renderScenarioCard('moon', moonScenario, 'text-cyan-400')}
          {renderScenarioCard('mars', marsScenario, 'text-amber-400')}
        </div>
      </div>
    </div>
  );
};

