import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Wind,
  Droplets,
  Sprout,
  Zap,
  ShieldAlert,
  HeartPulse,
  Wrench,
  Play,
  Pause,
  FastForward,
  Bot,
  Box,
  Compass,
  Plus,
  ArrowUpCircle,
  Power,
  AlertTriangle,
  CheckCircle2,
  Award,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useMissionStore, getSelectedFacility } from '../store/useMissionStore';
import { api } from '../services/api';
import { OutpostScene3D } from '../three/scenes/OutpostScene3D';

export const MissionControlPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const state = useMissionStore();
  const {
    activeSession,
    setActiveSession,
    facilitiesCatalog,
    loadCatalogs,
    selectedFacilityId,
    setSelectedFacilityId,
    placementFacilityType,
    setPlacementFacilityType,
    viewMode,
    setViewMode,
    setCommanderOpen,
    showToast,
    ensureAuthenticatedOrGuest,
  } = state;

  const selectedFacility = getSelectedFacility(state);

  const [rightTab, setRightTab] = useState<'inspect' | 'build' | 'ops'>('build');
  const [busy, setBusy] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [fullReport, setFullReport] = useState<any>(null);
  const [aiEventExplanation, setAiEventExplanation] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      await ensureAuthenticatedOrGuest();
      await loadCatalogs();
      if (sessionId) {
        try {
          const sess = await api.getSession(sessionId);
          setActiveSession(sess);
          if (sess.facilities.length > 0 && !selectedFacilityId) {
            setSelectedFacilityId(sess.facilities[0].id);
          }
          if (sess.status === 'completed' || sess.status === 'failed') {
            const rep = await api.getSessionReport(sess.id);
            setFullReport(rep);
            setShowReportModal(true);
          }
        } catch (err: any) {
          showToast('Session Load Error', err.message || 'Could not load mission session.', 'critical');
        }
      }
    };
    init();
  }, [sessionId]);

  useEffect(() => {
    if (selectedFacilityId) {
      setRightTab('inspect');
    }
  }, [selectedFacilityId]);

  if (!activeSession) {
    return (
      <div className="min-h-[calc(100vh-4rem)] cosmic-bg flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="text-lg font-bold text-white">Loading 3D Mission Control Telemetry...</div>
        <button
          type="button"
          onClick={() => navigate('/missions')}
          className="px-4 py-2 rounded-xl bg-cyan-500 text-space-950 font-bold text-xs"
        >
          Select or Launch a Mission
        </button>
      </div>
    );
  }

  const res = activeSession.resources;
  const env = activeSession.environment;
  const pendingEvents = activeSession.events.filter((e) => e.status === 'pending');

  const handleAdvanceDay = async () => {
    if (busy) return;
    setBusy(true);
    setAiEventExplanation(null);
    try {
      const token = `${activeSession.id}-day-${activeSession.current_day}-${Date.now()}`;
      const out = await api.advanceDay(activeSession.id, token);
      setActiveSession(out.session);

      if (out.day_report.newly_unlocked_achievements?.length) {
        showToast(
          'Achievement Unlocked!',
          out.day_report.newly_unlocked_achievements.join(', '),
          'success'
        );
      } else if (out.day_report.generated_event) {
        showToast(
          `ALERT: ${out.day_report.generated_event.title}`,
          'Respond to the emergency event in Mission Control.',
          'warning'
        );
      } else {
        showToast(
          `Advanced to Day ${out.day_report.day}`,
          out.day_report.log_entries?.[0] || 'Daily resource balance calculated.',
          'info'
        );
      }

      if (out.session.status === 'completed' || out.session.status === 'failed') {
        const rep = await api.getSessionReport(out.session.id);
        setFullReport(rep);
        setShowReportModal(true);
      }
    } catch (err: any) {
      showToast('Simulation Error', err.message, 'critical');
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      const updated =
        activeSession.status === 'paused'
          ? await api.resumeSession(activeSession.id)
          : await api.pauseSession(activeSession.id);
      setActiveSession(updated);
    } catch (err: any) {
      showToast('Status Error', err.message, 'warning');
    }
  };

  const handleConstructFacility = async (facilityTypeId: string, gx?: number, gz?: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api.constructFacility(activeSession.id, facilityTypeId, gx, gz);
      setActiveSession(updated);
      setPlacementFacilityType(null);
      const newest = updated.facilities[updated.facilities.length - 1];
      if (newest) setSelectedFacilityId(newest.id);
      showToast('Facility Constructed!', `Deployed ${newest?.name || facilityTypeId} to the outpost.`, 'success');
    } catch (err: any) {
      showToast('Construction Blocked', err.message, 'critical');
    } finally {
      setBusy(false);
    }
  };

  const handleUpgradeFacility = async (instId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api.updateFacility(activeSession.id, instId, { upgrade: true });
      setActiveSession(updated);
      showToast('Module Upgraded!', 'Production and storage capacity increased.', 'success');
    } catch (err: any) {
      showToast('Upgrade Blocked', err.message, 'critical');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleFacilityPower = async (instId: string, currentOp: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api.updateFacility(activeSession.id, instId, { is_operational: !currentOp });
      setActiveSession(updated);
      showToast('Power Grid Updated', `Module switched ${!currentOp ? 'ONLINE' : 'to STANDBY'}.`, 'info');
    } catch (err: any) {
      showToast('Error', err.message, 'critical');
    } finally {
      setBusy(false);
    }
  };

  const handleRepairFacility = async (instId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api.repairFacility(activeSession.id, instId);
      setActiveSession(updated);
      showToast('Facility Repaired', 'Restored structural integrity to 100% (-10 kWh).', 'success');
    } catch (err: any) {
      showToast('Repair Blocked', err.message, 'critical');
    } finally {
      setBusy(false);
    }
  };

  const handleCrewOperation = async (actionType: 'ration' | 'emergency_o2' | 'rover_sortie') => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api.performAction(activeSession.id, actionType);
      setActiveSession(updated);
      showToast('Operation Executed', updated.recent_actions?.[0]?.outcome?.message || 'Completed.', 'success');
    } catch (err: any) {
      showToast('Operation Blocked', err.message, 'critical');
    } finally {
      setBusy(false);
    }
  };

  const handleChooseEventOption = async (eventChoiceId: string, optionId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api.chooseEventDecision(activeSession.id, eventChoiceId, optionId);
      setActiveSession(updated);
      setAiEventExplanation(null);
      showToast('Emergency Decision Executed', `Option ${optionId} applied to outpost telemetry.`, 'success');
    } catch (err: any) {
      showToast('Event Error', err.message, 'critical');
    } finally {
      setBusy(false);
    }
  };

  const handleExplainEventWithAI = async (eventId: string) => {
    try {
      const exp = await api.explainEvent(eventId, activeSession.id);
      setAiEventExplanation(exp);
    } catch (err: any) {
      showToast('AI Mentor Notice', err.message, 'warning');
    }
  };

  const openReportPreview = async () => {
    try {
      const rep = await api.getSessionReport(activeSession.id);
      setFullReport(rep);
      setShowReportModal(true);
    } catch (err: any) {
      showToast('Report Error', err.message, 'warning');
    }
  };

  const renderResourceBar = (
    label: string,
    icon: React.ReactNode,
    metric: typeof res.oxygen,
    colorClass: string
  ) => {
    const pct = Math.min(100, Math.round((metric.current / Math.max(1, metric.capacity)) * 100));
    const net = (metric.production_rate || 0) - (metric.consumption_rate || 0);
    const isCrit = metric.status === 'critical' || metric.status === 'depleted';

    return (
      <div
        className={`p-3 rounded-xl border transition-colors ${
          isCrit ? 'bg-rose-950/50 border-rose-500/60' : 'bg-space-950/90 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-white flex items-center gap-1.5">
            {icon} {label}
          </span>
          <span className="font-mono text-xs text-slate-200">
            <strong>{metric.current}</strong> / {metric.capacity} {metric.unit}
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-space-800 overflow-hidden mb-1.5">
          <div className={`h-full rounded-full ${isCrit ? 'bg-rose-500' : colorClass}`} style={{ width: `${pct}%` }} />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>
            +{metric.production_rate || 0} / -{metric.consumption_rate || 0} {metric.unit}/d
          </span>
          <span className={net >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
            Net: {net >= 0 ? `+${net.toFixed(1)}` : net.toFixed(1)}/d
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] cosmic-bg flex flex-col justify-between p-3 lg:p-4 gap-3">
      {/* TOP MISSION CONTROL BAR */}
      <div className="glass-panel rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold uppercase ${
              activeSession.planet === 'moon'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {activeSession.planet}
          </span>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-white leading-tight">
              {activeSession.mission_name}
            </h1>
            <div className="text-[11px] text-slate-400 font-mono">
              Crew: {activeSession.crew_size} • Difficulty: {activeSession.difficulty.toUpperCase()} • Status:{' '}
              <span className="text-emerald-400 uppercase">{activeSession.status}</span>
            </div>
          </div>
        </div>

        {/* Day Counter & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-space-950 border border-cyan-500/40 font-mono text-xs text-white">
            MISSION DAY <strong className="text-cyan-400 text-sm">{activeSession.current_day}</strong> /{' '}
            {activeSession.target_duration_days}
          </div>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
            className="px-3 py-1.5 rounded-xl bg-space-800 hover:bg-space-700 border border-slate-700 text-xs font-medium text-cyan-300 flex items-center gap-1.5"
          >
            {viewMode === '3d' ? (
              <>
                <Compass className="w-3.5 h-3.5" /> 2D Blueprint
              </>
            ) : (
              <>
                <Box className="w-3.5 h-3.5" /> 3D Outpost
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTogglePause}
            className="px-3 py-1.5 rounded-xl bg-space-800 hover:bg-space-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1"
          >
            {activeSession.status === 'paused' ? (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" /> Pause
              </>
            )}
          </button>

          <button
            type="button"
            onClick={openReportPreview}
            className="px-3 py-1.5 rounded-xl bg-space-800 hover:bg-space-700 border border-slate-700 text-xs font-medium text-violet-300 flex items-center gap-1"
          >
            <Award className="w-3.5 h-3.5" /> Score & Debrief
          </button>

          <button
            type="button"
            onClick={handleAdvanceDay}
            disabled={busy || activeSession.status === 'completed' || activeSession.status === 'failed'}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 disabled:opacity-40 text-space-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <FastForward className="w-4 h-4" /> End Day ({activeSession.current_day} → {activeSession.current_day + 1})
          </button>
        </div>
      </div>

      {/* MAIN 3-COLUMN WORKSPACE */}
      <div className="grid lg:grid-cols-12 gap-3 flex-1">
        {/* LEFT SIDEBAR: 7 RESOURCE MONITORS & OBJECTIVES */}
        <div className="lg:col-span-3 glass-panel rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold">
                Resource Telemetry
              </span>
              <span className="font-mono text-[11px] text-violet-300">
                Science: <strong>{res.science_points || 0} pts</strong>
              </span>
            </div>

            {renderResourceBar('Oxygen (O2)', <Wind className="w-3.5 h-3.5 text-cyan-400" />, res.oxygen, 'bg-cyan-400')}
            {renderResourceBar('Potable Water', <Droplets className="w-3.5 h-3.5 text-sky-400" />, res.water, 'bg-sky-400')}
            {renderResourceBar('Food Supply', <Sprout className="w-3.5 h-3.5 text-emerald-400" />, res.food, 'bg-emerald-400')}
            {renderResourceBar('Electrical Energy', <Zap className="w-3.5 h-3.5 text-amber-400" />, res.energy, 'bg-amber-400')}

            {/* Radiation Protection, Crew Health & Infrastructure */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-space-950 border border-slate-800 text-center">
                <HeartPulse className="w-4 h-4 text-rose-400 mx-auto mb-0.5" />
                <div className="font-mono font-bold text-xs text-white">{res.crew_health}%</div>
                <div className="text-[10px] text-slate-400">Crew Health</div>
              </div>
              <div className="p-2.5 rounded-xl bg-space-950 border border-slate-800 text-center">
                <ShieldAlert className="w-4 h-4 text-violet-400 mx-auto mb-0.5" />
                <div className="font-mono font-bold text-xs text-white">{res.radiation_shielding}%</div>
                <div className="text-[10px] text-slate-400">Dose: {res.cumulative_radiation_msv} mSv</div>
              </div>
              <div className="p-2.5 rounded-xl bg-space-950 border border-slate-800 text-center">
                <Wrench className="w-4 h-4 text-cyan-400 mx-auto mb-0.5" />
                <div className="font-mono font-bold text-xs text-white">{res.infrastructure_condition}%</div>
                <div className="text-[10px] text-slate-400">Base Health</div>
              </div>
            </div>
          </div>

          {/* Mission Objectives Checklist */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="font-mono text-[11px] uppercase text-slate-400">Mission Objectives</div>
            {activeSession.objectives.map((obj) => (
              <div key={obj.id} className="flex items-start gap-2 text-xs">
                <CheckCircle2
                  className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                    obj.completed ? 'text-emerald-400' : obj.failed ? 'text-rose-400' : 'text-slate-600'
                  }`}
                />
                <div className="flex-1">
                  <div className={obj.completed ? 'text-emerald-300 font-medium' : 'text-slate-300'}>
                    {obj.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER VIEWPORT: 3D SCENE + ACTIVE EMERGENCY EVENT OVERLAY */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          {/* Active Emergency Event Decision Banner */}
          {pendingEvents.length > 0 && (
            <div className="rounded-xl bg-rose-950/90 border-2 border-rose-500 p-4 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-rose-200 font-extrabold text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                  EMERGENCY EVENT (Day {pendingEvents[0].mission_day}): {pendingEvents[0].title}
                </div>
                <button
                  type="button"
                  onClick={() => handleExplainEventWithAI(pendingEvents[0].event_id)}
                  className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Bot className="w-3.5 h-3.5" /> Ask Commander AI
                </button>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">{pendingEvents[0].description}</p>
              <p className="text-[11px] text-rose-200/90 italic">
                Scientific Context: {pendingEvents[0].scientific_explanation}
              </p>

              {aiEventExplanation && (
                <div className="p-3 rounded-lg bg-space-950/90 border border-violet-400/50 text-xs text-violet-100 space-y-1">
                  <div className="font-bold text-cyan-300">COMMANDER AI ADVISORY:</div>
                  <p>{aiEventExplanation.trade_offs}</p>
                </div>
              )}

              <div className="space-y-2 pt-1">
                {pendingEvents[0].decision_options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={busy}
                    onClick={() => handleChooseEventOption(pendingEvents[0].id, opt.id)}
                    className="w-full p-3 rounded-xl bg-space-950/90 hover:bg-space-900 border border-rose-400/40 hover:border-cyan-400 text-left transition-all"
                  >
                    <div className="font-bold text-xs text-cyan-300">
                      Option {opt.id}: {opt.label}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">{opt.tradeoff}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3D / 2D Interactive Scene */}
          <div className="flex-1 min-h-[440px]">
            <OutpostScene3D
              planet={activeSession.planet}
              facilities={activeSession.facilities}
              environment={env}
              selectedFacilityId={selectedFacilityId}
              onSelectFacility={(id) => setSelectedFacilityId(id)}
              placementFacilityType={placementFacilityType}
              onPlaceFacilityAt={(gx, gz) => {
                if (placementFacilityType) {
                  handleConstructFacility(placementFacilityType, gx, gz);
                }
              }}
              force2D={viewMode === '2d'}
            />
          </div>
        </div>

        {/* RIGHT SIDEBAR: CONSTRUCTION, BUILDING INSPECTION & CREW OPS */}
        <div className="lg:col-span-3 glass-panel rounded-xl p-3.5 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-space-950 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRightTab('build')}
                className={`py-1.5 rounded-lg ${
                  rightTab === 'build' ? 'bg-cyan-500 text-space-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Build (12)
              </button>
              <button
                type="button"
                onClick={() => setRightTab('inspect')}
                className={`py-1.5 rounded-lg ${
                  rightTab === 'inspect' ? 'bg-cyan-500 text-space-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Inspect
              </button>
              <button
                type="button"
                onClick={() => setRightTab('ops')}
                className={`py-1.5 rounded-lg ${
                  rightTab === 'ops' ? 'bg-cyan-500 text-space-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Crew Ops
              </button>
            </div>

            {/* TAB 1: BUILD NEW FACILITY */}
            {rightTab === 'build' && (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                <div className="text-[11px] text-slate-400">
                  Select a facility to construct immediately or place on the 3D surface grid:
                </div>
                {facilitiesCatalog.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-space-950/90 border border-slate-800 hover:border-cyan-500/40 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-white">{f.name}</div>
                        <div className="text-[10px] font-mono text-cyan-400 uppercase">{f.category.replace('_', ' ')}</div>
                      </div>
                      <div className="text-right font-mono text-[10px] text-amber-300">
                        Cost: {f.construction_cost.energy} kWh • {f.construction_cost.water} L
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">{f.description}</p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Load: -{f.energy_consumption} kWh/d</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setPlacementFacilityType(placementFacilityType === f.id ? null : f.id)
                          }
                          className={`px-2 py-1 rounded border text-[10px] font-semibold ${
                            placementFacilityType === f.id
                              ? 'bg-cyan-500 text-space-950 border-cyan-300'
                              : 'bg-space-800 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {placementFacilityType === f.id ? 'Cancel Grid' : 'Place on Grid'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleConstructFacility(f.id)}
                          className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold text-[10px] flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Build
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: INSPECT SELECTED FACILITY */}
            {rightTab === 'inspect' && (
              <div className="space-y-3">
                {!selectedFacility ? (
                  <div className="p-6 rounded-xl bg-space-950 border border-slate-800 text-center text-xs text-slate-400">
                    Click any facility in the 3D Outpost or 2D Blueprint to inspect its telemetry, upgrade level, or
                    repair wear.
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-space-950 border border-cyan-500/30 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-white">{selectedFacility.name}</h3>
                        <span className="text-[11px] font-mono text-cyan-400">
                          Level {selectedFacility.level} / {selectedFacility.max_level} • Priority Tier{' '}
                          {selectedFacility.power_priority}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          selectedFacility.is_operational
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {selectedFacility.is_operational ? 'ONLINE' : 'STANDBY'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{selectedFacility.description}</p>

                    <div className="p-2.5 rounded-lg bg-space-900 border border-slate-800 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Structural Condition:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {Math.round(selectedFacility.condition)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Daily Power Load:</span>
                        <span className="font-mono text-amber-300">-{selectedFacility.energy_consumption} kWh/day</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-100">
                      <strong className="text-cyan-300 block mb-0.5">NASA Engineering Note:</strong>
                      {selectedFacility.educational_explanation}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        disabled={busy || selectedFacility.level >= selectedFacility.max_level}
                        onClick={() => handleUpgradeFacility(selectedFacility.id)}
                        className="py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-space-950 font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Upgrade (L{selectedFacility.level + 1})
                      </button>

                      <button
                        type="button"
                        disabled={busy || selectedFacility.condition >= 99}
                        onClick={() => handleRepairFacility(selectedFacility.id)}
                        className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-space-950 font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <Wrench className="w-3.5 h-3.5" /> Repair (10 kWh)
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handleToggleFacilityPower(selectedFacility.id, selectedFacility.is_operational)
                      }
                      className="w-full py-2 rounded-xl bg-space-800 hover:bg-space-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5"
                    >
                      <Power className="w-3.5 h-3.5 text-amber-400" />
                      {selectedFacility.is_operational
                        ? 'Put Facility on Standby (Save Power)'
                        : 'Power Facility Online'}
                    </button>
                  </div>
                )}

                {/* Installed Modules Quick Selector */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-slate-400">
                    Installed Base Modules ({activeSession.facilities.length})
                  </div>
                  <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1">
                    {activeSession.facilities.map((fac) => (
                      <button
                        key={fac.id}
                        type="button"
                        onClick={() => setSelectedFacilityId(fac.id)}
                        className={`w-full px-3 py-1.5 rounded-lg text-left text-xs flex items-center justify-between border ${
                          fac.id === selectedFacilityId
                            ? 'bg-cyan-500/20 border-cyan-400 text-white'
                            : 'bg-space-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="truncate">
                          {fac.name} (L{fac.level})
                        </span>
                        <span className="font-mono text-[10px] text-cyan-300">{Math.round(fac.condition)}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CREW & SURFACE OPERATIONS */}
            {rightTab === 'ops' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-space-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-xs text-cyan-300">
                    1. Pressurized Rover Crater Ice Sortie
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Dispatch rover team to harvest subsurface water ice (+32 L Water & +5 Science Points; costs 16 kWh
                    Energy & 2.0 kg EVA O2).
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleCrewOperation('rover_sortie')}
                    className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold text-xs"
                  >
                    Launch Rover Ice Sortie
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-space-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-xs text-sky-300">
                    2. Emergency O2 Electrolysis Surge
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Split 15 L reserve water using 18 kWh power to immediately generate +8.0 kg breathable Oxygen.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleCrewOperation('emergency_o2')}
                    className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-space-950 font-bold text-xs"
                  >
                    Run O2 Electrolysis Surge
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-space-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-xs text-amber-300">
                    3. Crew Food Rationing Protocol
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Current Mode: <strong className="uppercase text-white">{res.rationing_mode || 'normal'}</strong>.
                    Rationing cuts daily food consumption by 32% at a -1.5%/day Crew Health trade-off.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleCrewOperation('ration')}
                    className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-space-950 font-bold text-xs"
                  >
                    Toggle Food Rationing
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ask Commander AI Quick Button */}
          <button
            type="button"
            onClick={() => setCommanderOpen(true)}
            className="w-full py-2.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/45 border border-violet-400/50 text-violet-100 font-bold text-xs flex items-center justify-center gap-2"
          >
            <Bot className="w-4 h-4 text-cyan-400" /> Consult COMMANDER AI (Text & Voice)
          </button>
        </div>
      </div>

      {/* BOTTOM MISSION TIMELINE & LOG PANEL */}
      <div className="glass-panel rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[260px] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>MISSION TIMELINE PROGRESS</span>
            <span>
              Day {activeSession.current_day} of {activeSession.target_duration_days} (
              {Math.round((activeSession.current_day / activeSession.target_duration_days) * 100)}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-space-950 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (activeSession.current_day / activeSession.target_duration_days) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="flex-1 min-w-[280px] text-xs text-slate-300 font-mono truncate">
          Latest Log:{' '}
          <span className="text-cyan-300">
            {activeSession.recent_actions?.[0]?.outcome?.message ||
              activeSession.recent_actions?.[0]?.outcome?.log_entries?.[0] ||
              'Outpost systems nominal. Ready for commander orders.'}
          </span>
        </div>
      </div>

      {/* POST-MISSION DEBRIEF & WEIGHTED SCORE MODAL */}
      {showReportModal && fullReport && (
        <div className="fixed inset-0 z-50 bg-space-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 my-8 border-2 border-cyan-400/50">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono uppercase text-cyan-400">
                  Official ASTROMISSION Engineering Debrief
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-0.5">
                  {fullReport.outcome === 'completed'
                    ? 'MISSION ACCOMPLISHED!'
                    : fullReport.outcome === 'failed'
                    ? 'MISSION TERMINATED — CRITICAL FAILURE'
                    : 'LIVE MISSION SCORE BREAKDOWN'}
                </h2>
                <p className="text-xs text-slate-300">
                  {fullReport.mission_name} • Survived {fullReport.days_survived} / {fullReport.target_days} Days
                </p>
              </div>
              <div className="px-5 py-3 rounded-2xl bg-space-950 border border-cyan-400 text-center">
                <div className="text-3xl font-extrabold text-cyan-400">{fullReport.total_score}</div>
                <div className="text-[10px] font-mono uppercase text-slate-400">Weighted Score / 100</div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(fullReport.score_breakdown || {}).map(([key, item]: [string, any]) => (
                <div key={key} className="p-3 rounded-xl bg-space-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-cyan-300">
                      {item.score}/100 <span className="text-slate-500">({item.weight})</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{item.explanation}</p>
                </div>
              ))}
            </div>

            {/* Best Decisions & Insights */}
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                <div className="font-bold text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Best Engineering Decisions
                </div>
                <ul className="list-disc list-inside text-slate-200 space-y-1">
                  {(fullReport.best_decisions || []).map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                <div className="font-bold text-amber-300">Recommended Improvements</div>
                <ul className="list-disc list-inside text-slate-200 space-y-1">
                  {(fullReport.recommended_improvements || []).map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => navigate('/analytics')}
                className="px-4 py-2 rounded-xl bg-space-800 hover:bg-space-700 text-cyan-300 text-xs font-bold border border-cyan-500/30"
              >
                View Full Analytics Charts
              </button>
              <button
                type="button"
                onClick={() => navigate('/briefing')}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 text-xs font-extrabold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Replay / New Mission
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-xl bg-space-800 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

