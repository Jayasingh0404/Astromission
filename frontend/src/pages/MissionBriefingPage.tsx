import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  Users,
  Calendar,
  Sliders,
  Package,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { useMissionStore } from '../store/useMissionStore';
import { api } from '../services/api';

export const MissionBriefingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    missions,
    loadCatalogs,
    selectedPlanet,
    setSelectedPlanet,
    selectedDifficulty,
    setSelectedDifficulty,
    setActiveSession,
    ensureAuthenticatedOrGuest,
    showToast,
  } = useMissionStore();

  const [missionName, setMissionName] = useState('');
  const [durationDays, setDurationDays] = useState(15);
  const [crewSize, setCrewSize] = useState(4);
  const [supplyPreset, setSupplyPreset] = useState('balanced');
  const [extraStartingModule, setExtraStartingModule] = useState<string>('none');
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    loadCatalogs();
  }, []);

  const currentScenario =
    missions.find((m) => m.planet === selectedPlanet) || missions[0];

  useEffect(() => {
    if (currentScenario) {
      setMissionName(currentScenario.name);
      setDurationDays(currentScenario.default_duration_days || 15);
      setCrewSize(currentScenario.default_crew_size || 4);
    }
  }, [selectedPlanet, missions]);

  const dailyO2Need = (0.84 * crewSize).toFixed(2);
  const dailyWaterNeed = (3.5 * crewSize).toFixed(1);
  const dailyFoodNeed = (0.62 * crewSize).toFixed(2);

  const handleStartMission = async () => {
    setLaunching(true);
    try {
      await ensureAuthenticatedOrGuest();
      const baseFacs = currentScenario
        ? [...currentScenario.starting_facilities]
        : [
            { facility_id: 'crew_habitat', level: 1, grid_x: 0, grid_z: 0 },
            { facility_id: 'solar_array', level: 1, grid_x: -6, grid_z: -4 },
            { facility_id: 'battery_storage', level: 1, grid_x: -6, grid_z: 2 },
            { facility_id: 'oxygen_generator', level: 1, grid_x: 5, grid_z: -3 },
          ];

      if (extraStartingModule !== 'none') {
        baseFacs.push({
          facility_id: extraStartingModule,
          level: 1,
          grid_x: 0,
          grid_z: 6,
        });
      }

      const session = await api.createSession({
        mission_id: currentScenario?.id || (selectedPlanet === 'moon' ? 'moon-shackleton-outpost' : 'mars-jezero-colony'),
        mission_name: missionName || currentScenario?.name,
        difficulty: selectedDifficulty,
        target_duration_days: durationDays,
        crew_size: crewSize,
        supply_preset: supplyPreset,
        starting_facilities: baseFacs,
      });

      setActiveSession(session);
      showToast(
        'Mission Launched!',
        `Welcome to ${session.mission_name} (Day 1 of ${session.target_duration_days}).`,
        'success'
      );
      navigate(`/mission-control/${session.id}`);
    } catch (err: any) {
      showToast('Launch Error', err.message || 'Could not start mission.', 'critical');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="min-h-screen cosmic-bg py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/missions')}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Planet Selection
            </button>
            <h1 className="text-3xl font-extrabold text-white">Mission Briefing & Engineering Configuration</h1>
            <p className="text-sm text-slate-300">
              Review crew metabolic requirements, customize starting supplies, and launch your 3D outpost simulation.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column: Mission Configuration Controls */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-cyan-400" /> Outpost Parameters
            </h2>

            {/* Planet & Mission Name */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Celestial Body</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['moon', 'mars'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPlanet(p)}
                      className={`py-2.5 rounded-xl font-bold text-xs uppercase border ${
                        selectedPlanet === p
                          ? 'bg-cyan-500 text-space-950 border-cyan-400'
                          : 'bg-space-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mission Designation</label>
                <input
                  type="text"
                  value={missionName}
                  onChange={(e) => setMissionName(e.target.value)}
                  className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
            </div>

            {/* Duration & Crew Size */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-space-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-4 h-4 text-cyan-400" /> Mission Duration
                  </span>
                  <span className="font-mono font-bold text-cyan-300">{durationDays} Days</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={35}
                  step={5}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5 Days (Quick Lab)</span>
                  <span>15 Days (Standard)</span>
                  <span>35 Days (Endurance)</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-space-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                    <Users className="w-4 h-4 text-violet-400" /> Astronaut Crew Size
                  </span>
                  <span className="font-mono font-bold text-violet-300">{crewSize} Astronauts</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={crewSize}
                  onChange={(e) => setCrewSize(Number(e.target.value))}
                  className="w-full accent-violet-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>2 Crew</span>
                  <span>4 Crew (Artemis)</span>
                  <span>8 Crew (Colony)</span>
                </div>
              </div>
            </div>

            {/* Difficulty & Supply Preset */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Simulation Difficulty</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                  className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="beginner">Beginner (+25% Supplies, Milder Hazards, Full Hints)</option>
                  <option value="intermediate">Intermediate (Standard NASA Space Apps Balance)</option>
                  <option value="expert">Expert (-18% Supplies, Intense Solar/Dust Storms)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  <Package className="w-3.5 h-3.5 inline mr-1 text-cyan-400" /> Starting Cargo Supply Allocation
                </label>
                <select
                  value={supplyPreset}
                  onChange={(e) => setSupplyPreset(e.target.value)}
                  className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="balanced">Balanced Cargo Manifest (100% All Reserves)</option>
                  <option value="abundant">Abundant Resupply Lander (+20% All Reserves)</option>
                  <option value="power_focus">Power-Heavy Manifest (+30% Battery Charge, -10% Food)</option>
                  <option value="life_support_focus">ECLSS Priority (+25% O2 & Water, -15% Energy)</option>
                  <option value="lean">Lean Mass Budget (-15% Starting Reserves)</option>
                </select>
              </div>
            </div>

            {/* Starting Infrastructure Bonus Option */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                <Building2 className="w-3.5 h-3.5 inline mr-1 text-emerald-400" /> Optional Pre-Landed Auxiliary Module
              </label>
              <select
                value={extraStartingModule}
                onChange={(e) => setExtraStartingModule(e.target.value)}
                className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                <option value="none">Standard 4-Module Base (Habitat, Solar Array, Battery, O2/Water Unit)</option>
                <option value="greenhouse">+ Pre-Deploy Hydroponic Greenhouse (Produces Food & O2; High Power/Water Load)</option>
                <option value="radiation_shelter">+ Pre-Deploy Regolith Radiation Shelter (+32% Shielding Effectiveness)</option>
                <option value="research_laboratory">+ Pre-Deploy Planetary Science Lab (+10 Science Pts/Day)</option>
              </select>
            </div>
          </div>

          {/* Right Column: Crew Metabolic Budget, Hazards & Start Mission Button */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-cyan-300 uppercase font-mono">
                Calculated Daily Crew Metabolic Demand ({crewSize} Crew)
              </h3>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-space-950 border border-slate-800">
                  <div className="text-base font-extrabold text-cyan-400">{dailyO2Need} kg</div>
                  <div className="text-[11px] text-slate-400">Oxygen / Day</div>
                </div>
                <div className="p-3 rounded-xl bg-space-950 border border-slate-800">
                  <div className="text-base font-extrabold text-sky-400">{dailyWaterNeed} L</div>
                  <div className="text-[11px] text-slate-400">Water / Day</div>
                </div>
                <div className="p-3 rounded-xl bg-space-950 border border-slate-800">
                  <div className="text-base font-extrabold text-emerald-400">{dailyFoodNeed} kg</div>
                  <div className="text-[11px] text-slate-400">Food / Day</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Note: Based on NASA ECLSS metabolic baselines (0.84 kg O2, 3.5 L potable/hygiene water, and 0.62 kg dry
                food per astronaut per day).
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <h3 className="font-bold text-sm text-emerald-400 uppercase font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Mission Success Conditions
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-200">
                <li>1. Survive all {durationDays} mission days with Crew Health above 0%.</li>
                <li>2. Prevent Oxygen or Water reserves from reaching complete depletion.</li>
                <li>3. Respond to environmental emergencies (Solar Storms, Dust Fronts, Leaks).</li>
                <li>4. Expand outpost infrastructure and gather Planetary Science Points.</li>
              </ul>

              <div className="pt-2 border-t border-slate-800 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Engineering Warning: Every new facility consumes electricity. Check your net kWh/day balance before
                  advancing the mission day!
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartMission}
              disabled={launching}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 hover:from-cyan-300 hover:to-violet-400 text-space-950 font-extrabold text-base shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Rocket className="w-5 h-5" />
              {launching ? 'Initializing Simulation Engine...' : 'LAUNCH 3D MISSION CONTROL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

