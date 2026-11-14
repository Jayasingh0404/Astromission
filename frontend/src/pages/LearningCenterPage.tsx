import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Sparkles,
  Languages,
  Award,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { LearningModule } from '../types/astromission';
import { useMissionStore } from '../store/useMissionStore';

export const LearningCenterPage: React.FC = () => {
  const { ensureAuthenticatedOrGuest, showToast } = useMissionStore();
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [selectedMod, setSelectedMod] = useState<LearningModule | null>(null);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getLearningModules()
      .then((list) => {
        setModules(list);
        if (list.length > 0) {
          handleSelectModule(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectModule = async (moduleId: string) => {
    try {
      const fullMod = await api.getLearningModule(moduleId);
      setSelectedMod(fullMod);
      setAnswers({});
      setQuizResult(null);
    } catch (err: any) {
      showToast('Module Load Error', err.message, 'warning');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!selectedMod?.quiz) return;
    setSubmitting(true);
    try {
      await ensureAuthenticatedOrGuest();
      const orderedAnswers = selectedMod.quiz.questions.map((_, idx) =>
        answers[idx] !== undefined ? answers[idx] : -1
      );
      const res = await api.submitQuizAttempt(selectedMod.quiz.id, orderedAnswers);
      setQuizResult(res);
      showToast(
        `Quiz Completed: ${res.percentage}%`,
        `Earned +${res.points_earned} Learning Points!`,
        res.percentage >= 70 ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast('Quiz Error', err.message, 'critical');
    } finally {
      setSubmitting(false);
    }
  };

  const translated =
    lang === 'hi' && selectedMod?.translations?.hi ? selectedMod.translations.hi : null;

  return (
    <div className="min-h-screen cosmic-bg py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              NASA-Referenced Curriculum & Interactive Knowledge Checks
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1">
              ASTROMISSION Educational Learning Center
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Master the physics and systems engineering behind Lunar and Martian habitats, then test your understanding
              to earn Learning Points and Achievements.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="px-4 py-2 rounded-xl bg-space-800 hover:bg-space-700 border border-cyan-500/40 text-xs font-bold text-cyan-300 flex items-center gap-2"
          >
            <Languages className="w-4 h-4" />
            {lang === 'en' ? 'Switch to Hindi (हिन्दी)' : 'Switch to English'}
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Sidebar: Module Catalog */}
          <div className="lg:col-span-4 space-y-2.5">
            {modules.map((m, idx) => {
              const active = selectedMod?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectModule(m.id)}
                  className={`w-full p-4 rounded-xl text-left border transition-all flex items-start justify-between gap-3 ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg'
                      : 'glass-panel border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-cyan-400">
                      Module 0{idx + 1} • {m.topic}
                    </div>
                    <div className="font-bold text-sm text-white">{m.title}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-space-950 text-[10px] font-mono uppercase text-slate-400 shrink-0">
                    {m.difficulty}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Content: Selected Module + Interactive Quiz */}
          <div className="lg:col-span-8 space-y-6">
            {selectedMod && (
              <>
                <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-xs font-mono uppercase text-cyan-400">{selectedMod.topic}</span>
                      <h2 className="text-2xl font-extrabold text-white mt-0.5">
                        {translated ? translated.title : selectedMod.title}
                      </h2>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 text-xs font-mono uppercase">
                      {selectedMod.difficulty}
                    </span>
                  </div>

                  {/* Simple Explanation */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono uppercase text-cyan-300">
                      Concept Overview
                    </h3>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {translated ? translated.simple_explanation : selectedMod.simple_explanation}
                    </p>
                  </div>

                  {/* Interactive System Flow Illustration */}
                  <div className="p-4 rounded-xl bg-space-950 border border-cyan-500/30 space-y-2">
                    <div className="text-xs font-mono uppercase text-cyan-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" /> Coupled Engineering System Diagram ({selectedMod.visual_illustration_type.replace(/_/g, ' ')})
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2.5 pt-1 text-xs text-center font-mono">
                      <div className="p-3 rounded-lg bg-space-900 border border-slate-800 text-amber-300">
                        INPUTS: Solar Irradiance (kWh) + Feedwater (L)
                      </div>
                      <div className="p-3 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 font-bold">
                        PROCESS: {selectedMod.topic} Subsystem
                      </div>
                      <div className="p-3 rounded-lg bg-space-900 border border-slate-800 text-emerald-300">
                        OUTPUTS: Crew Survival, O2/Food & Stability
                      </div>
                    </div>
                  </div>

                  {/* Real-World Application & Related Game Mechanic */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-space-950 border border-slate-800 space-y-1.5">
                      <div className="text-xs font-bold text-violet-300">Real-World NASA Space Application</div>
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedMod.real_world_application}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-space-950 border border-slate-800 space-y-1.5">
                      <div className="text-xs font-bold text-emerald-300">Related ASTROMISSION Game Mechanic</div>
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedMod.related_game_mechanic}</p>
                    </div>
                  </div>

                  {/* Key Takeaways */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono uppercase text-slate-400">Key Engineering Takeaways</h3>
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {selectedMod.key_takeaways.map((kt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{kt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Trusted Source Reference */}
                  {selectedMod.reference && (
                    <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-cyan-300">Verified Reference: </span>
                        <span className="text-slate-200">{selectedMod.reference.source_name}</span>
                      </div>
                      <a
                        href={selectedMod.reference.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        Open NASA Publication <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Interactive Knowledge Check Quiz */}
                {selectedMod.quiz && (
                  <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border-2 border-violet-500/30">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono uppercase text-violet-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Interactive Knowledge Check
                        </span>
                        <h3 className="text-xl font-bold text-white">{selectedMod.quiz.title}</h3>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-bold flex items-center gap-1">
                        <Award className="w-4 h-4" /> +{selectedMod.quiz.points_reward} Learning Points
                      </span>
                    </div>

                    <div className="space-y-5">
                      {selectedMod.quiz.questions.map((q, qIdx) => {
                        const detail = quizResult?.details?.[qIdx];
                        return (
                          <div key={q.id} className="p-4 rounded-xl bg-space-950 border border-slate-800 space-y-3">
                            <div className="font-semibold text-sm text-white">
                              {qIdx + 1}. {q.prompt}
                            </div>
                            <div className="space-y-2">
                              {q.options.map((opt, oIdx) => {
                                const selected = answers[qIdx] === oIdx;
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => setAnswers({ ...answers, [qIdx]: oIdx })}
                                    className={`w-full p-3 rounded-xl text-left text-xs border transition-colors ${
                                      selected
                                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-semibold'
                                        : 'bg-space-900 border-slate-800 text-slate-300 hover:border-slate-600'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {detail && (
                              <div
                                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                                  detail.is_correct
                                    ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-200'
                                    : 'bg-rose-950/50 border border-rose-500/40 text-rose-200'
                                }`}
                              >
                                {detail.is_correct ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <strong>{detail.is_correct ? 'Correct!' : 'Incorrect.'}</strong> {detail.explanation}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {quizResult ? (
                        <div className="text-sm font-bold text-emerald-400">
                          Score: {quizResult.score}/{quizResult.max_score} ({quizResult.percentage}%) • Earned +
                          {quizResult.points_earned} Learning Points!
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">
                          Select an answer for each question above and submit for immediate feedback.
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmitQuiz}
                        className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 font-extrabold text-xs"
                      >
                        {submitting ? 'Grading...' : 'Submit Knowledge Check'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

