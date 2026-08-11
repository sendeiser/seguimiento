import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, X, Users, XCircle, ChevronLeft, ChevronRight, LayoutGrid, ArrowLeft, PlusCircle, Sparkles, Trash2, TrendingUp, Pencil, Download, Printer, Wifi, WifiOff } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useTheme } from "../../providers/ThemeProvider";
import { useToast } from "../../providers/ToastProvider";
import { addXPToAllStudentPokemon } from "../../lib/pokemonStore";
import { exportClassToCSV } from "../../lib/reportExporter";
import StudentReportModal from "../../components/reports/StudentReportModal";
import { queueOfflineUpdate, setupOfflineSyncListeners, getOfflineQueue } from "../../lib/offlineSync";

export default function LiveSession() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [className, setClassName] = useState("");
  const [criteria, setCriteria] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [viewMode, setViewMode] = useState("table");
  const [focusIndex, setFocusIndex] = useState(0);
  const [showStudentList, setShowStudentList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [attendance, setAttendance] = useState({});
  const [inheritedGrades, setInheritedGrades] = useState({});
  const [showOverallAverage, setShowOverallAverage] = useState(false);
  const [gradeFlash, setGradeFlash] = useState({});
  const [sparklineData, setSparklineData] = useState({});
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingQueueCount, setPendingQueueCount] = useState(getOfflineQueue().length);

  const inputRefs = useRef({});
  const { theme } = useTheme();
  const { toast, confirm } = useToast();
  const isDark = theme === 'dark';

  useEffect(() => {
    const cleanupSync = setupOfflineSyncListeners((result) => {
      toast.success(`Sincronizados ${result.count} cambios guardados sin conexión`);
      setPendingQueueCount(getOfflineQueue().length);
      fetchGrades();
    });

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      cleanupSync();
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    fetchData();
    const subscription = supabase
      .channel("live-session-grades")
      .on("postgres_changes", { event: "*", schema: "public", table: "grades" }, () => {
        fetchGrades();
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [id]);

  const fetchData = async () => {
    const { data: s } = await supabase.from("sessions").select("*, classes(name, id)").eq("id", id).single();
    if (!s) return;
    setSession(s);
    setClassName(s.classes.name);

    const [{ data: cData }, { data: stData }] = await Promise.all([
      supabase.from("session_criteria").select("*").eq("session_id", id).order("created_at"),
      supabase.from("class_students").select("id, student_id, student_name, profiles(full_name)").eq("class_id", s.classes.id),
    ]);

    setCriteria(cData || []);
    const mapped = (stData || []).map(st => ({
      cs_id: st.id,
      student_id: st.student_id,
      name: st.profiles?.full_name || st.student_name || "Sin nombre",
    }));
    setStudents(mapped);

    if (cData?.length > 0) {
      const cIds = cData.map(c => c.id);
      const { data: gData } = await supabase.from("grades").select("*").in("criteria_id", cIds);
      const map = {};
      (gData || []).forEach(g => { map[`${g.class_student_id}_${g.criteria_id}`] = g.score; });
      setGrades(map);

      const { data: aData } = await supabase.from("attendance").select("*").eq("session_id", id);
      const aMap = {};
      (aData || []).forEach(a => { aMap[a.class_student_id] = a.is_present; });
      setAttendance(aMap);

      const { data: otherSessions } = await supabase.from("sessions").select("id").eq("class_id", s.classes.id).neq("id", id);
      if (otherSessions?.length > 0) {
        const osIds = otherSessions.map(os => os.id);
        const { data: allPrevCrit } = await supabase.from("session_criteria").select("id, name").in("session_id", osIds);
        if (allPrevCrit?.length > 0) {
          const { data: allPrevGrades } = await supabase.from("grades").select("*, session_criteria(name)").in("criteria_id", allPrevCrit.map(apc => apc.id)).order("updated_at", { ascending: false });
          const iMap = {};
          (allPrevGrades || []).forEach(g => {
            const critName = g.session_criteria?.name;
            const iKey = `${g.class_student_id}_${critName}`;
            if (!iMap[iKey]) iMap[iKey] = g.score;
          });
          setInheritedGrades(iMap);
        }
      }
    }
    setLoading(false);

    try {
      const { data: allSess } = await supabase.from("sessions").select("id, date").eq("class_id", s.classes.id).order("date", { ascending: false }).limit(6);
      if (allSess?.length > 1) {
        const allSessIds = allSess.map(ss => ss.id);
        const { data: allCrit } = await supabase.from("session_criteria").select("id, session_id, max_score").in("session_id", allSessIds);
        const { data: allGr } = await supabase.from("grades").select("class_student_id, criteria_id, score").in("criteria_id", (allCrit || []).map(c => c.id));
        const sData = {};
        const sessionsOldFirst = [...allSess].reverse();
        sessionsOldFirst.forEach(ss => {
          const critForSess = (allCrit || []).filter(c => c.session_id === ss.id);
          const maxTotal = critForSess.reduce((s, c) => s + (c.max_score || 0), 0);
          (stData || []).forEach(st => {
            if (!sData[st.id]) sData[st.id] = [];
            const total = critForSess.reduce((sum, c) => {
              const g = (allGr || []).find(g => g.class_student_id === st.id && g.criteria_id === c.id);
              return sum + (g ? Number(g.score) : 0);
            }, 0);
            sData[st.id].push({ pct: maxTotal > 0 ? Math.round((total / maxTotal) * 100) : null });
          });
        });
        setSparklineData(sData);
      }
    } catch (_) {}
  };

  const fetchGrades = async () => {
    if (!criteria.length) return;
    const cIds = criteria.map(c => c.id);
    const { data: gData } = await supabase.from("grades").select("*").in("criteria_id", cIds);
    const map = {};
    (gData || []).forEach(g => { map[`${g.class_student_id}_${g.criteria_id}`] = g.score; });
    setGrades(map);
  };

  const handleAddCriteria = async () => {
    const name = prompt("Nombre del criterio (Ej: Participación):");
    if (!name) return;
    const maxScore = prompt("Puntaje máximo:", "10");
    const { data } = await supabase.from("session_criteria").insert([{ session_id: id, name, max_score: parseFloat(maxScore) || 10 }]).select().single();
    if (data) setCriteria([...criteria, data]);
  };

  const handleDeleteCriteria = async (criteriaId) => {
    if (!(await confirm("¿Eliminar este criterio y todas sus notas?"))) return;
    await supabase.from("session_criteria").delete().eq("id", criteriaId);
    setCriteria(prev => prev.filter(c => c.id !== criteriaId));
  };

  const handleFillMaxGrades = async (crit) => {
    if (!(await confirm(`¿Llenar con nota MÁXIMA (${crit.max_score}) a todos los alumnos presentes?`))) return;
    const studentsToUpdate = students.filter(s => {
      const isPresent = attendance[s.cs_id] !== false;
      const key = `${s.cs_id}_${crit.id}`;
      const val = grades[key];
      return isPresent && (val === undefined || val === "");
    });
    if (studentsToUpdate.length === 0) { toast("Todos los alumnos presentes ya tienen nota.", "info"); return; }
    const newGrades = { ...grades };
    const upserts = [];
    studentsToUpdate.forEach(s => {
      const key = `${s.cs_id}_${crit.id}`;
      newGrades[key] = crit.max_score.toString();
      upserts.push({ class_student_id: s.cs_id, criteria_id: crit.id, score: crit.max_score, updated_at: new Date().toISOString() });
    });
    setGrades(newGrades);
    await supabase.from("grades").upsert(upserts, { onConflict: "class_student_id,criteria_id" });

    // Recompensa Pokémon para todos (XP según puntaje máximo)
    studentsToUpdate.forEach(s => {
      if (s.student_id) {
        addXPToAllStudentPokemon(s.student_id, Math.floor(crit.max_score * 10));
      }
    });
  };

  const handleGradeChange = (csId, criteriaId, value) => setGrades(prev => ({ ...prev, [`${csId}_${criteriaId}`]: value }));

  const saveGrade = async (csId, criteriaId, value, maxScore) => {
    const score = parseFloat(value);
    if (value === "" || isNaN(score)) return;
    const key = `${csId}_${criteriaId}`;
    setSaving(prev => ({ ...prev, [key]: true }));

    if (!navigator.onLine) {
      queueOfflineUpdate("grade", { session_id: id, student_id: csId, criteria_id: criteriaId, score });
      setPendingQueueCount(getOfflineQueue().length);
    } else {
      await supabase.from("grades").upsert({ class_student_id: csId, criteria_id: criteriaId, score, updated_at: new Date().toISOString() }, { onConflict: "class_student_id,criteria_id" });
    }
    
    // Recompensa Pokémon
    const student = students.find(s => s.cs_id === csId);
    if (student?.student_id) {
      addXPToAllStudentPokemon(student.student_id, Math.floor(score * 10));
    }

    setSaving(prev => ({ ...prev, [key]: false }));
    const flashType = maxScore > 0 && score / maxScore > 0.5 ? "success" : "danger";
    setGradeFlash(prev => ({ ...prev, [key]: flashType }));
    setTimeout(() => { const n = {...prev}; delete n[key]; setGradeFlash(n); }, 900);
  };

  const setQuickGrade = async (csId, criteriaId, score, maxScore) => {
    handleGradeChange(csId, criteriaId, score.toString());
    await saveGrade(csId, criteriaId, score.toString(), maxScore);
  };

  const handleKeyDown = (e, studentIndex, criteriaIndex) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextStudentIndex = (studentIndex + 1) % filteredStudents.length;
      const nextStudent = filteredStudents[nextStudentIndex];
      const nextCriteria = criteria[criteriaIndex];
      if (nextStudent && nextCriteria) inputRefs.current[`${nextStudent.cs_id}_${nextCriteria.id}`]?.focus();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const nextCriteriaIndex = (criteriaIndex + 1) % criteria.length;
      const nextStudent = filteredStudents[studentIndex];
      const nextCriteria = criteria[nextCriteriaIndex];
      if (nextStudent && nextCriteria) inputRefs.current[`${nextStudent.cs_id}_${nextCriteria.id}`]?.focus();
    }
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  const toggleAttendance = async (csId) => {
    const newState = !attendance[csId];
    setAttendance(prev => ({ ...prev, [csId]: newState }));
    await supabase.from("attendance").upsert({ session_id: id, class_student_id: csId, is_present: newState }, { onConflict: "session_id,class_student_id" });
    
    // Recompensa Pokémon por asistencia (+20 XP)
    if (newState) {
      const student = students.find(s => s.cs_id === csId);
      if (student?.student_id) {
        addXPToAllStudentPokemon(student.student_id, 20);
      }
    }
  };

  const generateAIFeedback = (csId) => {
    const studentGrades = criteria.map(c => {
      const key = `${csId}_${c.id}`;
      const score = parseFloat(grades[key]) || parseFloat(inheritedGrades[`${csId}_${c.name}`]) || 0;
      return { name: c.name, score, max_score: c.max_score };
    });
    let feedback = "El alumno ha mostrado un desempeño ";
    const totalScore = studentGrades.reduce((sum, g) => sum + g.score, 0);
    const maxPossibleScore = studentGrades.reduce((sum, g) => sum + g.max_score, 0);
    const percentage = (totalScore / maxPossibleScore) * 100;
    if (percentage >= 90) feedback += "excelente. ¡Felicidades!";
    else if (percentage >= 70) feedback += "bueno. Podría mejorar en algunos aspectos.";
    else if (percentage >= 50) feedback += "aceptable. Necesita reforzar ciertos conceptos.";
    else feedback += "que requiere atención. Es fundamental practicar más.";
    const areasToImprove = studentGrades.filter(g => g.score < g.max_score / 2);
    if (areasToImprove.length > 0) feedback += ` Áreas de mejora: ${areasToImprove.map(a => a.name).join(', ')}.`;
    return feedback;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: isDark ? 'hsl(220 25% 6%)' : 'hsl(220 40% 98%)' }}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: 'hsl(262 83% 60% / 0.4)' }} />
        <div className="w-12 h-12 rounded-full animate-spin" style={{ border: '3px solid hsl(262 83% 60% / 0.2)', borderTopColor: 'hsl(262 83% 60%)' }} />
      </div>
    </div>
  );

  const currentStudent = filteredStudents[focusIndex] || null;

  const glassCard = "card-glass-soft";
  const glassInput = "glass-input-inline";

  return (
    <div className="min-h-screen p-4 md:p-6 relative" style={{ background: isDark ? 'hsl(220 25% 6%)' : 'hsl(220 40% 98%)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, hsl(262 83% 60% / 0.3), transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, hsl(185 85% 60% / 0.3), transparent 70%)' }} />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link to={`/class/${session.class_id}`}>
            <button className="p-3 rounded-2xl transition-all hover:scale-105" style={{
              background: isDark ? 'linear-gradient(145deg, hsl(220 20% 12% / 0.5), hsl(220 20% 8% / 0.3))' : 'linear-gradient(145deg, hsl(0 0% 100% / 0.5), hsl(0 0% 100% / 0.3))',
              backdropFilter: 'blur(20px)',
              border: isDark ? '1px solid hsl(0 0% 100% / 0.08)' : '1px solid hsl(0 0% 100% / 0.1)',
            }}>
              <ArrowLeft className="w-5 h-5" style={{ color: isDark ? 'hsl(220 20% 70%)' : 'hsl(220 8% 35%)' }} />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-['Outfit'] font-extrabold" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>Evaluación en Vivo</h1>
            <p className="font-['DM_Sans'] font-medium text-sm mt-1 flex items-center gap-2 flex-wrap" style={{ color: isDark ? 'hsl(220 10% 60%)' : 'hsl(220 8% 35%)' }}>
              <span>{className} · {format(new Date(session.date + "T12:00:00"), "d 'de' MMMM", { locale: es })}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg border ${
                (session.cuatrimestre || (new Date(session.date).getMonth() >= 6 ? 2 : 1)) === 2 
                  ? "bg-purple-50 text-purple-600 border-purple-200" 
                  : "bg-blue-50 text-blue-600 border-blue-200"
              }`}>
                {(session.cuatrimestre || (new Date(session.date).getMonth() >= 6 ? 2 : 1))}º Cuatrimestre
              </span>
              <button onClick={() => { const newDate = prompt("Nueva fecha (YYYY-MM-DD):", session.date); if (newDate && newDate !== session.date) supabase.from("sessions").update({ date: newDate }).eq("id", id).then(() => setSession(prev => ({...prev, date: newDate}))); }} className="p-1 rounded-lg transition-all hover:scale-110" style={{ background: isDark ? 'hsl(0 0% 100% / 0.05)' : 'hsl(0 0% 0% / 0.03)' }}>
                <Pencil className="w-3 h-3" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }} />
              </button>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Buscar alumno..." 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); setFocusIndex(0); }}
              className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-600 transition-all shadow-sm"
            />
            <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            {[
              { mode: "table", icon: LayoutGrid, label: "Lista" },
              { mode: "cards", icon: Users, label: "Tarjetas" }
            ].map(({ mode, icon: Icon, label }) => (
              <button 
                key={mode} 
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
                  viewMode === mode 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-slate-900/5 overflow-hidden">
        {/* Executive Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white tracking-tight">Planilla de Evaluaciones</h2>
              {/* Online / Offline Status Badge */}
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 border ${
                isOnline 
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" 
                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 animate-pulse"
              }`}>
                {isOnline ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                {isOnline ? "En línea" : `Sin conexión (${pendingQueueCount} pend.)`}
              </span>
            </div>
            <p className="font-['DM_Sans'] font-bold text-xs mt-1 uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Atajo: Presioná [Enter] o [Tab] para navegar entre alumnos
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => exportClassToCSV(className || "Clase", students, criteria, grades, attendance)}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl h-12 px-5 font-black flex items-center gap-2 text-xs uppercase tracking-wider transition-all border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Excel / CSV
            </Button>
            <Button onClick={handleAddCriteria} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 px-6 font-black shadow-lg shadow-blue-500/20 flex items-center gap-2 text-xs uppercase tracking-wider transition-all">
              <PlusCircle className="w-5 h-5" /> Agregar Criterio
            </Button>
          </div>
        </div>
        
        <div className="p-0">
          {criteria.length === 0 ? (
            <div className="py-24 text-center px-6">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 rounded-[3rem] blur-xl opacity-30 bg-blue-600" />
                <div className="relative w-20 h-20 rounded-[3rem] bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PlusCircle className="w-10 h-10" />
                </div>
              </div>
              <p className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">No hay criterios de evaluación</p>
              <p className="font-['DM_Sans'] font-medium mt-2 text-slate-500">Definí los aspectos a evaluar en la clase de hoy</p>
              <Button onClick={handleAddCriteria} className="bg-blue-600 text-white mt-8 gap-2 rounded-2xl h-12 px-8 font-black uppercase text-xs tracking-wider shadow-lg shadow-blue-500/20">
                <PlusCircle className="w-5 h-5" /> Crear Criterio
              </Button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-24 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-['Outfit'] font-black text-slate-500">No se encontraron alumnos</p>
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800">
                    <th onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="text-left px-6 py-5 font-['Outfit'] font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-200 cursor-pointer hover:text-blue-600 transition-colors w-64">
                      Alumno
                    </th>
                    {criteria.map(c => (
                      <th key={c.id} className="px-4 py-5 text-center font-['Outfit'] font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-200 relative group border-l border-slate-200 dark:border-slate-800 min-w-[130px]">
                        <div className="truncate font-black text-sm">{c.name}</div>
                        <div className="text-[10px] font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md inline-block mt-1">
                          MAX: {c.max_score}
                        </div>
                        <button onClick={() => handleFillMaxGrades(c)} title="Llenar nota máxima" className="absolute top-2 left-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteCriteria(c.id)} title="Eliminar criterio" className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-rose-500 hover:bg-rose-600 text-white shadow-md">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </th>
                    ))}
                    <th className="hidden sm:table-cell px-4 py-5 text-center font-['Outfit'] font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800 w-32">
                      Tendencia
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredStudents.map((student, sIdx) => {
                      const names = student.name.split(" ");
                      const mobileName = names.length > 1 ? `${names[0]} ${names[1][0]}.` : names[0];
                      return (
                        <tr key={student.cs_id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleAttendance(student.cs_id)}
                                title={attendance[student.cs_id] !== false ? "Asistencia: Presente" : "Asistencia: Ausente"}
                                className={`w-4 h-4 rounded-full transition-all shrink-0 ${
                                  attendance[student.cs_id] !== false 
                                    ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60' 
                                    : 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950/60'
                                }`} 
                              />
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-['Outfit'] font-black text-sm flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0">
                                {student.name[0].toUpperCase()}
                              </div>
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="font-['Outfit'] font-extrabold text-base text-slate-900 dark:text-white tracking-tight truncate">
                                  <span className="sm:hidden">{mobileName}</span>
                                  <span className="hidden sm:inline">{student.name}</span>
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedStudentForReport(student); }}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all shrink-0"
                                  title="Imprimir Boletín / Informe PDF"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </td>
                          {criteria.map((c, cIdx) => {
                            const key = `${student.cs_id}_${c.id}`;
                            const val = grades[key] ?? "";
                            const inheritedVal = inheritedGrades[`${student.cs_id}_${c.name}`] ?? "";
                            const isSaving = saving[key];
                            const displayVal = val !== "" ? val : inheritedVal;
                            const isInherited = val === "" && inheritedVal !== "";
                            const flash = gradeFlash[key];
                            const numVal = parseFloat(displayVal);

                            let inputColorClass = "bg-slate-50 dark:bg-slate-800/90 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 focus:bg-white focus:text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20";
                            
                            if (isInherited) {
                              inputColorClass = "bg-purple-50 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-black shadow-sm";
                            } else if (val !== "") {
                              if (numVal >= 7) {
                                inputColorClass = "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 font-black shadow-sm";
                              } else if (numVal >= 4) {
                                inputColorClass = "bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-600 font-black shadow-sm";
                              } else {
                                inputColorClass = "bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-400 dark:border-rose-600 font-black shadow-sm";
                              }
                            }

                            return (
                              <td key={c.id} className={`px-4 py-3 text-center border-l border-slate-100 dark:border-slate-800/60 transition-colors ${flash === "success" ? "flash-success" : flash === "danger" ? "flash-danger" : ""}`}>
                                <div className="relative inline-flex items-center justify-center">
                                  <input 
                                    ref={el => inputRefs.current[key] = el} 
                                    type="number" 
                                    min="0" 
                                    max={c.max_score} 
                                    step="0.5" 
                                    value={displayVal}
                                    onChange={e => handleGradeChange(student.cs_id, c.id, e.target.value)}
                                    onBlur={e => saveGrade(student.cs_id, c.id, e.target.value, c.max_score)}
                                    onKeyDown={e => handleKeyDown(e, sIdx, cIdx)}
                                    placeholder="—"
                                    className={`w-20 h-11 text-center font-['Outfit'] font-black text-lg rounded-2xl border-2 transition-all outline-none ${inputColorClass}`}
                                  />
                                  {isSaving && (
                                    <div className="absolute -right-3 top-1/2 -translate-y-1/2">
                                      <div className="w-2.5 h-2.5 rounded-full animate-ping bg-blue-600" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="hidden sm:table-cell px-4 py-3 border-l border-slate-100 dark:border-slate-800/60 text-center">
                            {(() => {
                              const spark = sparklineData[student.cs_id]?.filter(d => d.pct !== null);
                              if (!spark || spark.length < 2) return <span className="font-bold text-xs text-slate-300 dark:text-slate-600">—</span>;
                              const last = spark[spark.length - 1].pct;
                              const prev = spark[spark.length - 2].pct;
                              const isUp = last >= prev;
                              return (
                                <div className="flex items-center justify-center">
                                  <span className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 border shadow-sm ${
                                    isUp 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" 
                                      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                  }`}>
                                    {isUp ? "▲" : "▼"} {last}%
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map(student => (
                  <div key={student.cs_id} className="p-6 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-['Outfit'] font-extrabold text-white"
                          style={{ background: 'linear-gradient(135deg, hsl(262 83% 60%), hsl(185 85% 60%))' }}>{student.name[0].toUpperCase()}</div>
                        <button onClick={() => toggleAttendance(student.cs_id)} 
                          className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${attendance[student.cs_id] !== false ? 'bg-emerald-500' : 'bg-red-500'}`}>
                          {attendance[student.cs_id] !== false ? <CheckCircle2 className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
                        </button>
                      </div>
                      <div>
                        <h3 className="font-['Outfit'] font-extrabold" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>{student.name}</h3>
                        <p className="font-['DM_Sans'] font-bold text-xs uppercase tracking-widest" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>Eval. Diaria</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {criteria.map(c => {
                        const key = `${student.cs_id}_${c.id}`;
                        const val = grades[key] ?? "";
                        const inheritedVal = inheritedGrades[`${student.cs_id}_${c.name}`] ?? "";
                        const displayVal = val !== "" ? val : inheritedVal;
                        return (
                          <div key={c.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: isDark ? 'hsl(0 0% 100% / 0.03)' : 'hsl(0 0% 0% / 0.02)' }}>
                            <span className="font-['DM_Sans'] font-bold text-xs uppercase tracking-wider truncate flex-1" style={{ color: isDark ? 'hsl(220 10% 60%)' : 'hsl(220 8% 35%)' }}>{c.name}</span>
                            <input type="number" min="0" max={c.max_score} step="0.5" value={displayVal} 
                              onChange={e => handleGradeChange(student.cs_id, c.id, e.target.value)} 
                              className="w-14 h-9 text-center font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {selectedStudentForReport && (
        <StudentReportModal
          student={selectedStudentForReport}
          className={className}
          criteria={criteria}
          grades={grades}
          attendance={attendance}
          onClose={() => setSelectedStudentForReport(null)}
        />
      )}

      <style>{`
        @keyframes gradient-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .flash-success { background: hsl(140 70% 20% / 0.3) !important; }
        .flash-danger { background: hsl(0 70% 20% / 0.3) !important; }
      `}</style>
    </div>
  );
}