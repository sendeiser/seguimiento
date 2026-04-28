import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GraduationCap, Users, Clock, Trophy, LayoutGrid, List, Search, Pin, PinOff, History, CheckCircle2, TrendingUp, Sparkles, Medal, Flame, Heart, ChevronRight } from "lucide-react";
import { calculateGamification } from "../../lib/gamificationEngine";
import AchievementToast from "../../components/AchievementToast";
import StudentCard from "../../components/gamification/StudentCard";

export default function PublicClassView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [viewMode, setViewMode] = useState("cards"); // Always cards by default for public
  const [searchTerm, setSearchTerm] = useState("");
  const [pinnedStudent, setPinnedStudent] = useState(null);
  const [sessionFilter, setSessionFilter] = useState("latest"); // "latest", "all", or session.id
  const [animKey, setAnimKey] = useState(0);
  const [newBadges, setNewBadges] = useState([]);

  useEffect(() => {
    // Load pinned student from local storage
    const saved = localStorage.getItem(`pinned_${token}`);
    if (saved) setPinnedStudent(saved);
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchData = async () => {
    const { data: result, error: rpcError } = await supabase.rpc("get_class_live_data", { p_token: token });
    if (rpcError || result?.error) {
      setError(rpcError?.message || result?.error);
      setLoading(false);
      return;
    }
    setData(result);
    setLastUpdated(new Date());
    setLoading(false);

    // --- Achievement detection ---
    // Only check for the pinned student (or first student) to avoid spamming
    const students = result?.students || [];
    const sessions = result?.sessions || [];
    if (students.length > 0 && sessions.length > 0) {
      const targetStudent = students.find(s => s.cs_id === localStorage.getItem(`pinned_${token}`)) || students[0];
      if (targetStudent) {
        const gami = calculateGamification(
          sessions,
          targetStudent.grades,
          targetStudent.attendance,
          targetStudent.spent_coins || 0
        );
        const seenKey = `seen_badges_${token}_${targetStudent.cs_id}`;
        const seen = JSON.parse(localStorage.getItem(seenKey) || "[]");
        const fresh = gami.unlockedBadges.filter(b => b.unlocked && !seen.includes(b.id));
        if (fresh.length > 0) {
          setNewBadges(fresh);
          localStorage.setItem(seenKey, JSON.stringify([
            ...seen,
            ...fresh.map(b => b.id)
          ]));
        }
      }
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="text-center relative z-10 flex flex-col items-center">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
          <GraduationCap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600" />
        </div>
        <p className="text-slate-800 font-black text-2xl tracking-tight">Sincronizando Aula...</p>
        <p className="text-slate-500 font-medium mt-2">Conectando con el docente en vivo</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-300/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="text-center bg-white/80 backdrop-blur-2xl p-12 rounded-[40px] border border-slate-200 shadow-2xl shadow-slate-200/50 max-w-md relative z-10">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl mx-auto flex items-center justify-center mb-8 rotate-12 shadow-inner border border-red-100">
          <span className="text-5xl">🔗</span>
        </div>
        <h2 className="text-3xl font-black mb-3 text-slate-800 tracking-tight">Acceso Denegado</h2>
        <p className="text-slate-500 mb-10 font-medium text-base leading-relaxed">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-slate-900 hover:bg-black text-white w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]">
          Reintentar conexión
        </button>
      </div>
    </div>
  );

  // Flatten all criteria across all sessions (overall history)
  const allCriteria = [];
  const sortedSessions = [...(data.sessions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sortedSessions.forEach(session => {
    (session.criteria || []).forEach(crit => {
      allCriteria.push({ ...crit, sessionDate: session.date });
    });
  });

  // Calculate visible items based on session filter
  const visibleSessions = sessionFilter === "all" 
    ? sortedSessions 
    : (sessionFilter === "latest" 
        ? (sortedSessions.length > 0 ? [sortedSessions[0]] : []) 
        : sortedSessions.filter(s => s.id === sessionFilter));

  const visibleCriteria = [];
  visibleSessions.forEach(session => {
    (session.criteria || []).forEach(crit => {
      visibleCriteria.push({ ...crit, sessionDate: session.date });
    });
  });

  const students = data.students || [];

  // Calculate totals and raw XP per student (Pass 1)
  const studentsWithRawXP = students.map(st => {
    const gamiRaw = calculateGamification(sortedSessions, st.grades, st.attendance, st.spent_coins || 0);
    return { ...st, gamiRaw };
  });

  const maxXP = Math.max(...studentsWithRawXP.map(s => s.gamiRaw.currentXP), 0);

  // Calculate final gamification data (Pass 2 - Relative)
  const studentTotals = studentsWithRawXP.map(st => {
    const total = visibleCriteria.reduce((sum, crit) => {
      const score = st.grades?.[crit.id];
      return sum + (score != null ? Number(score) : 0);
    }, 0);
    const max = visibleCriteria.reduce((sum, crit) => sum + (crit.max_score || 0), 0);
    
    const overallTotal = allCriteria.reduce((sum, crit) => {
      const score = st.grades?.[crit.id];
      return sum + (score != null ? Number(score) : 0);
    }, 0);

    const gami = calculateGamification(sortedSessions, st.grades, st.attendance, st.spent_coins || 0, maxXP);

    return { ...st, total, max, overallTotal, gami };
  });

  // Sort students: pinned first, then highest overall total (to keep ranking stable)
  const sortedStudents = [...studentTotals].sort((a, b) => {
    if (a.cs_id === pinnedStudent) return -1;
    if (b.cs_id === pinnedStudent) return 1;
    return b.overallTotal - a.overallTotal;
  });

  const filteredStudents = sortedStudents.filter(st => 
    st.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const togglePin = (csId) => {
    const newVal = pinnedStudent === csId ? null : csId;
    setPinnedStudent(newVal);
    if (newVal) localStorage.setItem(`pinned_${token}`, newVal);
    else localStorage.removeItem(`pinned_${token}`);
  };

  const getScoreBadge = (score, max) => {
    if (score == null) return "text-slate-400 bg-slate-50 border-slate-200/60";
    const pct = max > 0 ? score / max : 0;
    if (pct >= 0.8) return "text-emerald-700 bg-emerald-50 border-emerald-200/80 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/10";
    if (pct >= 0.6) return "text-amber-700 bg-amber-50 border-amber-200/80 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/10";
    return "text-rose-700 bg-rose-50 border-rose-200/80 shadow-[0_0_15px_-3px_rgba(225,29,72,0.15)] ring-1 ring-rose-500/10";
  };

  const calculateOverallPercentage = (total, max) => {
    if (max === 0) return 0;
    return Math.round((total / max) * 100);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-200 relative">
      
      {/* Modern Mesh Gradient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/10 blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/10 blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-cyan-400/10 blur-[120px] mix-blend-multiply" />
      </div>

      {/* Glassmorphic Header */}
      <header className="bg-white/70 backdrop-blur-2xl border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 md:py-5 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3.5 rounded-[20px] shadow-lg shadow-blue-600/20 flex-shrink-0 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <GraduationCap className="w-8 h-8 text-white relative z-10" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-black text-2xl md:text-3xl tracking-tight text-slate-800 truncate">
                {data.class_name}
              </h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <div className="flex items-center gap-2 text-[10px] md:text-xs font-black text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200/50">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  AULA EN VIVO
                </div>
                {lastUpdated && (
                  <span className="text-[10px] md:text-xs text-slate-500 font-bold tracking-wide flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Actualizado {format(lastUpdated, "HH:mm")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-[320px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar tu libreta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-base font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-slate-300 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
            
            <div className="relative shrink-0">
               <History className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
               <select 
                 value={sessionFilter}
                 onChange={(e) => { setSessionFilter(e.target.value); setAnimKey(k => k + 1); }}
                 className="appearance-none bg-white border-2 border-slate-200 rounded-2xl py-3 pl-12 pr-10 text-sm font-black text-slate-700 outline-none focus:border-blue-500 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
               >
                 <option value="latest">Clase de Hoy</option>
                 <option value="all">Todo el Semestre</option>
                 <optgroup label="Seleccionar Fecha">
                   {sortedSessions.map(s => (
                     <option key={s.id} value={s.id}>
                       {format(new Date(s.date + "T12:00:00"), "d 'de' MMMM", { locale: es })}
                     </option>
                   ))}
                 </optgroup>
               </select>
               <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                 <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
               </div>
            </div>
            
            {/* Desktop & Mobile View Toggles */}
            <div className="flex bg-slate-100 p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-slate-200">
               <button 
                  onClick={() => setViewMode("table")}
                  className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all flex items-center gap-1 ${viewMode === "table" ? "bg-white text-blue-600 shadow-sm font-bold" : "text-slate-500 hover:text-slate-700 font-medium"}`}
                  title="Vista de Tabla"
                >
                  <List className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-[10px] md:hidden uppercase tracking-wider font-black">Planilla</span>
                </button>
                <button 
                  onClick={() => setViewMode("cards")}
                  className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all flex items-center gap-1 ${viewMode === "cards" ? "bg-white text-blue-600 shadow-sm font-bold" : "text-slate-500 hover:text-slate-700 font-medium"}`}
                  title="Vista de Libretas"
                >
                  <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-[10px] md:hidden uppercase tracking-wider font-black">Tarjetas</span>
                </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-[1400px]">
        {allCriteria.length === 0 || students.length === 0 ? (
          <div className="text-center py-20 lg:py-32 flex flex-col items-center bg-white/50 backdrop-blur-xl rounded-[40px] shadow-xl shadow-slate-200/40 border border-white max-w-2xl mx-auto">
            <div className="bg-slate-100 w-28 h-28 rounded-full flex items-center justify-center mb-8 relative border-4 border-white shadow-xl">
              <Clock className="w-12 h-12 text-slate-400" />
              <div className="absolute top-0 right-0 w-8 h-8 bg-blue-100 rounded-full border-4 border-white flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tight mb-3">Aula sin evaluar</p>
            <p className="text-slate-500 max-w-sm text-lg font-medium leading-relaxed">El docente aún no ha registrado calificaciones en esta clase. ¡Pronto aparecerán aquí!</p>
          </div>
        ) : viewMode === "table" ? (
          /* Table View - Modernized */
          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] md:rounded-[40px] border border-white shadow-2xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-200/50">
            <div className="overflow-x-auto">
              <table className="w-full text-base border-collapse table-fixed md:table-auto">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="text-left px-2 md:px-8 py-2 md:py-6 font-black text-[9px] md:text-xs uppercase tracking-widest text-slate-500 sticky left-0 bg-slate-50/90 backdrop-blur-md z-20 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)] w-[90px] md:w-auto">
                      ALUMNO
                    </th>
                    {(visibleSessions).map(session => (
                      <th
                        key={session.id}
                        colSpan={(session.criteria || []).length}
                        className="px-1 md:px-6 py-2 md:py-4 text-center text-[8px] md:text-xs uppercase tracking-widest font-black text-slate-500 border-l border-slate-200/60"
                      >
                        <div className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2">
                          <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-blue-500 hidden sm:block" />
                          <span className="truncate max-w-[50px] md:max-w-none leading-tight">{format(new Date(session.date + "T12:00:00"), "d MMM", { locale: es })}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-2 md:px-8 py-2 md:py-6 text-center text-[9px] md:text-xs uppercase tracking-widest font-black text-blue-600 bg-blue-50/80 border-l-2 border-blue-100 sticky right-0 z-20 shadow-[-2px_0_10px_-4px_rgba(0,0,0,0.1)] w-[50px] md:w-auto">
                      TOTAL
                    </th>
                  </tr>
                  <tr className="border-b-2 border-slate-200 bg-white">
                    <th className="sticky left-0 bg-white z-20 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)]" />
                    {visibleCriteria.map(crit => (
                      <th key={crit.id} className="px-1 md:px-6 py-1.5 md:py-4 text-center border-l border-slate-100 min-w-[35px] md:min-w-[140px] w-[35px] md:w-auto">
                        <div className="text-[8px] md:text-xs font-black text-slate-700 uppercase tracking-tight md:tracking-wide truncate max-w-[32px] md:max-w-[130px] mx-auto leading-tight" title={crit.name}>{crit.name}</div>
                        <div className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter md:tracking-widest mt-0.5 md:mt-1.5 flex items-center justify-center gap-0.5">
                          <Trophy className="hidden md:block w-3 h-3" /> <span className="hidden md:inline">Máx</span> {crit.max_score}
                        </div>
                      </th>
                    ))}
                    <th className="sticky right-0 bg-blue-50/90 backdrop-blur-md border-l-2 border-blue-100 z-20 shadow-[-2px_0_10px_-4px_rgba(0,0,0,0.1)]" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student, idx) => {
                    const pct = calculateOverallPercentage(student.total, student.max);
                    // Abbreviate name on mobile to save horizontal space exactly as requested
                    const names = student.name.split(" ");
                    const mobileName = names.length > 1 ? `${names[0]} ${names[1][0]}.` : names[0];
                    return (
                    <tr
                      key={student.cs_id}
                      onClick={() => student.token && navigate(`/live/${student.token}`)}
                      className={`cursor-pointer transition-colors group hover:bg-slate-50/80 ${student.cs_id === pinnedStudent ? "bg-blue-50/40" : "bg-transparent"}`}
                    >
                      <td className={`px-2 md:px-8 py-2 md:py-5 sticky left-0 z-10 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)] transition-colors group-hover:bg-white w-[90px] md:w-[300px] overflow-hidden ${student.cs_id === pinnedStudent ? "bg-blue-50/90" : "bg-white"}`}>
                        <div className="flex items-center gap-1 md:gap-4">
                          <button 
                            onClick={(e) => { e.stopPropagation(); togglePin(student.cs_id); }}
                            className={`p-1 md:p-1.5 rounded-lg md:rounded-xl transition-all outline-none ${student.cs_id === pinnedStudent ? "text-blue-600 bg-white md:shadow-md" : "text-slate-300 hover:text-blue-600 hover:bg-blue-50"}`}
                            title={student.cs_id === pinnedStudent ? "Desfijar" : "Fijar"}
                          >
                            {student.cs_id === pinnedStudent ? <Pin className="w-3 h-3 md:w-5 md:h-5 fill-current" /> : <PinOff className="w-3 h-3 md:w-5 md:h-5" />}
                          </button>
                          
                          <div className={`hidden md:flex w-10 h-10 rounded-[14px] items-center justify-center text-sm font-black shadow-sm flex-shrink-0 ${
                            student.cs_id === pinnedStudent ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/30" :
                            idx === 0 ? "bg-gradient-to-br from-yellow-100 to-amber-100 text-amber-700 border-2 border-amber-200" :
                            idx === 1 ? "bg-gradient-to-br from-slate-100 to-gray-200 text-slate-700 border-2 border-slate-300" :
                            idx === 2 ? "bg-gradient-to-br from-orange-100 to-rose-100 text-orange-800 border-2 border-orange-200" :
                            "bg-slate-50 text-slate-500 border border-slate-200"
                          }`}>
                            {idx < 3 && student.cs_id !== pinnedStudent ? <Medal className="w-5 h-5" /> : idx + 1}
                          </div>
                          
                          <div className="flex flex-col justify-center min-w-0">
                            <span 
                              className={`font-black text-[10px] md:text-xl truncate leading-tight block w-full ${student.cs_id === pinnedStudent ? "text-blue-800" : "text-slate-700"}`}
                              title={student.name}
                            >
                              <span className="md:hidden">{mobileName}</span>
                              <span className="hidden md:inline">{student.name}</span>
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest hidden lg:inline ${student.gami?.rank?.color || 'text-slate-400'}`}>Nv. {student.gami?.currentLevel || 1}</span>
                              {student.gami?.streak >= 3 && (
                                <span className="flex items-center gap-0.5 text-[8px] font-black text-orange-600 bg-orange-100 px-1 py-0.5 rounded-full uppercase tracking-wider">
                                   <Flame className="w-2.5 h-2.5 fill-orange-500" />
                                   {student.gami.streak}
                                </span>
                              )}
                              {student.gami?.hp <= 30 && (
                                <span className="flex items-center gap-0.5 text-[8px] font-black text-red-600 bg-red-100 px-1 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                   <Heart className="w-2.5 h-2.5 fill-red-500" /> {student.gami.hp}
                                </span>
                              )}
                            </div>
                            {/* Mobile Rank Indicator */}
                            {idx < 3 && student.cs_id !== pinnedStudent && (
                              <span className="md:hidden text-[7px] font-black uppercase tracking-widest text-amber-600 truncate mt-0.5">Top #{idx + 1}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {visibleCriteria.map(crit => {
                        const score = student.grades?.[crit.id];
                        return (
                          <td key={crit.id} className="px-0.5 md:px-6 py-2 md:py-6 text-center border-l border-slate-100/60 transition-colors group-hover:bg-slate-50/30">
                            {score != null ? (
                              <div className={`mx-auto flex items-center justify-center min-w-[1.25rem] w-6 h-6 md:w-14 md:h-12 md:min-w-[3.5rem] rounded md:rounded-xl border md:border-2 ${getScoreBadge(score, crit.max_score)}`}>
                                <span className="font-black text-[10px] md:text-xl tracking-tighter leading-none">{score}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold text-[10px] md:text-xl">—</span>
                            )}
                          </td>
                        );
                      })}
                      
                      <td className={`px-1 md:px-8 py-2 md:py-5 border-l-2 sticky right-0 z-10 shadow-[-2px_0_10px_-4px_rgba(0,0,0,0.1)] transition-colors w-[50px] md:w-[140px] ${student.cs_id === pinnedStudent ? "bg-blue-50/90 border-blue-300" : "bg-blue-50 group-hover:bg-blue-100/50 border-blue-200"}`}>
                        <div className="flex flex-col h-full justify-center md:text-left text-center">
                           <div className="flex flex-col md:flex-row md:items-baseline md:justify-between mb-0.5 md:mb-2 items-center">
                             <div className="flex items-baseline justify-center md:justify-start gap-0.5">
                               <span className="font-black text-xs md:text-3xl tracking-tighter text-blue-700 leading-none">
                                {student.total}
                               </span>
                               <span className="text-[11px] font-black uppercase text-blue-400 tracking-widest leading-none hidden md:inline">/ {student.max}</span>
                             </div>
                             <span className="text-[8px] md:text-sm font-black text-blue-600 md:bg-white md:px-2 py-0.5 rounded md:rounded-lg md:border md:border-blue-100 shadow-[none] md:shadow-sm mt-0 md:mt-0">{pct}%</span>
                           </div>
                           
                           {/* Mini Progress Bar in Table */}
                           <div className="w-full bg-blue-200/50 rounded-full h-0.5 md:h-1.5 overflow-hidden">
                             <div 
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full relative" 
                                style={{ width: `${pct}%` }}
                              />
                           </div>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards View for Mobile/Alternative - Ultra Premium Aesthetic */
          <div key={animKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
            {filteredStudents.map((st, idx) => {
              const pct = calculateOverallPercentage(st.total, st.max);
              const isPinned = st.cs_id === pinnedStudent;
              const isTop3 = idx < 3 && !isPinned;

              return (
                <StudentCard 
                  key={st.cs_id}
                  student={{...st, pct}}
                  isPinned={isPinned}
                  isTop3={isTop3}
                  rankIndex={idx}
                  onClick={() => st.token && navigate(`/live/${st.token}`)}
                />
              );
            })}
          </div>
        )}

        {/* Selected Student Details (When pinned) */}
        {pinnedStudent && (() => {
          const st = data.students.find(s => s.cs_id === pinnedStudent);
          if (!st) return null;
          const pct = calculateOverallPercentage(st.total, st.max);
          
          return (
            <div className="mt-12 lg:mt-16 bg-white/90 backdrop-blur-xl rounded-[32px] p-6 md:p-8 shadow-2xl border-t-4 border-blue-500 relative overflow-hidden animate-spring">
                
                {/* Divider */}
                <div className="mx-6 my-4 border-t-2 border-dashed border-slate-100" />

                {/* Grades Section */}
                <div className="px-6 pb-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                     <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       {sessionFilter === "all" ? <History className="w-4 h-4 text-blue-500" /> : <TrendingUp className="w-4 h-4 text-blue-500" />  }
                       {sessionFilter === "all" ? "Historial Académico" : "Rendimiento Seleccionado"}
                     </p>
                  </div>
                  
                  <div className={`content-start relative ${sessionFilter === "all" ? 'max-h-[340px] overflow-y-auto pr-2 custom-scrollbar' : 'grid grid-cols-1 gap-3'}`}>
                    
                    {sessionFilter === "all" ? (
                      /* AESTHETIC TIMELINE VIEW FOR HISTORY */
                      <div className="relative pt-2">
                        {/* Continuous Timeline Line */}
                        <div className="absolute top-4 bottom-4 left-[15px] w-0.5 bg-gradient-to-b from-blue-200 via-slate-200 to-transparent rounded-full" />
                        
                        {Object.entries(
                          visibleCriteria.reduce((acc, crit) => {
                            if (!acc[crit.sessionDate]) acc[crit.sessionDate] = [];
                            acc[crit.sessionDate].push(crit);
                            return acc;
                          }, {})
                        )
                        .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
                        .map(([date, criteriaGrouping], groupIdx) => (
                          <div key={date} className="relative mb-6 last:mb-0">
                            {/* Timeline Date Header */}
                            <div className="flex items-center gap-4 mb-3 relative z-10 w-full">
                              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0 group-hover:border-blue-300 transition-colors">
                                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                              </div>
                              <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 w-full flex justify-between items-center shadow-sm">
                                <h4 className="font-black text-xs uppercase tracking-widest text-slate-600">
                                  {format(new Date(date + "T12:00:00"), "d MMM yyyy", { locale: es })}
                                </h4>
                                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                                  {criteriaGrouping.length} eval.
                                </span>
                              </div>
                            </div>

                            {/* Criteria Cards within Date */}
                            <div className="pl-12 space-y-2 relative z-10">
                              {criteriaGrouping.map(crit => {
                                const score = st.grades?.[crit.id];
                                return (
                                  <div key={crit.id} className="flex justify-between items-center bg-white p-3 rounded-[14px] border border-slate-200 shadow-sm hover:border-blue-300 transition-all hover:shadow-md group/crit">
                                    <div className="min-w-0 pr-3">
                                      <p className="text-sm font-bold text-slate-700 truncate group-hover/crit:text-blue-700 transition-colors">{crit.name}</p>
                                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest flex items-center gap-1">
                                        Máx: {crit.max_score}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                       {score != null ? (
                                          <div className={`flex flex-col items-center justify-center min-w-[3rem] h-[3rem] rounded-xl border-2 ${getScoreBadge(score, crit.max_score)} transition-transform group-hover/crit:scale-105`}>
                                            <span className="font-black text-xl tracking-tighter leading-none">{score}</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-center min-w-[3rem] h-[3rem] rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-300">
                                            <span className="font-black text-xl leading-none">—</span>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                    ) : (

                      /* FLAT LIST FOR RECENT VIEW */
                      <>
                        {visibleCriteria.slice(0, 6).map(crit => {
                          const score = st.grades?.[crit.id];
                          return (
                            <div key={crit.id} className="flex justify-between items-center bg-slate-50/80 hover:bg-white p-3.5 rounded-2xl border border-slate-200/60 transition-all hover:shadow-md hover:border-blue-200 group/crit">
                              <div className="min-w-0 pr-4">
                                <p className="text-sm font-bold text-slate-800 truncate group-hover/crit:text-blue-700 transition-colors">{crit.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest flex items-center gap-1.5">
                                  {format(new Date(crit.sessionDate + "T12:00:00"), "d MMM", { locale: es })}
                                </p>
                              </div>
                              
                              <div className="flex-shrink-0">
                                 {score != null ? (
                                    <div className={`flex flex-col items-center justify-center min-w-[3.5rem] h-[3.5rem] rounded-xl border-2 ${getScoreBadge(score, crit.max_score)} transition-transform group-hover/crit:scale-110`}>
                                      <span className="font-black text-2xl tracking-tighter leading-none">{score}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center min-w-[3.5rem] h-[3.5rem] rounded-xl border-2 border-slate-200 bg-white text-slate-300 shadow-sm">
                                      <span className="font-black text-xl leading-none">—</span>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )
                        })}
                        
                        {sessionFilter === "latest" && visibleCriteria.length > 6 && (
                          <button 
                            onClick={() => setSessionFilter("all")}
                            className="w-full flex items-center justify-center gap-2 py-3 mt-1 bg-white hover:bg-blue-50 text-blue-600 rounded-2xl border-2 border-blue-100 hover:border-blue-200 transition-all font-black text-xs uppercase tracking-widest shadow-sm hover:shadow-md"
                          >
                             <History className="w-4 h-4" />
                             +{visibleCriteria.length - 6} Evaluaciones Anteriores
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

      </div>

      {/* Achievement Toast */}
      {newBadges.length > 0 && <AchievementToast badges={newBadges} />}
    </div>
  );
}
