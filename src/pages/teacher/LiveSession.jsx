import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  CheckCircle2, X, Users, XCircle, ChevronLeft, ChevronRight, LayoutGrid, 
  ArrowLeft, PlusCircle, Sparkles, Trash2, TrendingUp, Pencil, Download, 
  Printer, Wifi, WifiOff, MessageSquareQuote, Clock, AlertCircle, Check, 
  FileText, CheckSquare, ShieldAlert, Sparkle
} from "lucide-react";
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
  const [observations, setObservations] = useState({});
  const [attendanceFilter, setAttendanceFilter] = useState("all"); // all | present | late | justified | absent | with_obs
  const [selectedStudentForObs, setSelectedStudentForObs] = useState(null);
  const [obsModalText, setObsModalText] = useState("");
  const [savingObs, setSavingObs] = useState(false);
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
      .channel(`live-session-grades-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "grades" }, () => {
        fetchGrades();
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [id]);

  const fetchData = async () => {
    try {
      // 1. Fire core requests in parallel on millisecond 0
      const [sessionRes, critRes, attRes] = await Promise.all([
        supabase
          .from("sessions")
          .select("*, classes(id, name, class_students(id, student_id, student_name, dni, profiles(full_name))))")
          .eq("id", id)
          .single(),
        supabase
          .from("session_criteria")
          .select("*, grades(*)")
          .eq("session_id", id)
          .order("created_at"),
        supabase
          .from("attendance")
          .select("*")
          .eq("session_id", id),
      ]);

      const s = sessionRes.data;
      if (!s) {
        setLoading(false);
        return;
      }

      setSession(s);
      setClassName(s.classes?.name || "Clase");

      // Extract and map students (with fallback if nested relation isn't populated)
      let rawStudents = s.classes?.class_students || [];
      if (!rawStudents.length && s.classes?.id) {
        const { data: stFallback } = await supabase
          .from("class_students")
          .select("id, student_id, student_name, dni, profiles(full_name)")
          .eq("class_id", s.classes.id);
        rawStudents = stFallback || [];
      }

      const mappedStudents = rawStudents.map(st => ({
        cs_id: st.id,
        student_id: st.student_id,
        dni: st.dni,
        name: st.profiles?.full_name || st.student_name || "Sin nombre",
      }));
      setStudents(mappedStudents);

      // Criteria & Current Session Grades from single nested join
      const cData = critRes.data || [];
      setCriteria(cData);

      const gMap = {};
      cData.forEach(c => {
        (c.grades || []).forEach(g => {
          gMap[`${g.class_student_id}_${c.id}`] = g.score;
        });
      });
      setGrades(gMap);

      // Attendance & Observations map
      const aMap = {};
      const obsMap = {};
      (attRes.data || []).forEach(a => {
        aMap[a.class_student_id] = {
          status: a.status || (a.is_present ? "present" : "absent"),
          is_present: a.is_present !== false,
          observation: a.observation || ""
        };
        if (a.observation) {
          obsMap[a.class_student_id] = a.observation;
        }
      });
      setAttendance(aMap);
      setObservations(obsMap);

      // TABLE READY! Immediately reveal the interface to the teacher (0 waiting)
      setLoading(false);

      // 2. Load historical fallback grades and sparklines in the background (non-blocking)
      if (s.classes?.id) {
        loadHistoricalAndSparklines(s.classes.id, id, mappedStudents);
      }
    } catch (err) {
      console.error("Error al cargar la clase:", err);
      setLoading(false);
    }
  };

  // Background non-blocking loader for inherited grades and sparklines in a single query
  const loadHistoricalAndSparklines = async (classId, currentSessionId, studentList) => {
    try {
      const { data: pastSessions } = await supabase
        .from("sessions")
        .select("id, date, session_criteria(id, name, max_score, grades(class_student_id, score, updated_at))")
        .eq("class_id", classId)
        .order("date", { ascending: false })
        .limit(6);

      if (!pastSessions || pastSessions.length === 0) return;

      // 1. Compute inherited grades from previous sessions
      const otherSessions = pastSessions.filter(ps => ps.id !== currentSessionId);
      const iMap = {};
      otherSessions.forEach(os => {
        (os.session_criteria || []).forEach(crit => {
          (crit.grades || []).forEach(g => {
            const iKey = `${g.class_student_id}_${crit.name}`;
            if (iMap[iKey] === undefined) {
              iMap[iKey] = g.score;
            }
          });
        });
      });
      setInheritedGrades(iMap);

      // 2. Compute sparkline trends
      if (pastSessions.length > 1) {
        const sData = {};
        const sessionsOldFirst = [...pastSessions].reverse();
        sessionsOldFirst.forEach(ss => {
          const critList = ss.session_criteria || [];
          const maxTotal = critList.reduce((sum, c) => sum + (c.max_score || 0), 0);
          studentList.forEach(st => {
            if (!sData[st.cs_id]) sData[st.cs_id] = [];
            const total = critList.reduce((sum, c) => {
              const g = (c.grades || []).find(gr => gr.class_student_id === st.cs_id);
              return sum + (g ? Number(g.score) : 0);
            }, 0);
            sData[st.cs_id].push({ pct: maxTotal > 0 ? Math.round((total / maxTotal) * 100) : null });
          });
        });
        setSparklineData(sData);
      }
    } catch (e) {
      console.error("Error cargando historial de notas:", e);
    }
  };

  const fetchGrades = async () => {
    if (!criteria.length) return;
    const cIds = criteria.map(c => c.id);
    const { data: gData } = await supabase.from("grades").select("class_student_id, criteria_id, score").in("criteria_id", cIds);
    const map = {};
    (gData || []).forEach(g => { map[`${g.class_student_id}_${g.criteria_id}`] = g.score; });
    setGrades(prev => ({ ...prev, ...map }));
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
    setTimeout(() => {
      setGradeFlash(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 900);
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

  const getAttendanceStatus = (csId) => {
    const rec = attendance[csId];
    if (!rec) return "present";
    if (typeof rec === "string") return rec;
    if (typeof rec === "boolean") return rec ? "present" : "absent";
    return rec.status || (rec.is_present ? "present" : "absent");
  };

  const isStudentPresent = (csId) => {
    const st = getAttendanceStatus(csId);
    return st === "present" || st === "late";
  };

  const setStudentAttendanceStatus = async (csId, newStatus) => {
    const isPres = newStatus === "present" || newStatus === "late";
    const existingObs = observations[csId] || attendance[csId]?.observation || "";
    
    setAttendance(prev => ({
      ...prev,
      [csId]: {
        status: newStatus,
        is_present: isPres,
        observation: existingObs
      }
    }));

    if (!navigator.onLine) {
      queueOfflineUpdate("attendance", { session_id: id, class_student_id: csId, status: newStatus, is_present: isPres });
      setPendingQueueCount(getOfflineQueue().length);
    } else {
      await supabase.from("attendance").upsert({
        session_id: id,
        class_student_id: csId,
        status: newStatus,
        is_present: isPres,
        observation: existingObs || null
      }, { onConflict: "session_id,class_student_id" });
    }

    // Recompensa Pokémon por asistencia (+20 XP al marcar presente o tarde)
    if (isPres) {
      const student = students.find(s => s.cs_id === csId);
      if (student?.student_id) {
        addXPToAllStudentPokemon(student.student_id, 20);
      }
    }
  };

  const saveStudentObservation = async (csId, newObs) => {
    const cleanObs = newObs?.trim() || "";
    const currentStatus = getAttendanceStatus(csId);
    const isPres = currentStatus === "present" || currentStatus === "late";

    setObservations(prev => ({ ...prev, [csId]: cleanObs }));
    setAttendance(prev => ({
      ...prev,
      [csId]: {
        ...(prev[csId] || {}),
        status: currentStatus,
        is_present: isPres,
        observation: cleanObs
      }
    }));

    await supabase.from("attendance").upsert({
      session_id: id,
      class_student_id: csId,
      status: currentStatus,
      is_present: isPres,
      observation: cleanObs || null
    }, { onConflict: "session_id,class_student_id" });

    toast("Observación pedagógica guardada", "success");
    setSelectedStudentForObs(null);
  };

  const deleteStudentObservation = async (csId) => {
    const currentStatus = getAttendanceStatus(csId);
    const isPres = currentStatus === "present" || currentStatus === "late";

    setObservations(prev => {
      const copy = { ...prev };
      delete copy[csId];
      return copy;
    });

    setAttendance(prev => ({
      ...prev,
      [csId]: {
        ...(prev[csId] || {}),
        status: currentStatus,
        is_present: isPres,
        observation: null
      }
    }));

    await supabase.from("attendance").upsert({
      session_id: id,
      class_student_id: csId,
      status: currentStatus,
      is_present: isPres,
      observation: null
    }, { onConflict: "session_id,class_student_id" });

    toast("Observación eliminada", "info");
    setSelectedStudentForObs(null);
  };

  const markAllAttendance = async (statusToSet = "present") => {
    const isPres = statusToSet === "present" || statusToSet === "late";
    const newAtt = { ...attendance };
    const records = [];

    students.forEach(s => {
      const existingObs = observations[s.cs_id] || attendance[s.cs_id]?.observation || "";
      newAtt[s.cs_id] = {
        status: statusToSet,
        is_present: isPres,
        observation: existingObs
      };
      records.push({
        session_id: id,
        class_student_id: s.cs_id,
        status: statusToSet,
        is_present: isPres,
        observation: existingObs || null
      });
    });

    setAttendance(newAtt);
    const { error } = await supabase.from("attendance").upsert(records, { onConflict: "session_id,class_student_id" });
    if (error) {
      toast("Error al guardar asistencia masiva: " + error.message, "error");
    } else {
      toast(statusToSet === "present" ? "¡Todos los alumnos marcados como Presentes!" : "Asistencia actualizada", "success");
    }
  };

  // Live attendance tally statistics
  const attStats = students.reduce((acc, s) => {
    const status = getAttendanceStatus(s.cs_id);
    if (status === "present") acc.present++;
    else if (status === "late") acc.late++;
    else if (status === "justified") acc.justified++;
    else if (status === "absent") acc.absent++;
    
    if (observations[s.cs_id] || attendance[s.cs_id]?.observation) {
      acc.withObs++;
    }
    return acc;
  }, { present: 0, late: 0, justified: 0, absent: 0, withObs: 0 });

  const totalStudents = students.length;
  const attendedCount = attStats.present + attStats.late;
  const attendanceRate = totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100) : 100;

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const status = getAttendanceStatus(s.cs_id);
    if (attendanceFilter === "present") return status === "present";
    if (attendanceFilter === "late") return status === "late";
    if (attendanceFilter === "absent") return status === "absent";
    if (attendanceFilter === "justified") return status === "justified";
    if (attendanceFilter === "with_obs") return Boolean(observations[s.cs_id] || attendance[s.cs_id]?.observation);
    return true;
  }).sort((a, b) => sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="relative">
        <div className="w-12 h-12 rounded-full animate-spin border-4 border-blue-600 border-t-transparent" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 relative bg-slate-50 font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-200/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-200/40 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link to={`/class/${session.class_id}`}>
            <button className="p-3 rounded-2xl transition-all hover:scale-105 bg-white border border-slate-200 shadow-sm">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-['Outfit'] font-black text-slate-900 tracking-tight">Evaluación en Vivo</h1>
            <p className="font-['DM_Sans'] font-bold text-xs mt-1 flex items-center gap-2 flex-wrap text-slate-500">
              <span>{className} · {format(new Date(session.date + "T12:00:00"), "d 'de' MMMM", { locale: es })}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg border ${
                (session.cuatrimestre || (new Date(session.date).getMonth() >= 6 ? 2 : 1)) === 2 
                  ? "bg-purple-50 text-purple-700 border-purple-200" 
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}>
                {(session.cuatrimestre || (new Date(session.date).getMonth() >= 6 ? 2 : 1))}º Cuatrimestre
              </span>
              <button onClick={() => { const newDate = prompt("Nueva fecha (YYYY-MM-DD):", session.date); if (newDate && newDate !== session.date) supabase.from("sessions").update({ date: newDate }).eq("id", id).then(() => setSession(prev => ({...prev, date: newDate}))); }} className="p-1 rounded-lg transition-all hover:scale-110 bg-slate-100 border border-slate-200">
                <Pencil className="w-3 h-3 text-slate-500" />
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
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
            />
            <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
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
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-2xl shadow-slate-900/5 overflow-hidden">
        {/* Executive Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 gap-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-['Outfit'] font-black text-2xl text-slate-900 tracking-tight">Planilla de Evaluaciones</h2>
              {/* Online / Offline Status Badge */}
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 border ${
                isOnline 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
              }`}>
                {isOnline ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                {isOnline ? "En línea" : `Sin conexión (${pendingQueueCount} pend.)`}
              </span>
            </div>
            <p className="font-['DM_Sans'] font-bold text-xs mt-1 uppercase tracking-widest text-slate-400">
              Atajo: Presioná [Enter] o [Tab] para navegar entre alumnos
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => exportClassToCSV(className || "Clase", students, criteria, grades, attendance, "all", observations)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl h-12 px-5 font-black flex items-center gap-2 text-xs uppercase tracking-wider transition-all border border-slate-200"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Excel / CSV
            </Button>
            <Button onClick={handleAddCriteria} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 px-6 font-black shadow-lg shadow-blue-500/20 flex items-center gap-2 text-xs uppercase tracking-wider transition-all">
              <PlusCircle className="w-5 h-5" /> Agregar Criterio
            </Button>
          </div>
        </div>

        {/* Attendance & Pedagogical Observations Control Panel */}
        <div className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200/80 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Tally Metrics */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">Asistencia:</span>
              
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{attStats.present} Presentes</span>
                <span className="text-emerald-500/80 font-bold ml-0.5">({attendanceRate}%)</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{attStats.late} Tardes</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-black">
                <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
                <span>{attStats.justified} Justif.</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-black">
                <X className="w-3.5 h-3.5 text-rose-600" />
                <span>{attStats.absent} Ausentes</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-black">
                <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-600" />
                <span>{attStats.withObs} con notas</span>
              </div>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAttendance("present")}
                className="rounded-xl font-bold text-xs h-9 px-3 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 gap-1.5"
                title="Marcar todos como presentes"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Marcar Todos Presentes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAttendance("absent")}
                className="rounded-xl font-bold text-xs h-9 px-3 border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 gap-1.5"
                title="Marcar todos como ausentes"
              >
                <X className="w-3.5 h-3.5 text-rose-500" /> Marcar Todos Ausentes
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 shrink-0">Filtrar lista:</span>
            {[
              { id: "all", label: `Todos (${students.length})` },
              { id: "present", label: `Presentes (${attStats.present})` },
              { id: "late", label: `Tardes (${attStats.late})` },
              { id: "justified", label: `Justificados (${attStats.justified})` },
              { id: "absent", label: `Ausentes (${attStats.absent})` },
              { id: "with_obs", label: `Con Observación (${attStats.withObs})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setAttendanceFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all shrink-0 ${
                  attendanceFilter === f.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                {f.label}
              </button>
            ))}
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
              <p className="font-['Outfit'] font-black text-2xl text-slate-900">No hay criterios de evaluación</p>
              <p className="font-['DM_Sans'] font-medium mt-2 text-slate-500">Definí los aspectos a evaluar en la clase de hoy</p>
              <Button onClick={handleAddCriteria} className="bg-blue-600 text-white mt-8 gap-2 rounded-2xl h-12 px-8 font-black uppercase text-xs tracking-wider shadow-lg shadow-blue-500/20">
                <PlusCircle className="w-5 h-5" /> Crear Criterio
              </Button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-24 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-['Outfit'] font-black text-slate-500">No se encontraron alumnos con el filtro seleccionado</p>
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                    <th onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="text-left px-6 py-5 font-['Outfit'] font-black text-xs uppercase tracking-widest text-slate-800 cursor-pointer hover:text-blue-600 transition-colors w-72">
                      Alumno & Asistencia
                    </th>
                    {criteria.map(c => (
                      <th key={c.id} className="px-4 py-5 text-center font-['Outfit'] font-black text-xs uppercase tracking-widest text-slate-800 relative group border-l border-slate-200 min-w-[130px]">
                        <div className="truncate font-black text-sm">{c.name}</div>
                        <div className="text-[10px] font-black text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md inline-block mt-1">
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
                    <th className="hidden sm:table-cell px-4 py-5 text-center font-['Outfit'] font-black text-xs uppercase tracking-widest text-slate-800 border-l border-slate-200 w-32">
                      Tendencia
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student, sIdx) => {
                      const names = student.name.split(" ");
                      const mobileName = names.length > 1 ? `${names[0]} ${names[1][0]}.` : names[0];
                      const studentObs = observations[student.cs_id] || attendance[student.cs_id]?.observation;

                      return (
                        <tr key={student.cs_id} className="group hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              {/* Top row: Avatar + Name + Report button */}
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-['Outfit'] font-black text-sm flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0">
                                  {student.name[0].toUpperCase()}
                                </div>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-['Outfit'] font-extrabold text-sm text-slate-900 tracking-tight truncate">
                                    <span className="sm:hidden">{mobileName}</span>
                                    <span className="hidden sm:inline">{student.name}</span>
                                  </span>
                                  {student.dni && (
                                    <span className="hidden xl:inline text-[10px] font-bold text-slate-400">
                                      · {student.dni}
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedStudentForReport(student); }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shrink-0"
                                    title="Imprimir Boletín / Informe PDF"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Bottom row: 4-state switcher + Observation button */}
                              <div className="flex items-center gap-2 pt-0.5">
                                {/* Segmented 4-state buttons */}
                                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                                  {[
                                    { key: "present", label: "P", full: "Presente", activeClass: "bg-emerald-600 text-white shadow-xs" },
                                    { key: "late", label: "T", full: "Tarde", activeClass: "bg-amber-500 text-white shadow-xs" },
                                    { key: "justified", label: "J", full: "Justificado", activeClass: "bg-purple-600 text-white shadow-xs" },
                                    { key: "absent", label: "A", full: "Ausente", activeClass: "bg-rose-600 text-white shadow-xs" }
                                  ].map(s => {
                                    const currentStatus = getAttendanceStatus(student.cs_id);
                                    const isSelected = currentStatus === s.key;
                                    return (
                                      <button
                                        key={s.key}
                                        type="button"
                                        onClick={() => setStudentAttendanceStatus(student.cs_id, s.key)}
                                        title={`Marcar como ${s.full}`}
                                        className={`w-6 h-6 rounded-md text-[10px] font-black transition-all flex items-center justify-center ${
                                          isSelected ? s.activeClass : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                                        }`}
                                      >
                                        {s.label}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Observation Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStudentForObs(student);
                                    setObsModalText(studentObs || "");
                                  }}
                                  title={studentObs ? `Observación: "${studentObs}"` : "Agregar observación pedagógica"}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all border ${
                                    studentObs
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                      : "bg-white text-slate-400 border-slate-200 hover:text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <MessageSquareQuote className={`w-3 h-3 ${studentObs ? "text-indigo-600" : "text-slate-400"}`} />
                                  {studentObs ? (
                                    <span className="max-w-[70px] truncate normal-case font-bold">{studentObs}</span>
                                  ) : (
                                    <span>+ Nota</span>
                                  )}
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

                            let inputColorClass = "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 focus:bg-white focus:text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20";
                            
                            if (isInherited) {
                              inputColorClass = "bg-purple-50 text-purple-900 border-purple-300 font-black shadow-sm";
                            } else if (val !== "") {
                              if (numVal >= 7) {
                                inputColorClass = "bg-emerald-50 text-emerald-800 border-emerald-400 font-black shadow-sm";
                              } else if (numVal >= 4) {
                                inputColorClass = "bg-amber-50 text-amber-900 border-amber-400 font-black shadow-sm";
                              } else {
                                inputColorClass = "bg-rose-50 text-rose-900 border-rose-400 font-black shadow-sm";
                              }
                            }

                            return (
                              <td key={c.id} className={`px-4 py-3 text-center border-l border-slate-100 transition-colors ${flash === "success" ? "flash-success" : flash === "danger" ? "flash-danger" : ""}`}>
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
                          <td className="hidden sm:table-cell px-4 py-3 border-l border-slate-100 text-center">
                            {(() => {
                              const spark = sparklineData[student.cs_id]?.filter(d => d.pct !== null);
                              if (!spark || spark.length < 2) return <span className="font-bold text-xs text-slate-300">—</span>;
                              const last = spark[spark.length - 1].pct;
                              const prev = spark[spark.length - 2].pct;
                              const isUp = last >= prev;
                              return (
                                <div className="flex items-center justify-center">
                                  <span className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 border shadow-sm ${
                                    isUp 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                      : "bg-rose-50 text-rose-700 border-rose-200"
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
                {filteredStudents.map(student => {
                  const studentObs = observations[student.cs_id] || attendance[student.cs_id]?.observation;
                  return (
                    <div key={student.cs_id} className="p-6 rounded-3xl transition-all hover:shadow-xl bg-white border border-slate-200/80 shadow-md shadow-slate-900/5 space-y-4">
                      {/* Card Header with 4-state switcher and Obs button */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-['Outfit'] font-black text-white text-base bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20 shrink-0">
                            {student.name[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-['Outfit'] font-extrabold text-slate-900 text-base leading-tight">{student.name}</h3>
                            <p className="font-['DM_Sans'] font-bold text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">
                              {student.dni ? `DNI: ${student.dni}` : "Alumno"}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedStudentForReport(student); }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shrink-0"
                          title="Imprimir Boletín"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Attendance 4-state switcher & Obs row */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                          {[
                            { key: "present", label: "P", full: "Presente", activeClass: "bg-emerald-600 text-white shadow-xs" },
                            { key: "late", label: "T", full: "Tarde", activeClass: "bg-amber-500 text-white shadow-xs" },
                            { key: "justified", label: "J", full: "Justificado", activeClass: "bg-purple-600 text-white shadow-xs" },
                            { key: "absent", label: "A", full: "Ausente", activeClass: "bg-rose-600 text-white shadow-xs" }
                          ].map(s => {
                            const currentStatus = getAttendanceStatus(student.cs_id);
                            const isSelected = currentStatus === s.key;
                            return (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => setStudentAttendanceStatus(student.cs_id, s.key)}
                                title={`Marcar como ${s.full}`}
                                className={`w-6 h-6 rounded-md text-[10px] font-black transition-all flex items-center justify-center ${
                                  isSelected ? s.activeClass : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                                }`}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForObs(student);
                            setObsModalText(studentObs || "");
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                            studentObs
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{studentObs ? "Nota guardada" : "+ Nota"}</span>
                        </button>
                      </div>

                      {/* Observation snippet if exists */}
                      {studentObs && (
                        <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs italic text-indigo-900 flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <p className="truncate">{studentObs}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        {criteria.map(c => {
                          const key = `${student.cs_id}_${c.id}`;
                          const val = grades[key] ?? "";
                          const inheritedVal = inheritedGrades[`${student.cs_id}_${c.name}`] ?? "";
                          const displayVal = val !== "" ? val : inheritedVal;
                          return (
                            <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                              <span className="font-['DM_Sans'] font-bold text-xs uppercase tracking-wider truncate flex-1 text-slate-700">{c.name}</span>
                              <input type="number" min="0" max={c.max_score} step="0.5" value={displayVal} 
                                onChange={e => handleGradeChange(student.cs_id, c.id, e.target.value)} 
                                onBlur={e => saveGrade(student.cs_id, c.id, e.target.value, c.max_score)}
                                className="w-16 h-10 text-center font-['Outfit'] font-black text-base bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      {/* Observation Modal */}
      {selectedStudentForObs && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in duration-300 border border-slate-200 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <MessageSquareQuote className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-black text-xl text-slate-900">Observación de Clase</h3>
                  <p className="text-slate-500 text-xs font-medium">
                    {selectedStudentForObs.name} · {format(new Date(session.date + "T12:00:00"), "d 'de' MMMM", { locale: es })}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudentForObs(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick tags chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Etiquetas rápidas sugeridas:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "💡 Gran participación en clase",
                  "⭐ Trabajo destacado",
                  "🤝 Excelente compañerismo",
                  "📋 Tarea incompleta",
                  "⚠️ Falta de entrega / materiales",
                  "🩺 Retiro por motivos de salud",
                  "🎯 Superó los objetivos planteados",
                  "🔍 Requiere apoyo y refuerzo en el tema"
                ].map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setObsModalText(prev => prev ? `${prev}. ${tag}` : tag)}
                    className="text-[11px] font-bold bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-xl transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Comentario pedagógico del docente:</label>
              <textarea
                rows={4}
                value={obsModalText}
                onChange={(e) => setObsModalText(e.target.value)}
                placeholder="Escribí aquí observaciones cualitativas, dificultades, logros o notas para el informe del alumno..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/20 transition-all resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {observations[selectedStudentForObs.cs_id] ? (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => deleteStudentObservation(selectedStudentForObs.cs_id)}
                  className="text-rose-600 hover:bg-rose-50 rounded-xl h-10 px-3 text-xs font-bold gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Borrar nota
                </Button>
              ) : <div />}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedStudentForObs(null)}
                  className="rounded-xl h-10 px-4 text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => saveStudentObservation(selectedStudentForObs.cs_id, obsModalText)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  <Check className="w-4 h-4" /> Guardar Observación
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedStudentForReport && (
        <StudentReportModal
          student={selectedStudentForReport}
          className={className}
          criteria={criteria}
          grades={grades}
          attendance={attendance}
          observation={observations[selectedStudentForReport.cs_id] || attendance[selectedStudentForReport.cs_id]?.observation || ""}
          onSaveObservation={saveStudentObservation}
          onClose={() => setSelectedStudentForReport(null)}
        />
      )}

      <style>{`
        .flash-success { background: hsl(140 70% 90%) !important; }
        .flash-danger { background: hsl(0 70% 90%) !important; }
      `}</style>
    </div>
  );
}