import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  Users,
  ClipboardList,
  Download,
  Rocket,
  KeyRound,
} from 'lucide-react';
import { api } from '../services/api';
import { useMissionStore } from '../store/useMissionStore';

export const ClassroomPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, ensureAuthenticatedOrGuest, setActiveSession, showToast } = useMissionStore();

  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState('ASTRO2026');

  // Create classroom form (for teachers)
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('Grades 7-12');

  // Create assignment form
  const [assignTitle, setAssignTitle] = useState('');
  const [assignPlanet, setAssignPlanet] = useState<'moon' | 'mars'>('moon');
  const [assignDiff, setAssignDiff] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const [assignDays, setAssignDays] = useState(10);

  const loadClassrooms = async () => {
    await ensureAuthenticatedOrGuest();
    const list = await api.getClassrooms();
    setClassrooms(list);
    if (list.length > 0) {
      await selectClassroom(list[0].id);
    }
  };

  const selectClassroom = async (clsId: string) => {
    try {
      const details = await api.getClassroomDetails(clsId);
      setSelectedClassroom(details);
      try {
        const rep = await api.getClassroomReports(clsId);
        setReports(rep.student_reports || []);
      } catch {
        setReports([]);
      }
    } catch (err: any) {
      showToast('Classroom Notice', err.message, 'warning');
    }
  };

  useEffect(() => {
    loadClassrooms().catch(() => {});
  }, [user?.id]);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ensureAuthenticatedOrGuest();
      const res = await api.joinClassroom(joinCode);
      showToast('Joined Classroom!', `Enrolled in ${res.classroom_name} (${res.join_code})`, 'success');
      await loadClassrooms();
    } catch (err: any) {
      showToast('Join Error', err.message, 'critical');
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const created = await api.createClassroom({
        name: newClassName,
        description: newClassDesc,
        grade_level: newClassGrade,
        learning_objectives: ['Master ECLSS closed-loop trade-offs', 'Complete Moon & Mars missions'],
      });
      setNewClassName('');
      setNewClassDesc('');
      showToast('Classroom Created!', `Join Code: ${created.join_code}`, 'success');
      await loadClassrooms();
      await selectClassroom(created.id);
    } catch (err: any) {
      showToast('Creation Failed', err.message, 'critical');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroom || !assignTitle.trim()) return;
    try {
      await api.createAssignment(selectedClassroom.id, {
        mission_id: assignPlanet === 'moon' ? 'moon-shackleton-outpost' : 'mars-jezero-colony',
        title: assignTitle,
        planet: assignPlanet,
        difficulty: assignDiff,
        target_duration_days: assignDays,
        learning_objectives: [
          `Complete ${assignDays}-day ${assignPlanet.toUpperCase()} mission`,
          'Maintain crew survival and positive resource balance',
        ],
      });
      setAssignTitle('');
      showToast('Mission Assigned!', 'Students can now launch this scenario from their classroom.', 'success');
      await selectClassroom(selectedClassroom.id);
    } catch (err: any) {
      showToast('Assignment Error', err.message, 'critical');
    }
  };

  const handleLaunchAssignment = async (asgn: any) => {
    try {
      await ensureAuthenticatedOrGuest();
      const session = await api.createSession({
        mission_id: asgn.mission_id,
        mission_name: asgn.title,
        difficulty: asgn.difficulty,
        target_duration_days: asgn.target_duration_days,
        crew_size: 4,
        supply_preset: 'balanced',
        classroom_assignment_id: asgn.id,
      });
      setActiveSession(session);
      navigate(`/mission-control/${session.id}`);
    } catch (err: any) {
      showToast('Launch Error', err.message, 'critical');
    }
  };

  const handleExportCSV = () => {
    if (!reports.length) return;
    const headers = ['Student Name,Missions Attempted,Missions Completed,Average Score,Quizzes Completed,Learning Points'];
    const rows = reports.map(
      (r) =>
        `"${r.display_name}",${r.missions_attempted},${r.missions_completed},${r.average_mission_score},${r.quizzes_completed},${r.learning_points}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `astromission_classroom_${selectedClassroom?.join_code || 'report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const switchToTeacherDemo = async () => {
    try {
      const res = await api.login('teacher@astromission.edu', 'TeacherPassword123!');
      setUser(res.user);
      showToast('Educator Mode Active', 'Signed in as Dr. Elena Sagan (Teacher)', 'success');
    } catch (err: any) {
      showToast('Login Error', err.message, 'critical');
    }
  };

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div className="min-h-screen cosmic-bg py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
              STEM Educator & Student Classroom Hub
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1 flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-cyan-400" /> Classroom & Assigned Missions
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Join a classroom with a code (e.g., <code className="text-cyan-300 font-mono">ASTRO2026</code>) or switch
              to Educator Mode to create classes, assign Moon/Mars labs, and compare student learning outcomes.
            </p>
          </div>

          {!isTeacherOrAdmin && (
            <button
              type="button"
              onClick={switchToTeacherDemo}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" /> Switch to Demo Teacher Account
            </button>
          )}
        </div>

        {/* Join by Code Bar + Teacher Create Classroom */}
        <div className="grid lg:grid-cols-12 gap-6">
          <form onSubmit={handleJoinByCode} className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-3">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> Join Classroom with Code
            </h2>
            <p className="text-xs text-slate-400">
              Enter your teacher’s classroom code (try demo code <code className="text-cyan-300">ASTRO2026</code>):
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ASTRO2026"
                className="flex-1 bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono text-white uppercase"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold text-xs"
              >
                Join Class
              </button>
            </div>
          </form>

          {isTeacherOrAdmin && (
            <form onSubmit={handleCreateClassroom} className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-3">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-violet-400" /> Educator: Create a New Classroom
              </h2>
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Classroom Name (e.g., AP Physics Space Lab)"
                  className="bg-space-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
                <input
                  type="text"
                  value={newClassGrade}
                  onChange={(e) => setNewClassGrade(e.target.value)}
                  placeholder="Grades 8-12"
                  className="bg-space-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs"
                >
                  Create & Generate Code
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Enrolled / Managed Classrooms */}
        {classrooms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {classrooms.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectClassroom(c.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedClassroom?.id === c.id
                    ? 'bg-cyan-500 text-space-950 border-cyan-400'
                    : 'bg-space-900 text-slate-300 border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                {c.name} <span className="font-mono opacity-80">({c.join_code})</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected Classroom Details */}
        {selectedClassroom && (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left: Assigned Missions */}
            <div className="lg:col-span-6 space-y-6">
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedClassroom.name}</h2>
                    <p className="text-xs text-slate-400">{selectedClassroom.description}</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-space-950 border border-cyan-500/40 font-mono text-xs text-cyan-300">
                    Code: <strong>{selectedClassroom.join_code}</strong>
                  </div>
                </div>

                <h3 className="text-xs font-mono uppercase text-cyan-400 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4" /> Assigned Classroom Missions ({selectedClassroom.assignments?.length || 0})
                </h3>

                <div className="space-y-3">
                  {(selectedClassroom.assignments || []).map((asgn: any) => (
                    <div
                      key={asgn.id}
                      className="p-4 rounded-xl bg-space-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-white">{asgn.title}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          Planet: <span className="text-cyan-300 uppercase">{asgn.planet}</span> • Difficulty:{' '}
                          <span className="capitalize">{asgn.difficulty}</span> • Duration: {asgn.target_duration_days} Days
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLaunchAssignment(asgn)}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Rocket className="w-3.5 h-3.5" /> Launch Lab
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher Assignment Creator */}
              {isTeacherOrAdmin && (
                <form onSubmit={handleCreateAssignment} className="glass-panel rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-sm text-white">Assign New Mission Scenario to Class</h3>
                  <input
                    type="text"
                    required
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="Assignment Title (e.g., Week 3: Lunar Radiation Storm Triage)"
                    className="w-full bg-space-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      value={assignPlanet}
                      onChange={(e) => setAssignPlanet(e.target.value as 'moon' | 'mars')}
                      className="bg-space-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="moon">Moon (Shackleton)</option>
                      <option value="mars">Mars (Jezero)</option>
                    </select>
                    <select
                      value={assignDiff}
                      onChange={(e) => setAssignDiff(e.target.value as any)}
                      className="bg-space-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                    <input
                      type="number"
                      min={5}
                      max={30}
                      value={assignDays}
                      onChange={(e) => setAssignDays(Number(e.target.value))}
                      className="bg-space-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs"
                  >
                    Publish Mission Assignment
                  </button>
                </form>
              )}
            </div>

            {/* Right: StudentRoster & Teacher Performance Comparison Report */}
            <div className="lg:col-span-6 glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white">
                  {isTeacherOrAdmin ? 'Student Performance Comparison Report' : 'Classroom Roster'}
                </h3>
                {isTeacherOrAdmin && reports.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 rounded-lg bg-space-800 hover:bg-space-700 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV Report
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase">
                      <th className="py-2 px-2.5">Student</th>
                      <th className="py-2 px-2.5">Completed</th>
                      {isTeacherOrAdmin && <th className="py-2 px-2.5">Avg Score</th>}
                      {isTeacherOrAdmin && <th className="py-2 px-2.5">Quizzes</th>}
                      <th className="py-2 px-2.5">Learning Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {(isTeacherOrAdmin && reports.length > 0 ? reports : selectedClassroom.members || []).map(
                      (st: any) => (
                        <tr key={st.student_id}>
                          <td className="py-2.5 px-2.5 font-semibold text-white">{st.display_name}</td>
                          <td className="py-2.5 px-2.5 font-mono text-emerald-400">{st.missions_completed}</td>
                          {isTeacherOrAdmin && (
                            <td className="py-2.5 px-2.5 font-mono text-cyan-300">
                              {st.average_mission_score ?? 0}
                            </td>
                          )}
                          {isTeacherOrAdmin && (
                            <td className="py-2.5 px-2.5 font-mono">{st.quizzes_completed ?? 0}</td>
                          )}
                          <td className="py-2.5 px-2.5 font-mono text-violet-300">{st.learning_points}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

