import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GraduationCap, Users, Clock, Trophy, LayoutGrid, List, Search, Pin, PinOff, History, CheckCircle2, TrendingUp, Sparkles, Medal, Flame, Heart, ChevronRight, ChevronDown } from "lucide-react";
import { calculateGamification } from "../../lib/gamificationEngine";
import {
  getCriteriaType,
  getCriteriaCleanName,
  getCriteriaTypeMeta,
} from "../../lib/pedagogicalReportEngine";
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
  const [cuatrimestreFilter, setCuatrimestreFilter] = useState("all"); // "all", "1", "2"
  const [categoryFilter, setCategoryFilter] = useState("all"); // "all", "exam", "assignment", "class"
  const [tableSubView, setTableSubView] = useState("detailed"); // "detailed" | "summary"
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
        <button onClick={() => window.location.reload()} className="bg-slate-900 hover:bg-[#0c0f14] text-white w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]">
          Reintentar conexión
        </button>
      </div>
    </div>
  );

  // Flatten all criteria across all sessions (overall history) with categorization
  const allCriteria = [];
  const sortedSessions = [...(data.sessions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sortedSessions.forEach(session => {
    (session.criteria || []).forEach(crit => {
      const type = getCriteriaType(crit.name);
      const cleanName = getCriteriaCleanName(crit.name) || crit.name;
      const meta = getCriteriaTypeMeta(type);
      allCriteria.push({
        ...crit,
        session_id: session.id,
        sessionDate: session.date,
        cuatrimestre: session.cuatrimestre || (new Date(session.date).getMonth() >= 6 ? 2 : 1),
        type,
        cleanName,
        meta,
      });
    });
  });

  // Category counts across all criteria
  const criteriaCounts = {
    all: allCriteria.length,
    exam: allCriteria.filter(c => c.type === "exam").length,
    assignment: allCriteria.filter(c => c.type === "assignment").length,
    class: allCriteria.filter(c => c.type === "class").length,
  };

  // Calculate visible items based on cuatrimestre filter & session filter
  const filteredByCuatrimestreSessions = sortedSessions.filter(s => {
    if (cuatrimestreFilter === "all") return true;
    const sCuatrimestre = s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1);
    return sCuatrimestre === Number(cuatrimestreFilter);
  });

  const visibleSessions = sessionFilter === "all" 
    ? filteredByCuatrimestreSessions 
    : (sessionFilter === "latest" 
        ? (filteredByCuatrimestreSessions.length > 0 ? [filteredByCuatrimestreSessions[0]] : []) 
        : filteredByCuatrimestreSessions.filter(s => s.id === sessionFilter));

  const visibleCriteria = [];
  visibleSessions.forEach(session => {
    (session.criteria || []).forEach(crit => {
      const type = getCriteriaType(crit.name);
      const cleanName = getCriteriaCleanName(crit.name) || crit.name;
      const meta = getCriteriaTypeMeta(type);
      if (categoryFilter === "all" || type === categoryFilter) {
        visibleCriteria.push({
          ...crit,
          session_id: session.id,
          sessionDate: session.date,
          cuatrimestre: session.cuatrimestre || (new Date(session.date).getMonth() >= 6 ? 2 : 1),
          type,
          cleanName,
          meta,
        });
      }
    });
  });

  const students = data.students || [];

  // Calculate totals and raw XP per student (Pass 1)
  const studentsWithRawXP = students.map(st => {
    const gamiRaw = calculateGamification(sortedSessions, st.grades, st.attendance, st.spent_coins || 0);
    return { ...st, gamiRaw };
  });

  const maxXP = Math.max(...studentsWithRawXP.map(s => s.gamiRaw.currentXP), 0);

  // Calculate final gamification data (Pass 2 - Relative) & divided averages
  const studentTotals = studentsWithRawXP.map(st => {
    let classScoreSum = 0;
    let classMaxSum = 0;
    let examScoreSum = 0;
    let examMaxSum = 0;

    allCriteria.forEach(crit => {
      const score = st.grades?.[crit.id];
      if (score != null) {
        const num = Number(score);
        const max = Number(crit.max_score || 10);
        if (crit.type === "class") {
          classScoreSum += num;
          classMaxSum += max;
        } else {
          examScoreSum += num;
          examMaxSum += max;
        }
      }
    });

    const classAvg = classMaxSum > 0 ? (classScoreSum / classMaxSum) * 10 : null;
    const examAvg = examMaxSum > 0 ? (examScoreSum / examMaxSum) * 10 : null;

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

    return { ...st, total, max, overallTotal, classAvg, examAvg, gami };
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
    return total / max;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-blue-900 font-sans selection:bg-blue-200 relative">
      
      {/* Modern Mesh Gradient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/10 blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/10 blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-cyan-400/10 blur-[120px] mix-blend-multiply" />
      </div>

      {/* Glassmorphic Compact Header */}
      <header className="bg-white/95 backdrop-blur-2xl border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-2.5">
            
            {/* Class Info & Live Status + View Toggle on Mobile */}
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 sm:p-2 rounded-xl shadow-xs shadow-blue-600/20 shrink-0">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-extrabold text-base sm:text-lg md:text-xl tracking-tight text-slate-800 leading-tight truncate">
                      {data.class_name}
                    </h1>
                    <div className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      VIVO
                    </div>
                    {lastUpdated && (
                      <span className="text-[10px] text-slate-400 font-semibold tracking-wide flex items-center gap-1 shrink-0 hidden sm:inline-flex">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {format(lastUpdated, "HH:mm")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Mode Toggle (Mobile / Tablet compact placement) */}
              <div className="flex lg:hidden bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shrink-0">
                <button 
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                    viewMode === "table" ? "bg-white text-blue-600 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Vista Planilla"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                    viewMode === "cards" ? "bg-white text-blue-600 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Vista Tarjetas"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Controls Bar: Search + Cuatrimestre + Session + View Toggle (Desktop) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 lg:pt-0 border-t border-slate-100 lg:border-t-0">
              {/* Search bar */}
              <div className="relative flex-1 sm:w-44 lg:w-48 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar alumno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50/90 border border-slate-200/80 rounded-xl py-1 pl-7 pr-2.5 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Cuatrimestre Selector */}
              <div className="flex bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shrink-0 gap-0.5">
                <button
                  onClick={() => { setCuatrimestreFilter("all"); setAnimKey(k => k + 1); }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-['Outfit'] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    cuatrimestreFilter === "all" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Año
                </button>
                <button
                  onClick={() => { setCuatrimestreFilter("1"); setAnimKey(k => k + 1); }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-['Outfit'] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    cuatrimestreFilter === "1" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  1ºC
                </button>
                <button
                  onClick={() => { setCuatrimestreFilter("2"); setAnimKey(k => k + 1); }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-['Outfit'] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    cuatrimestreFilter === "2" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  2ºC
                </button>
              </div>

              {/* Session Filter */}
              <div className="relative shrink-0">
                <History className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                <select 
                  value={sessionFilter}
                  onChange={(e) => { setSessionFilter(e.target.value); setAnimKey(k => k + 1); }}
                  className="appearance-none bg-slate-50/90 border border-slate-200/80 rounded-xl py-1 pl-6 pr-6 text-[11px] font-['Outfit'] font-black uppercase tracking-wider text-slate-700 outline-none focus:border-blue-500 cursor-pointer shadow-xs"
                >
                  <option value="latest">Hoy (Última)</option>
                  <option value="all">Todas las Clases</option>
                  {filteredByCuatrimestreSessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {format(new Date(s.date + "T12:00:00"), "d 'de' MMM", { locale: es })}
                    </option>
                  ))}
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>

              {/* View Mode Toggle (Desktop placement) */}
              <div className="hidden lg:flex bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shrink-0">
                <button 
                  onClick={() => setViewMode("table")}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "table" ? "bg-white text-blue-600 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Vista Planilla"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-['Outfit'] font-black uppercase tracking-wider">Planilla</span>
                </button>
                <button 
                  onClick={() => setViewMode("cards")}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "cards" ? "bg-white text-blue-600 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Vista Tarjetas"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-['Outfit'] font-black uppercase tracking-wider">Tarjetas</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-6 max-w-[1400px]">
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
          /* Table View - Executive Redesign with Category Breakdown & Alternating View */
          <div className="space-y-2">
            {/* Apple-style Table Control Toolbar - Ultra Compact */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="shrink-0 flex justify-center">
                <div className="grid grid-cols-2 p-0.5 bg-slate-100/90 rounded-lg border border-slate-200/80 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setTableSubView("detailed")}
                    className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] font-['Outfit'] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      tableSubView === "detailed" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <List className="w-3 h-3 shrink-0" />
                    <span className="whitespace-nowrap">
                      <span className="sm:hidden">Sábana</span>
                      <span className="hidden sm:inline">Sábana Detallada</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableSubView("summary")}
                    className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] font-['Outfit'] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      tableSubView === "summary" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <GraduationCap className="w-3 h-3 shrink-0" />
                    <span className="whitespace-nowrap">
                      <span className="sm:hidden">Promedios</span>
                      <span className="hidden sm:inline">Resumen de Promedios</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Category Quick Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-0.5 hidden md:inline shrink-0">Dividir:</span>
                {[
                  { key: "all", label: "Todas", count: criteriaCounts.all, icon: null },
                  { key: "exam", label: "Exámenes", count: criteriaCounts.exam, icon: "🎯" },
                  { key: "assignment", label: "TPs", count: criteriaCounts.assignment, icon: "📄" },
                  { key: "class", label: "Clases", count: criteriaCounts.class, icon: "📝" },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => { setCategoryFilter(cat.key); setAnimKey(k => k + 1); }}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-['Outfit'] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      categoryFilter === cat.key
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100/90 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
                    }`}
                  >
                    {cat.icon && <span className="text-[10px]">{cat.icon}</span>}
                    <span>{cat.label}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded ${categoryFilter === cat.key ? "bg-white/20 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {tableSubView === "summary" ? (
              /* Executive Summary Table: Divided Averages & Academic Status */
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto scroll-smooth">
                  <table className="w-full text-base border-collapse min-w-[680px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                        <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 font-['Outfit'] font-black text-xs uppercase tracking-widest text-slate-800 sticky left-0 bg-slate-100 z-20 shadow-[3px_0_10px_-2px_rgba(0,0,0,0.08)] border-r border-slate-200 min-w-[160px] sm:min-w-[200px]">
                          Alumno ({filteredStudents.length})
                        </th>
                        <th className="text-center px-3 py-2.5 sm:py-3 font-['Outfit'] font-black text-xs uppercase tracking-wider text-slate-700 bg-slate-50 border-l border-slate-200 min-w-[120px]">
                          📝 Prom. Clases
                        </th>
                        <th className="text-center px-3 py-2.5 sm:py-3 font-['Outfit'] font-black text-xs uppercase tracking-wider text-purple-900 bg-purple-50/70 border-l border-slate-200 min-w-[140px]">
                          🎯 Prom. Exám/TPs
                        </th>
                        <th className="text-center px-3 py-2.5 sm:py-3 font-['Outfit'] font-black text-xs uppercase tracking-wider text-blue-800 bg-blue-50/80 border-l border-slate-200 min-w-[140px]">
                          🌟 Rendimiento
                        </th>
                        <th className="text-center px-3 py-2.5 sm:py-3 font-['Outfit'] font-black text-xs uppercase tracking-wider text-slate-700 border-l border-slate-200 min-w-[120px]">
                          🛡️ Condición
                        </th>
                        <th className="text-center px-3 py-2.5 sm:py-3 font-['Outfit'] font-black text-xs uppercase tracking-wider text-slate-500 border-l border-slate-200 min-w-[90px]">
                          Detalle
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student, idx) => {
                        const pct = calculateOverallPercentage(student.total, student.max);
                        const isPinned = student.cs_id === pinnedStudent;
                        const isPassing = (student.examAvg !== null ? student.examAvg >= 6 : (pct >= 0.6));
                        const isHonor = pct >= 0.8 && (student.examAvg === null || student.examAvg >= 8);

                        return (
                          <tr
                            key={student.cs_id}
                            onClick={() => student.token && navigate(`/live/${student.token}`)}
                            className={`cursor-pointer hover:bg-blue-50/40 transition-colors group ${isPinned ? "bg-blue-50/60" : "bg-white"}`}
                          >
                            <td className={`px-4 sm:px-6 py-4 sticky left-0 z-10 border-r border-slate-200 shadow-[3px_0_10px_-2px_rgba(0,0,0,0.08)] ${isPinned ? "bg-blue-50" : "bg-white group-hover:bg-slate-50"}`}>
                              <div className="flex items-center gap-2.5 sm:gap-3">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); togglePin(student.cs_id); }}
                                  className={`p-1.5 rounded-xl transition-all outline-none shrink-0 ${isPinned ? "text-amber-500 bg-amber-50 shadow-xs" : "text-slate-300 hover:text-amber-500 hover:bg-slate-100"}`}
                                  title={isPinned ? "Desfijar" : "Fijar Alumno"}
                                >
                                  <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-amber-500" : ""}`} />
                                </button>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-['Outfit'] font-black shrink-0 ${
                                  idx === 0 ? "bg-amber-400 text-white shadow-xs" :
                                  idx === 1 ? "bg-slate-300 text-white" :
                                  idx === 2 ? "bg-amber-600 text-white" :
                                  "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}>
                                  {idx < 3 ? <Medal className="w-3.5 h-3.5" /> : idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-['Outfit'] font-bold text-xs sm:text-sm text-slate-900 block leading-tight truncate">
                                    {student.name}
                                  </span>
                                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                    Nv. {student.gami?.currentLevel || 1} · {student.gami?.rank?.name || "Estudiante"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Promedio Clases Normales */}
                            <td className="px-4 py-4 text-center border-l border-slate-200 bg-slate-50/40">
                              {typeof student.classAvg === 'number' ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-baseline gap-1">
                                    <span className="font-['Outfit'] font-black text-base text-slate-900">
                                      {student.classAvg.toFixed(1)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">/ 10</span>
                                  </div>
                                  <div className="w-16 bg-slate-200 rounded-full h-1 overflow-hidden">
                                    <div
                                      className="bg-blue-600 h-full rounded-full"
                                      style={{ width: `${Math.min(student.classAvg * 10, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-300 font-bold text-xs">—</span>
                              )}
                            </td>

                            {/* Promedio Exámenes / TPs */}
                            <td className="px-4 py-4 text-center border-l border-slate-200 bg-purple-50/30">
                              {typeof student.examAvg === 'number' ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-baseline gap-1">
                                    <span className="font-['Outfit'] font-black text-base text-purple-700">
                                      {student.examAvg.toFixed(1)}
                                    </span>
                                    <span className="text-[10px] font-bold text-purple-400">/ 10</span>
                                  </div>
                                  <div className="w-16 bg-purple-200 rounded-full h-1 overflow-hidden">
                                    <div
                                      className="bg-purple-600 h-full rounded-full"
                                      style={{ width: `${Math.min(student.examAvg * 10, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-300 font-bold text-xs">— Sin exámenes —</span>
                              )}
                            </td>

                            {/* Rendimiento General */}
                            <td className="px-4 py-4 text-center border-l border-slate-200 bg-blue-50/40">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-baseline gap-1">
                                  <span className="font-['Outfit'] font-black text-base text-blue-700">
                                    {Math.round(pct * 100)}%
                                  </span>
                                  <span className="text-[10px] font-bold text-blue-400">
                                    ({student.total}/{student.max})
                                  </span>
                                </div>
                                <div className="w-16 bg-blue-200 rounded-full h-1 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full"
                                    style={{ width: `${pct * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Condición */}
                            <td className="px-4 py-4 text-center border-l border-slate-200">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-['Outfit'] font-black uppercase tracking-wider border ${
                                isHonor
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : isPassing
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-rose-50 text-rose-800 border-rose-200"
                              }`}>
                                {isHonor ? "⭐ Promoción" : isPassing ? "✅ Aprobado" : "⏳ En Proceso"}
                              </span>
                            </td>

                            {/* Acción / Ver Detalle */}
                            <td className="px-4 py-4 text-center border-l border-slate-200">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); student.token && navigate(`/live/${student.token}`); }}
                                className="px-2.5 py-1 rounded-xl text-xs font-['Outfit'] font-black uppercase tracking-wider transition-all cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                              >
                                Ver
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Detailed Matrix Sheet: All Columns by Session with Badges & Divided Averages */
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto scroll-smooth">
                  <table className="w-full text-base border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                        <th
                          rowSpan={2}
                          className="text-left px-3 sm:px-5 py-2.5 sm:py-3 font-['Outfit'] font-black text-xs uppercase tracking-widest text-slate-800 sticky left-0 bg-slate-100 z-30 shadow-[3px_0_10px_-2px_rgba(0,0,0,0.08)] border-r border-slate-200 w-[160px] sm:w-[200px]"
                        >
                          Alumno ({filteredStudents.length})
                        </th>
                        {visibleSessions.map(session => {
                          const sessionVisibleCrits = visibleCriteria.filter(c => c.session_id === session.id);
                          if (sessionVisibleCrits.length === 0) return null;
                          const sCuatrimestre = session.cuatrimestre || (new Date(session.date).getMonth() >= 6 ? 2 : 1);
                          return (
                            <th
                              key={session.id}
                              colSpan={sessionVisibleCrits.length}
                              className="px-2.5 py-2 text-center border-l border-slate-200"
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
                                  sCuatrimestre === 2 
                                    ? "bg-purple-100 text-purple-700 border-purple-200" 
                                    : "bg-blue-100 text-blue-700 border-blue-200"
                                }`}>
                                  {sCuatrimestre}ºC
                                </span>
                                <span className="font-['Outfit'] font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">
                                  {format(new Date(session.date + "T12:00:00"), "d 'de' MMM", { locale: es })}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                        <th
                          rowSpan={2}
                          className="px-2.5 py-2.5 sm:py-3 text-center font-['Outfit'] font-black text-[11px] sm:text-xs uppercase tracking-wider text-slate-700 bg-slate-50/90 border-l border-slate-200 min-w-[90px]"
                        >
                          <div>Prom. Clases</div>
                          <div className="text-[10px] font-bold text-slate-400 mt-0.5">/ 10</div>
                        </th>
                        <th
                          rowSpan={2}
                          className="px-2.5 py-2.5 sm:py-3 text-center font-['Outfit'] font-black text-[11px] sm:text-xs uppercase tracking-wider text-purple-900 bg-purple-50/70 border-l border-slate-200 min-w-[100px]"
                        >
                          <div>Prom. Exám/TPs</div>
                          <div className="text-[10px] font-bold text-purple-400 mt-0.5">/ 10</div>
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-['Outfit'] font-black text-xs uppercase tracking-widest text-blue-700 bg-blue-100 border-l-2 border-blue-200 sticky right-0 z-30 shadow-[-3px_0_10px_-2px_rgba(0,0,0,0.08)] min-w-[95px] sm:min-w-[115px]"
                        >
                          TOTAL
                        </th>
                      </tr>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        {visibleCriteria.map(crit => (
                          <th key={crit.id} className={`px-2 py-2 text-center border-l border-slate-200 min-w-[90px] ${crit.meta.headerClass}`}>
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border ${crit.meta.badgeClass}`}>
                                {crit.meta.icon} {crit.meta.shortLabel}
                              </span>
                              <div className="text-[10px] sm:text-xs font-['Outfit'] font-black text-slate-800 uppercase tracking-wider truncate max-w-[110px] mx-auto leading-tight" title={crit.cleanName}>
                                {crit.cleanName}
                              </div>
                              <div className="text-[9px] font-bold text-slate-400">
                                MÁX: {crit.max_score}
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student, idx) => {
                        const pct = calculateOverallPercentage(student.total, student.max);
                        const isPinned = student.cs_id === pinnedStudent;
                        
                        return (
                        <tr
                          key={student.cs_id}
                          onClick={() => student.token && navigate(`/live/${student.token}`)}
                          className={`cursor-pointer transition-colors group hover:bg-blue-50/40 ${isPinned ? "bg-blue-50/60" : "bg-white"}`}
                        >
                          <td className={`px-3 sm:px-5 py-3.5 sm:py-4 sticky left-0 z-10 shadow-[3px_0_10px_-2px_rgba(0,0,0,0.08)] border-r border-slate-200 transition-colors group-hover:bg-slate-50 w-[170px] sm:w-[220px] ${isPinned ? "bg-blue-50" : "bg-white"}`}>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <button 
                                onClick={(e) => { e.stopPropagation(); togglePin(student.cs_id); }}
                                className={`p-1.5 rounded-xl transition-all outline-none shrink-0 ${isPinned ? "text-amber-500 bg-amber-50 shadow-xs" : "text-slate-300 hover:text-amber-500 hover:bg-slate-100"}`}
                                title={isPinned ? "Desfijar" : "Fijar Alumno"}
                              >
                                <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-amber-500" : ""}`} />
                              </button>
                              
                              <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs font-['Outfit'] font-black shadow-xs shrink-0 ${
                                isPinned ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20" :
                                idx === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-amber-500/20" :
                                idx === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                                idx === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                                "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}>
                                {idx < 3 && !isPinned ? <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : idx + 1}
                              </div>
                              
                              <div className="flex flex-col justify-center min-w-0 flex-1">
                                <span 
                                  className="font-['Outfit'] font-bold text-xs sm:text-sm text-slate-900 tracking-tight truncate leading-tight block w-full"
                                  title={student.name}
                                >
                                  {student.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200/80">
                                    Nv. {student.gami?.currentLevel || 1}
                                  </span>
                                  {student.gami?.streak > 1 && (
                                    <span className="text-[9px] font-black text-amber-600 flex items-center gap-0.5">
                                      <Flame className="w-2.5 h-2.5 fill-amber-500" /> {student.gami.streak}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {visibleCriteria.map(crit => {
                            const score = student.grades?.[crit.id];
                            return (
                              <td key={crit.id} className="px-2 py-3 text-center border-l border-slate-100 group-hover:border-slate-200 transition-colors">
                                {score != null ? (
                                  <div className="inline-flex flex-col items-center justify-center">
                                    <span className={`w-8 h-8 rounded-xl font-['Outfit'] font-extrabold text-sm flex items-center justify-center border transition-transform group-hover:scale-105 ${getScoreBadge(Number(score), crit.max_score || 10)}`}>
                                      {score}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-bold text-xs">—</span>
                                )}
                              </td>
                            );
                          })}
                          
                          {/* Promedio Clases */}
                          <td className="px-3 py-3 text-center border-l border-slate-200 bg-slate-50/40">
                            {typeof student.classAvg === 'number' ? (
                              <span className="font-['Outfit'] font-black text-sm text-slate-800">
                                {student.classAvg.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold text-xs">—</span>
                            )}
                          </td>

                          {/* Promedio Exámenes / TPs */}
                          <td className="px-3 py-3 text-center border-l border-slate-200 bg-purple-50/30">
                            {typeof student.examAvg === 'number' ? (
                              <span className="font-['Outfit'] font-black text-sm text-purple-700">
                                {student.examAvg.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold text-xs">—</span>
                            )}
                          </td>

                          {/* TOTAL Sticky Right */}
                          <td className={`px-3 sm:px-4 py-3 text-center sticky right-0 z-10 border-l-2 border-blue-200 shadow-[-3px_0_10px_-2px_rgba(0,0,0,0.08)] ${isPinned ? "bg-blue-50" : "bg-white group-hover:bg-slate-50"}`}>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-baseline gap-1">
                                <span className="font-['Outfit'] font-black text-sm sm:text-base text-blue-700">
                                  {student.total}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  / {student.max}
                                </span>
                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200/60 ml-0.5">
                                  {Math.round(pct * 100)}%
                                </span>
                              </div>
                              <div className="w-14 sm:w-16 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5">
                                <div 
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${pct * 100}%` }}
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
            )}

            {/* Mobile Scroll Hint */}
            <div className="md:hidden flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 py-1">
              <span>👈</span>
              <span>Deslizá para ver todas las columnas</span>
              <span>👉</span>
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

      </div>

      {/* Achievement Toast */}
      {newBadges.length > 0 && <AchievementToast badges={newBadges} />}
    </div>
  );
}
