import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Rocket,
  Moon,
  Globe,
  ShieldAlert,
  Cpu,
  Droplets,
  Zap,
  Sprout,
  Wind,
  HeartPulse,
  Bot,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Mic,
  Award,
} from 'lucide-react';
import { useMissionStore } from '../store/useMissionStore';
import { api } from '../services/api';
import { ScientificReference } from '../types/astromission';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedPlanet, setCommanderOpen, ensureAuthenticatedOrGuest } = useMissionStore();
  const [references, setReferences] = useState<ScientificReference[]>([]);

  useEffect(() => {
    api
      .getScientificReferences()
      .then((refs) => setReferences(Array.isArray(refs) ? refs.slice(0, 6) : []))
      .catch(() => {});
  }, []);

  const handleLaunchMission = async (planet?: 'moon' | 'mars') => {
    if (planet) setSelectedPlanet(planet);
    await ensureAuthenticatedOrGuest();
    navigate(planet ? '/briefing' : '/missions');
  };

  return (
    <div className="min-h-screen cosmic-bg text-slate-100">
      {/* SECTION 2 & 3: HERO SECTION */}
      <section className="relative overflow-hidden py-16 lg:py-24 border-b border-cyan-500/15">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-mono uppercase tracking-wider">
              <Rocket className="w-3.5 h-3.5" /> NASA Space Apps Challenge 2026 — Junior Astronaut Mission Trainer
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              ASTROMISSION
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 mt-1 text-2xl sm:text-4xl">
                “Your Mission. Your Decisions. Your Survival.”
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Step into the command seat of humanity’s next frontier on the{' '}
              <strong className="text-white">Lunar South Pole</strong> or{' '}
              <strong className="text-white">Mars’ Jezero Crater</strong>. Balance closed-loop oxygen electrolysis,
              water recovery, solar power grids, radiation shielding, and hydroponic agriculture where every
              engineering decision creates real, interconnected consequences.
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleLaunchMission()}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-space-950 font-extrabold text-sm shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all"
              >
                <Rocket className="w-4 h-4" /> Start Mission
              </button>

              <a
                href="#explore-worlds"
                className="px-5 py-3.5 rounded-xl bg-space-800 hover:bg-space-700 border border-cyan-500/30 text-cyan-200 font-semibold text-sm flex items-center gap-2 transition-colors"
              >
                <Globe className="w-4 h-4 text-cyan-400" /> Explore Space
              </a>

              <a
                href="#how-it-works"
                className="px-5 py-3.5 rounded-xl bg-space-800 hover:bg-space-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-colors"
              >
                How to Play
              </a>

              <button
                type="button"
                onClick={() => setCommanderOpen(true)}
                className="px-5 py-3.5 rounded-xl bg-violet-600/25 hover:bg-violet-600/40 border border-violet-400/40 text-violet-200 font-semibold text-sm flex items-center gap-2 transition-colors"
              >
                <Bot className="w-4 h-4 text-cyan-400" /> Meet Your AI Commander
              </button>
            </div>

            {/* Key Telemetry Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {[
                { label: '7 Coupled Systems', sub: 'O2, H2O, Food, kWh, mSv' },
                { label: '12 3D Facilities', sub: 'Build, Upgrade & Repair' },
                { label: '15 Hazard Events', sub: 'Solar Storms & Dust Fronts' },
                { label: 'Voice Commander AI', sub: 'NASA-Referenced Mentor' },
              ].map((stat, i) => (
                <div key={i} className="p-3 rounded-xl bg-space-900/80 border border-slate-800">
                  <div className="font-bold text-sm text-cyan-300">{stat.label}</div>
                  <div className="text-[11px] text-slate-400">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Orbital Planet Showcase Card */}
          <div className="lg:col-span-5">
            <div className="glass-panel rounded-2xl p-6 space-y-5 relative overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                  Interactive Outpost Telemetry Preview
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-mono">
                  ECLSS LOOP ONLINE
                </span>
              </div>

              {/* Dual Planet Visual */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => handleLaunchMission('moon')}
                  className="cursor-pointer group p-4 rounded-xl bg-space-950/80 border border-slate-700 hover:border-cyan-400 transition-all text-center space-y-2"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-700 shadow-inner flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Moon className="w-9 h-9 text-space-950 opacity-75" />
                  </div>
                  <div className="font-bold text-sm text-white">LUNAR SOUTH POLE</div>
                  <p className="text-[11px] text-slate-400">
                    Shackleton Crater Rim • 0.166g • Vacuum • Grazing Solar Peaks & Crater Ice
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs text-cyan-400 font-semibold">
                    Deploy to Moon <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                <div
                  onClick={() => handleLaunchMission('mars')}
                  className="cursor-pointer group p-4 rounded-xl bg-space-950/80 border border-slate-700 hover:border-amber-400 transition-all text-center space-y-2"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-400 via-red-600 to-amber-900 shadow-inner flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Globe className="w-9 h-9 text-space-950 opacity-75" />
                  </div>
                  <div className="font-bold text-sm text-white">MARS JEZERO DELTA</div>
                  <p className="text-[11px] text-slate-400">
                    Jezero Basin • 0.378g • 95% CO2 • 68% Solar Flux & Regional Dust Storms
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold">
                    Deploy to Mars <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Coupled Systems Trade-off Callout */}
              <div className="p-3.5 rounded-xl bg-space-950/90 border border-cyan-500/30 text-xs space-y-1.5">
                <div className="font-mono text-cyan-300 uppercase text-[11px]">
                  Real Systems Engineering Trade-Off Example:
                </div>
                <p className="text-slate-300">
                  Constructing a <strong className="text-emerald-300">Hydroponic Greenhouse</strong> produces{' '}
                  <span className="text-emerald-400">+3.2 kg Food/day</span> and{' '}
                  <span className="text-cyan-300">+1.1 kg O2/day</span>, but consumes{' '}
                  <span className="text-amber-300">16 kWh/day electricity</span> and{' '}
                  <span className="text-sky-300">6.5 L/day water</span>. Without a Water Recycler and Battery Bank, it
                  will drain your base!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: EXPLORE THE MOON AND MARS */}
      <section id="explore-worlds" className="py-16 max-w-7xl mx-auto px-4 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
            Two Worlds, Distinct Physics
          </span>
          <h2 className="text-3xl font-bold text-white">Explore the Moon and Mars Scenarios</h2>
          <p className="text-sm text-slate-300">
            Each celestial body loads its own authentic environmental rules, solar irradiance curves, radiation
            baselines, and surface hazards.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 space-y-4 border-l-4 border-l-cyan-400">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Moon className="w-5 h-5 text-cyan-400" /> Artemis Shackleton Crater Outpost (Moon)
              </h3>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300">0.166g Vacuum</span>
            </div>
            <p className="text-sm text-slate-300">
              Located on the sunlit peaks of the Lunar South Pole overlooking permanently shadowed craters containing
              ancient water ice.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li>• <strong>Solar Challenge:</strong> High peak irradiance (100%), but periodic grazing-angle crater shadow periods drop solar power to 22%.</li>
              <li>• <strong>Radiation Hazard:</strong> Zero atmosphere means higher daily Galactic Cosmic Ray dose (1.35 mSv/day) and unbuffered Solar Particle Events.</li>
              <li>• <strong>Regolith Abrasion:</strong> Jagged, electrostatically charged lunar dust wears airlock seals and radiators rapidly.</li>
            </ul>
            <button
              type="button"
              onClick={() => handleLaunchMission('moon')}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold text-xs inline-flex items-center gap-1.5"
            >
              Configure Moon Mission <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-4 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" /> Ares Jezero Delta Research Base (Mars)
              </h3>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/20 text-amber-300">0.378g • 95% CO2</span>
            </div>
            <p className="text-sm text-slate-300">
              Situated in an ancient Martian river delta at 1.52 AU from the Sun, requiring high autonomy and
              long-endurance agricultural self-sufficiency.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li>• <strong>Solar Challenge:</strong> Baseline solar irradiance is 68% of lunar peak, and regional Martian dust storms choke solar output by another 58%.</li>
              <li>• <strong>Water & Agriculture:</strong> Subsurface glacier extraction and closed-loop recycling are vital to sustain Hydroponic Greenhouses.</li>
              <li>• <strong>Atmospheric Physics:</strong> Thin CO2 atmosphere provides modest radiation buffering (0.78 mSv/day) and MOXIE O2 extraction potential.</li>
            </ul>
            <button
              type="button"
              onClick={() => handleLaunchMission('mars')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-space-950 font-bold text-xs inline-flex items-center gap-1.5"
            >
              Configure Mars Mission <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 5, 6 & 7: HOW IT WORKS, MISSION CHALLENGES & EDUCATIONAL OBJECTIVES */}
      <section id="how-it-works" className="py-16 bg-space-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Interactive Simulation Loop
            </span>
            <h2 className="text-3xl font-bold text-white">How ASTROMISSION Works</h2>
            <p className="text-sm text-slate-300">
              Every mission day executes a 16-step deterministic physics and systems-engineering balance on the server.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                step: '01',
                title: 'Configure & Brief',
                desc: 'Select Moon or Mars, choose crew size (2–8), mission duration, difficulty, and starting supply allocation.',
              },
              {
                step: '02',
                title: 'Construct & Upgrade in 3D',
                desc: 'Place Solar Arrays, Battery Banks, O2 Generators, Water Recyclers, Greenhouses, and Radiation Shelters in 3D.',
              },
              {
                step: '03',
                title: 'Respond to Emergencies',
                desc: 'Make engineering trade-off decisions during Solar Particle Events, Martian Dust Storms, and equipment faults.',
              },
              {
                step: '04',
                title: 'Analyze & Learn with AI',
                desc: 'Consult COMMANDER AI by text or voice, complete NASA learning quizzes, and review weighted mission analytics.',
              },
            ].map((item) => (
              <div key={item.step} className="glass-panel rounded-xl p-5 space-y-2">
                <span className="font-mono text-2xl font-extrabold text-cyan-400">{item.step}</span>
                <h3 className="font-bold text-base text-white">{item.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* 7 Interconnected Resource Systems */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white text-center">
              7 Interconnected Engineering Systems You Must Balance
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Wind, title: '1. Breathable Oxygen (kg)', text: '0.84 kg/crew/day demand. Produced by water electrolysis (OGA) and greenhouse photosynthesis.' },
                { icon: Droplets, title: '2. Potable Water (L)', text: '3.5 L/crew/day + electrolysis & crop irrigation. Recycled up to 95% via WPA + rover ice mining.' },
                { icon: Sprout, title: '3. Food & Agriculture (kg)', text: '0.62 kg/crew/day. Hydroponic Greenhouses grow fresh crops but demand high LED power and water.' },
                { icon: Zap, title: '4. Electrical Energy (kWh)', text: 'Generated by Solar Arrays, buffered in Battery Banks, and prioritized across Tier 1–3 loads.' },
                { icon: ShieldAlert, title: '5. Radiation Protection', text: 'Tracks both Habitat/Shelter Shielding (%) and Cumulative Crew Exposure (mSv) during solar flares.' },
                { icon: HeartPulse, title: '6. Crew Health & Safety', text: 'Transparent indicator driven by life-support adequacy, radiation dose, and Medical Bay care.' },
                { icon: Cpu, title: '7. Infrastructure Condition', text: 'Planetary dust and thermal cycling degrade modules daily unless serviced by the Workshop.' },
                { icon: Award, title: 'Weighted Mission Scoring', text: 'Rewards sustainable balance, crew safety, and science discovery—not idle resource hoarding.' },
              ].map((sys, idx) => {
                const Icon = sys.icon;
                return (
                  <div key={idx} className="p-4 rounded-xl bg-space-950/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                      <Icon className="w-4 h-4 text-cyan-400" /> {sys.title}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{sys.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8, 9 & 10: AI COMMANDER, VOICE & LEARNING OUTCOMES */}
      <section className="py-16 max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-4">
          <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
            AI Space Mission Specialist
          </span>
          <h2 className="text-3xl font-bold text-white">Meet COMMANDER AI — With Voice Interaction</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            COMMANDER AI inspects your actual live mission telemetry—never inventing fake numbers—and explains the
            science behind your outpost’s bottlenecks using structured engineering trade-offs and spoken voice answers.
          </p>
          <ul className="space-y-2 text-xs text-slate-200">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Structured 5-part responses: Situation, Explanation, Options, Trade-Offs, and NASA Learning Fact.
            </li>
            <li className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-cyan-400 shrink-0" />
              Integrated Speech-to-Text microphone input and Text-to-Speech voice narration with full text fallback.
            </li>
            <li className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-400 shrink-0" />
              Advises and educates without taking control away from the student commander.
            </li>
          </ul>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCommanderOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-2"
            >
              <Bot className="w-4 h-4" /> Open Commander AI Now
            </button>
            <Link
              to="/learning"
              className="px-5 py-2.5 rounded-xl bg-space-800 hover:bg-space-700 text-cyan-300 border border-cyan-500/30 font-semibold text-xs flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Explore Learning Center
            </Link>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="text-xs font-mono uppercase text-cyan-400">
            Educational Learning Outcomes & Role-Based Platform
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-space-950 border border-slate-800">
              <div className="font-bold text-white mb-1">For Students</div>
              <p className="text-slate-400">
                Play as Guest or Cadet, command 3D bases, earn 10 Achievement Badges, and master NASA STEM quizzes.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-space-950 border border-slate-800">
              <div className="font-bold text-white mb-1">For Educators</div>
              <p className="text-slate-400">
                Create classrooms with join codes, assign Moon/Mars labs, and compare student learning reports.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-space-950 border border-slate-800">
              <div className="font-bold text-white mb-1">For Administrators</div>
              <p className="text-slate-400">
                Configure mission scenarios, manage user roles, monitor platform health, and audit changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 11 & 12: ABOUT THE PROJECT & NASA SCIENTIFIC REFERENCES */}
      <section className="py-14 bg-space-900/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase text-cyan-400">Scientific Credibility Policy</span>
              <h2 className="text-2xl font-bold text-white">Verified NASA Technical & Educational References</h2>
            </div>
            <Link to="/learning" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              View All Modules & Quizzes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {references.map((ref) => (
              <div key={ref.id} className="p-4 rounded-xl bg-space-950/90 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-cyan-300 mb-1">{ref.topic}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{ref.relevant_explanation}</p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 truncate max-w-[70%]">{ref.source_name}</span>
                  <a
                    href={ref.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    NASA Source <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 text-center pt-2">
            Scientific Disclaimer: ASTROMISSION is an independent educational engineering simulation created for the
            NASA Space Apps Challenge 2026. Simulation parameters are game-balanced abstractions inspired by published
            NASA ECLSS, Artemis, and Mars reference literature and do not represent official NASA endorsement or
            operational flight predictions.
          </p>
        </div>
      </section>

      {/* SECTION 13: FOOTER */}
      <footer className="py-8 bg-space-950 border-t border-slate-900 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <strong className="text-white">ASTROMISSION</strong> — Junior Astronaut Mission Trainer •{' '}
            <span>“Your Mission. Your Decisions. Your Survival.”</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/missions" className="hover:text-cyan-400">Missions</Link>
            <Link to="/learning" className="hover:text-cyan-400">Learning Center</Link>
            <Link to="/analytics" className="hover:text-cyan-400">Analytics</Link>
            <Link to="/classrooms" className="hover:text-cyan-400">Classrooms</Link>
            <Link to="/auth" className="hover:text-cyan-400">Sign In / Demo Roles</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
