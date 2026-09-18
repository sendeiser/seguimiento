import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "../../providers/ToastProvider";
import { 
  CalendarPlus, Users, Copy, Check, Plus, Link as LinkIcon, 
  Pencil, Trash2, X, ArrowLeft, Download, Trophy, 
  ShoppingBag, Shield, Star, Swords, Search, CheckCircle2, 
  ShoppingCart, Flame, AlertCircle, Coins as LucideCoins, ExternalLink, UserPlus,
  Gamepad2, Binary, Brain, Zap, BarChart3, Lock, Puzzle,
  UserCheck, Clock, MessageSquareQuote, FileText, CheckSquare, ShieldAlert, Sparkles,
  Share2, QrCode, MessageCircle, ShieldCheck
} from "lucide-react";
import { exportAttendanceMatrixToCSV } from "../../lib/reportExporter";
import { RewardIcon } from "../../lib/skinThemes";
import TutorLinkShareModal from "../../components/teacher/TutorLinkShareModal";

const BASE_URL = window.location.origin;

export default function ClassView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const [classData, setClassData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [houses, setHouses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("sessions"); // sessions | students | attendance | gamification | arena
  const [arenaProgress, setArenaProgress] = useState([]);
  const [classDuels, setClassDuels] = useState([]);

  // Attendance Module State
  const [allAttendance, setAllAttendance] = useState([]);
  const [attendanceRiskFilter, setAttendanceRiskFilter] = useState("all"); // "all" | "risk"
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [quickAttendanceModal, setQuickAttendanceModal] = useState(null); // { student, session, currentRecord }
  const [quickObsText, setQuickObsText] = useState("");
  const [savingQuickAtt, setSavingQuickAtt] = useState(false);

  // Tutor Portal Share Module State
  const [showTutorShareModal, setShowTutorShareModal] = useState(false);
  const [tutorUpdating, setTutorUpdating] = useState(false);
  const [tutorCopied, setTutorCopied] = useState(false);
  const [tutorShowQR, setTutorShowQR] = useState(false);
  const [editingDniStudentId, setEditingDniStudentId] = useState(null);
  const [tempDniInput, setTempDniInput] = useState("");

  // Cuatrimestre state
  const [activeCuatrimestre, setActiveCuatrimestre] = useState(1);
  const [cuatrimestreFilter, setCuatrimestreFilter] = useState("all"); // "all" | "1" | "2"
  const [showCuatrimestreModal, setShowCuatrimestreModal] = useState(false);

  // Modals state
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [modalForm, setModalForm] = useState({ name: "", description: "", cost_coins: 100, icon: "🎁", color: "#3b82f6" });
  const [sessionForm, setSessionForm] = useState({ date: new Date().toISOString().split("T")[0], cuatrimestre: 1 });

  // Student management state
  const [newStudentName, setNewStudentName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // 1. Fetch core class data and attendance in parallel
      const [
        { data: cls }, 
        { data: sData }, 
        { data: stData }, 
        { data: rwData }, 
        { data: hData },
        { data: attData }
      ] = await Promise.all([
        supabase.from("classes").select("*").eq("id", id).single(),
        supabase.from("sessions").select("*").eq("class_id", id).order("date", { ascending: false }),
        supabase.from("class_students").select("id, student_id, student_name, public_token, house_id, dni, profiles(full_name)").eq("class_id", id),
        supabase.from("rewards").select("*").eq("class_id", id).order("created_at", { ascending: false }),
        supabase.from("class_houses").select("*").eq("class_id", id).order("created_at", { ascending: false }),
        supabase.from("attendance").select("*, sessions!inner(class_id)").eq("sessions.class_id", id)
      ]);

      // Ensure all attendance records are captured (with fallback if needed)
      let finalAttendance = attData || [];
      if (!finalAttendance.length && sData?.length) {
        const sessionIds = sData.map(s => s.id);
        const { data: fallbackAtt } = await supabase.from("attendance").select("*").in("session_id", sessionIds);
        if (fallbackAtt?.length) finalAttendance = fallbackAtt;
      }
      setAllAttendance(finalAttendance);

      setClassData(cls);
      setSessions(sData || []);
      setStudents((stData || []).sort((a, b) => {
         const nameA = getStudentName(a);
         const nameB = getStudentName(b);
         return nameA.localeCompare(nameB);
      }));
      setRewards(rwData || []);
      setHouses(hData || []);

      // CORE CLASS DATA READY! Reveal UI to teacher immediately
      setLoading(false);

      // 2. Fetch class purchases and arena progress in background, strictly scoped to this class
      const classRewardIds = (rwData || []).map(r => r.id);
      const classStudentIds = (stData || []).map(s => s.id);

      if (classRewardIds.length > 0) {
        supabase
          .from("student_purchases")
          .select("*, rewards(name, icon), profiles(full_name)")
          .in("reward_id", classRewardIds)
          .order("created_at", { ascending: false })
          .then(({ data: pData }) => setPurchases(pData || []));
      } else {
        setPurchases([]);
      }

      if (classStudentIds.length > 0) {
        supabase
          .from("student_game_progress")
          .select("*")
          .in("class_student_id", classStudentIds)
          .then(({ data: pData2 }) => setArenaProgress(pData2 || []));

        supabase
          .from("challenges")
          .select("*, challenger:class_students!challenges_challenger_cs_id_fkey(id, student_name), challenged:class_students!challenges_challenged_cs_id_fkey(id, student_name)")
          .eq("class_id", id)
          .order("created_at", { ascending: false })
          .then(({ data: dData }) => setClassDuels(dData || []));
      } else {
        setArenaProgress([]);
        setClassDuels([]);
      }
    } catch (err) {
      console.error("Error total en fetchAll:", err);
      setLoading(false);
    }
  };

  const getStudentName = (st) => {
    if (!st) return "Cargando...";
    return st.profiles?.full_name || st.student_name || "Sin nombre";
  };

  // --- STUDENT ACTIONS ---
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const { error } = await supabase.from("class_students").insert([{ class_id: id, student_name: newStudentName }]);
    if (!error) { setNewStudentName(""); fetchAll(); }
    else { console.error("Error agregando alumno:", error); }
  };

  const handleDeleteStudent = async (sid) => {
    if (!(await confirm("¿Eliminar alumno de esta clase?"))) return;
    await supabase.from("class_students").delete().eq("id", sid);
    fetchAll();
  };

  const updateStudentHouse = async (sid, hid) => {
    await supabase.from("class_students").update({ house_id: hid || null }).eq("id", sid);
    fetchAll();
  };

  const updateStudentDni = async (sid, dni) => {
    await supabase.from("class_students").update({ dni }).eq("id", sid);
    // Optimistic update
    setStudents(prev => prev.map(s => s.id === sid ? { ...s, dni } : s));
  };

  const handleToggleTutorPortal = async () => {
    const currentStatus = classData?.tutor_portal_enabled !== false;
    const newStatus = !currentStatus;
    setTutorUpdating(true);
    try {
      const { error } = await supabase
        .from("classes")
        .update({ tutor_portal_enabled: newStatus })
        .eq("id", id);
      if (error) throw error;
      setClassData(prev => ({ ...prev, tutor_portal_enabled: newStatus }));
      toast(
        newStatus
          ? "✅ Enlace de boletín HABILITADO para familias y alumnos"
          : "⏸️ Enlace de boletín DESHABILITADO temporalmente",
        newStatus ? "success" : "info"
      );
    } catch (err) {
      console.error("Error al actualizar estado del portal:", err);
      toast("Error al actualizar el estado del enlace", "error");
    } finally {
      setTutorUpdating(false);
    }
  };

  const updateStudentAttendanceRecord = async (sessionId, classStudentId, newStatus, newObservation) => {
    setSavingQuickAtt(true);
    const isPres = newStatus === "present" || newStatus === "late";
    const cleanObs = newObservation !== undefined ? newObservation.trim() : undefined;

    const payload = {
      session_id: sessionId,
      class_student_id: classStudentId,
      status: newStatus,
      is_present: isPres
    };
    if (cleanObs !== undefined) {
      payload.observation = cleanObs || null;
    }

    const { error } = await supabase.from("attendance").upsert(payload, { onConflict: "session_id,class_student_id" });
    if (error) {
      toast("Error al actualizar asistencia: " + error.message, "error");
    } else {
      toast("Asistencia actualizada correctamente", "success");
      setAllAttendance(prev => {
        const idx = prev.findIndex(a => a.session_id === sessionId && a.class_student_id === classStudentId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...payload };
          return updated;
        } else {
          return [...prev, payload];
        }
      });
      setQuickAttendanceModal(null);
    }
    setSavingQuickAtt(false);
  };

  // --- REWARD ACTIONS ---
  const handleSaveReward = async () => {
    if (!modalForm.name.trim()) return;
    const payload = { 
      class_id: id, 
      name: modalForm.name, 
      description: modalForm.description, 
      cost_coins: parseInt(modalForm.cost_coins), 
      icon: modalForm.icon,
      category: modalForm.category || 'item',
      metadata: modalForm.category === 'game_pass' ? {
        game_name: modalForm.game_name,
        duration_minutes: parseInt(modalForm.duration_minutes || 60)
      } : {}
    };

    if (editingItem) {
      await supabase.from("rewards").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("rewards").insert([payload]);
    }
    setShowRewardModal(false);
    fetchAll();
  };

  const handleDeleteReward = async (rid) => {
    if (!(await confirm("¿Eliminar este premio?"))) return;
    await supabase.from("rewards").delete().eq("id", rid);
    fetchAll();
  };

  // --- HOUSE ACTIONS ---
  const handleSaveHouse = async () => {
    if (!modalForm.name.trim()) return;
    const payload = { 
      class_id: id, 
      name: modalForm.name, 
      color: modalForm.color, 
      icon: modalForm.icon 
    };

    if (editingItem) {
      await supabase.from("class_houses").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("class_houses").insert([payload]);
    }
    setShowHouseModal(false);
    fetchAll();
  };

  const handleDeleteHouse = async (hid) => {
    if (!(await confirm("¿Eliminar esta casa?"))) return;
    await supabase.from("class_houses").delete().eq("id", hid);
    fetchAll();
  };

  // --- PURCHASE ACTIONS ---
  const handleUpdatePurchaseStatus = async (pid, status) => {
    await supabase.from("student_purchases").update({ status }).eq("id", pid);
    fetchAll();
  };

  // --- SESSION ACTIONS ---
  const handleSaveSession = async () => {
    const { date, cuatrimestre } = sessionForm;
    if (!date) return;

    const cuatrimestreVal = cuatrimestre || activeCuatrimestre || (new Date(date).getMonth() >= 6 ? 2 : 1);

    if (editingSession) {
      let { error } = await supabase.from("sessions").update({ date, cuatrimestre: cuatrimestreVal }).eq("id", editingSession.id);
      if (error && (error.message?.includes("cuatrimestre") || error.code === "PGRST204")) {
        const { error: fallbackErr } = await supabase.from("sessions").update({ date }).eq("id", editingSession.id);
        if (fallbackErr) { toast(fallbackErr.message, "error"); return; }
      } else if (error) {
        toast(error.message, "error");
        return;
      }
    } else {
      const existing = sessions.find(s => s.date === date);
      if (existing) { navigate(`/session/${existing.id}`); return; }

      let sessionData = null;
      let sError = null;

      const res1 = await supabase
        .from("sessions")
        .insert([{ class_id: id, date, cuatrimestre: cuatrimestreVal }])
        .select()
        .single();
      
      sessionData = res1.data;
      sError = res1.error;

      if (sError && (sError.message?.includes("cuatrimestre") || sError.code === "PGRST204")) {
        const res2 = await supabase
          .from("sessions")
          .insert([{ class_id: id, date }])
          .select()
          .single();
        sessionData = res2.data;
        sError = res2.error;
      }
      
      if (sError) { toast(sError.message, "error"); return; }

      // Cloning logic: Copy criteria and grades from last session
      const lastSession = sessions[0]; // sessions is sorted by date desc
      let criteriaToUse = [];

      if (lastSession) {
        const { data: lastCriteria } = await supabase
          .from("session_criteria")
          .select("*")
          .eq("session_id", lastSession.id);

        if (lastCriteria && lastCriteria.length > 0) {
          const { data: newCriteria, error: cError } = await supabase
            .from("session_criteria")
            .insert(lastCriteria.map(c => ({ session_id: sessionData.id, name: c.name, max_score: c.max_score })))
            .select();

          if (!cError && newCriteria) {
            // Fetch grades from last session to clone them
            const { data: lastGrades } = await supabase
              .from("grades")
              .select("*")
              .in("criteria_id", lastCriteria.map(c => c.id));

            if (lastGrades && lastGrades.length > 0) {
              const critMap = {};
              newCriteria.forEach(nc => {
                const oldC = lastCriteria.find(oc => oc.name === nc.name);
                if (oldC) critMap[oldC.id] = nc.id;
              });

              const newGrades = lastGrades.map(lg => ({
                class_student_id: lg.class_student_id,
                criteria_id: critMap[lg.criteria_id],
                score: lg.score,
                comment: lg.comment,
                student_id: lg.student_id
              })).filter(ng => ng.criteria_id);

              if (newGrades.length > 0) {
                await supabase.from("grades").insert(newGrades);
              }
            }
          }
        } else {
          // Fallback if last session had no criteria
          const defaultCriteria = ["Conducta", "Participación", "Carpeta", "Actividades"];
          await supabase.from("session_criteria").insert(
            defaultCriteria.map(name => ({ session_id: sessionData.id, name, max_score: 10 }))
          );
        }
      } else {
        // Fallback if no last session exists
        const defaultCriteria = ["Conducta", "Participación", "Carpeta", "Actividades"];
        await supabase.from("session_criteria").insert(
          defaultCriteria.map(name => ({ session_id: sessionData.id, name, max_score: 10 }))
        );
      }
      
      navigate(`/session/${sessionData.id}`);
    }
    setShowSessionModal(false);
    setEditingSession(null);
    fetchAll();
  };

  const createSession = () => {
    setEditingSession(null);
    setSessionForm({ 
      date: new Date().toISOString().split("T")[0], 
      cuatrimestre: activeCuatrimestre 
    });
    setShowSessionModal(true);
  };

  const handleEditSession = (s) => {
    setEditingSession(s);
    setSessionForm({ 
      date: s.date, 
      cuatrimestre: s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1) 
    });
    setShowSessionModal(true);
  };

  const handleResetCuatrimestreGrades = async (cuatrimestreNumber) => {
    const label = cuatrimestreNumber === 2 ? "2º Cuatrimestre" : "1º Cuatrimestre";
    const confirmMessage = `¿Estás seguro de que deseas RESETEAR únicamente las notas del ${label}? Las notas de los otros periodos no serán afectadas.`;
    
    if (!(await confirm(confirmMessage))) return;

    try {
      const targetSessions = sessions.filter(s => (s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1)) === cuatrimestreNumber);
      if (targetSessions.length === 0) {
        toast(`No hay sesiones registradas en el ${label}`, "info");
        return;
      }

      const sessionIds = targetSessions.map(s => s.id);
      const { data: criteriaData } = await supabase.from("session_criteria").select("id").in("session_id", sessionIds);
      if (criteriaData && criteriaData.length > 0) {
        const criteriaIds = criteriaData.map(c => c.id);
        await supabase.from("grades").delete().in("criteria_id", criteriaIds);
      }

      toast(`Notas del ${label} reseteadas con éxito`, "success");
      setShowCuatrimestreModal(false);
      fetchAll();
    } catch (err) {
      console.error("Error al resetear cuatrimestre:", err);
      toast("Error al resetear las notas del cuatrimestre", "error");
    }
  };

  const handleDeleteSession = async (sid) => {
    if (!(await confirm("¿Eliminar esta sesión y todas sus notas?"))) return;
    const { error } = await supabase.from("sessions").delete().eq("id", sid);
    if (error) toast(error.message, "error");
    else fetchAll();
  };

  const copyClassLink = () => {
    if (!classData?.short_code) return;
    navigator.clipboard.writeText(`${BASE_URL}/j/${classData.short_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  const filteredStudents = students.filter(st => getStudentName(st).toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/home">
            <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-white">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{classData?.name}</h1>
            <p className="text-slate-500 mt-2 font-medium text-sm flex items-center gap-2">
               <Shield className="w-4 h-4 text-blue-500" />
               Docente • Gestión de RPG y Academia
            </p>
          </div>
        </div>

        {/* Quick Action Button for Tutor Portal */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowTutorShareModal(true)}
            className={`rounded-2xl h-12 px-5 font-black text-xs uppercase tracking-wider flex items-center gap-2.5 border transition-all shadow-sm active:scale-95 ${
              classData?.tutor_portal_enabled !== false
                ? "bg-white text-blue-700 hover:bg-blue-50 border-blue-200"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-300"
            }`}
          >
            <Share2 className="w-4 h-4 text-blue-600" />
            <span>Boletín Familias (DNI)</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                classData?.tutor_portal_enabled !== false
                  ? "bg-emerald-500 ring-4 ring-emerald-100"
                  : "bg-rose-500 ring-4 ring-rose-100"
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-[24px] w-fit border border-slate-200/50 min-w-full sm:min-w-0">
          <button onClick={() => setActiveTab("sessions")} className={`tab-btn flex-shrink-0 ${activeTab === 'sessions' ? 'active' : ''}`}><CalendarPlus className="w-4 h-4" /> Sesiones</button>
          <button onClick={() => setActiveTab("students")} className={`tab-btn flex-shrink-0 ${activeTab === 'students' ? 'active' : ''}`}><Users className="w-4 h-4" /> Alumnos</button>
          <button onClick={() => setActiveTab("attendance")} className={`tab-btn flex-shrink-0 ${activeTab === 'attendance' ? 'active' : ''}`}><UserCheck className="w-4 h-4" /> Asistencia</button>
          <button onClick={() => setActiveTab("gamification")} className={`tab-btn flex-shrink-0 ${activeTab === 'gamification' ? 'active' : ''}`}><Trophy className="w-4 h-4" /> Gamificación</button>
          <button onClick={() => setActiveTab("arena")} className={`tab-btn flex-shrink-0 ${activeTab === 'arena' ? 'active' : ''}`}><Gamepad2 className="w-4 h-4" /> Arena</button>
          <button onClick={() => setActiveTab("tutor")} className={`tab-btn flex-shrink-0 ${activeTab === 'tutor' ? 'active' : ''}`}><Share2 className="w-4 h-4" /> Boletín DNI</button>
        </div>
      </div>

      {/* 1. SESSIONS TAB */}
      {activeTab === "sessions" && (
        <div className="space-y-6">
           <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white overflow-hidden relative shadow-2xl shadow-blue-600/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-6">
                <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-xl border border-white/20">
                  <LinkIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-black text-xl leading-none mb-1">Acceso de Estudiantes</p>
                  <p className="text-blue-100/80 text-sm mb-4 font-medium italic">Compartí este código para que se unan</p>
                  <span className="bg-white/10 border border-white/20 px-6 py-3 rounded-2xl text-3xl font-black tracking-[0.3em] uppercase">
                    {classData?.short_code || '...'}
                  </span>
                </div>
              </div>
              <Button onClick={copyClassLink} className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 rounded-2xl font-black shadow-xl">
                {copied ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                {copied ? "¡Copiado!" : "Copiar Enlace"}
              </Button>
            </div>
          </div>

          {/* Cuatrimestre Filter & Management Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0">Filtrar:</span>
              <button
                onClick={() => setCuatrimestreFilter("all")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                  cuatrimestreFilter === "all" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                Año Completo
              </button>
              <button
                onClick={() => setCuatrimestreFilter("1")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                  cuatrimestreFilter === "1" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                1º Cuatrimestre
              </button>
              <button
                onClick={() => setCuatrimestreFilter("2")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                  cuatrimestreFilter === "2" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                2º Cuatrimestre
              </button>
            </div>

            <Button
              onClick={() => setShowCuatrimestreModal(true)}
              variant="outline"
              className="rounded-2xl h-11 px-5 font-bold border-2 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs w-full sm:w-auto shrink-0 gap-2"
            >
              <CalendarPlus className="w-4 h-4 text-blue-600" />
              Gestión / Resetear 2ºC
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div onClick={createSession} className="border-2 border-dashed border-slate-200 rounded-[40px] p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all bg-white group">
               <div className="w-16 h-16 rounded-[24px] bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Plus className="w-8 h-8" /></div>
               <h4 className="font-black text-slate-800 text-lg">Nueva Sesión</h4>
               <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">
                 ({(sessionForm.cuatrimestre || activeCuatrimestre) === 2 ? "2º Cuatrimestre" : "1º Cuatrimestre"})
               </span>
            </div>
            {sessions.filter(s => {
              if (cuatrimestreFilter === "all") return true;
              const sCuatrimestre = s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1);
              return sCuatrimestre === Number(cuatrimestreFilter);
            }).map(s => {
              const sCuatrimestre = s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1);
              return (
                <div key={s.id} className="bg-white rounded-[40px] border border-slate-100 p-8 flex flex-col hover:shadow-2xl transition-all group/card relative overflow-hidden">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/card:opacity-100 transition-all">
                    <Button onClick={() => handleEditSession(s)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-white border border-slate-100 shadow-sm"><Pencil className="w-3.5 h-3.5 text-slate-500" /></Button>
                    <Button onClick={() => handleDeleteSession(s.id)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-red-50 hover:bg-white border border-red-100 shadow-sm"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                      sCuatrimestre === 2 ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {sCuatrimestre}º Cuatrimestre
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 text-xl capitalize">{format(new Date(s.date + "T12:00:00"), "EEEE d", { locale: es })}</h4>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">{format(new Date(s.date + "T12:00:00"), "MMMM yyyy", { locale: es })}</p>
                  <Link to={`/session/${s.id}`} className="mt-8"><Button className="w-full rounded-2xl h-12 font-black uppercase text-[10px]">Ingresar Notas</Button></Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. STUDENTS TAB */}
      {activeTab === "students" && (
        <div className="space-y-8 animate-in slide-up">
          {/* Top Control Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
             <form onSubmit={handleAddStudent} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <input 
                  placeholder="Nombre del alumno..." 
                  className="bg-white border border-slate-200 rounded-2xl h-14 px-6 font-bold w-full sm:w-80 outline-none focus:border-blue-400 transition-all"
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                />
                <Button type="submit" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px] w-full sm:w-auto"><UserPlus className="w-5 h-5 mr-2" /> Agregar</Button>
             </form>
             <div className="relative w-full md:w-80">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  placeholder="Buscar en lista..." 
                  className="bg-white border border-slate-200 rounded-2xl h-14 pl-12 pr-6 font-bold w-full outline-none focus:border-blue-400 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

          {/* Students List Container */}
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden min-w-0">
             {/* Desktop Table */}
             <div className="hidden md:block overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Estudiante</th>
                        <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">DNI / Validación</th>
                        <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Casa / Escudo</th>
                        <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Acciones</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {filteredStudents.map(st => (
                       <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                                   {getStudentName(st)[0]}
                                </div>
                                <div>
                                   <span className="font-black text-slate-800 text-base">{getStudentName(st)}</span>
                                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">ID: {st.public_token?.slice(0, 8)}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <input 
                                placeholder="DNI del alumno"
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs outline-none focus:border-blue-400 w-36"
                                value={st.dni || ""}
                                onChange={e => updateStudentDni(st.id, e.target.value)}
                             />
                          </td>
                          <td className="px-8 py-6">
                             <select 
                               className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs outline-none focus:border-blue-400"
                               value={st.house_id || ""}
                               onChange={e => updateStudentHouse(st.id, e.target.value)}
                             >
                                <option value="">Sin Casa</option>
                                {houses.map(h => (
                                  <option key={h.id} value={h.id}>{h.icon} {h.name}</option>
                                ))}
                             </select>
                          </td>
                          <td className="px-8 py-6 text-right space-x-2">
                             <Link to={`/class-live/${st.public_token}`} target="_blank">
                                <Button variant="ghost" size="icon" className="rounded-xl" title="Ver Perfil Público"><ExternalLink className="w-4 h-4" /></Button>
                             </Link>
                             <Button onClick={() => handleDeleteStudent(st.id)} variant="ghost" size="icon" className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
             </div>

             {/* Mobile Cards */}
             <div className="md:hidden grid grid-cols-1 gap-3 p-4 bg-slate-50">
                {filteredStudents.map(st => (
                  <div key={st.id} className="bg-white p-6 rounded-[28px] space-y-4 shadow-sm border border-slate-100">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg">
                           {getStudentName(st)[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-black text-slate-800 text-lg truncate leading-tight">{getStudentName(st)}</h4>
                           <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Token: {st.public_token?.slice(0, 8)}</p>
                        </div>
                        <div className="flex gap-2">
                           <Link to={`/class-live/${st.public_token}`} target="_blank">
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100"><ExternalLink className="w-4 h-4 text-slate-600" /></Button>
                           </Link>
                           <Button onClick={() => handleDeleteStudent(st.id)} variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-red-50 border border-red-100"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI / Validación</label>
                           <input 
                              placeholder="DNI"
                              className="bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 w-full font-bold text-sm outline-none focus:border-blue-400"
                              value={st.dni || ""}
                              onChange={e => updateStudentDni(st.id, e.target.value)}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Casa / Escudo</label>
                           <select 
                              className="bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 w-full font-bold text-sm outline-none focus:border-blue-400"
                              value={st.house_id || ""}
                              onChange={e => updateStudentHouse(st.id, e.target.value)}
                           >
                              <option value="">Sin Casa</option>
                              {houses.map(h => (
                                <option key={h.id} value={h.id}>{h.icon} {h.name}</option>
                              ))}
                           </select>
                        </div>
                     </div>
                  </div>
                ))}
             </div>

             {filteredStudents.length === 0 && (
               <div className="p-16 text-center text-slate-400 font-bold italic">No hay alumnos registrados aún o que coincidan con la búsqueda.</div>
             )}
          </div>
        </div>
      )}

      {/* 2.5 ATTENDANCE TAB */}
      {activeTab === "attendance" && (() => {
        // Filter sessions by cuatrimestre
        const relevantSessions = sessions.filter(s => {
          if (cuatrimestreFilter === "all") return true;
          const sCuatri = s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1);
          return sCuatri === Number(cuatrimestreFilter);
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Fast lookup map: `${session_id}_${class_student_id}` -> attendance record
        const attMap = {};
        allAttendance.forEach(a => {
          attMap[`${a.session_id}_${a.class_student_id}`] = a;
        });

        // Compute statistics per student
        const studentStats = students.map(st => {
          let pCount = 0;
          let tCount = 0;
          let jCount = 0;
          let aCount = 0;
          let obsCount = 0;

          relevantSessions.forEach(s => {
            const rec = attMap[`${s.id}_${st.id}`];
            let stStatus = "present";
            if (rec) {
              if (rec.is_present === false) {
                stStatus = rec.status === "justified" ? "justified" : "absent";
              } else {
                stStatus = rec.status || "present";
              }
              if (rec.observation) obsCount++;
            }
            if (stStatus === "present") pCount++;
            else if (stStatus === "late") tCount++;
            else if (stStatus === "justified") jCount++;
            else if (stStatus === "absent") aCount++;
          });

          const totalS = relevantSessions.length;
          const attended = pCount + tCount;
          const percentage = totalS > 0 ? Math.round((attended / totalS) * 100) : 100;
          const isAtRisk = totalS >= 2 && percentage < 75;

          return {
            student: st,
            pCount,
            tCount,
            jCount,
            aCount,
            obsCount,
            percentage,
            isAtRisk,
            attended
          };
        });

        // Global metrics
        const totalSessionsCount = relevantSessions.length;
        const totalStudentsCount = students.length;
        const atRiskCount = studentStats.filter(s => s.isAtRisk).length;
        const perfectAttendanceCount = studentStats.filter(s => s.percentage === 100 && totalSessionsCount > 0).length;
        const totalClassPercentage = totalStudentsCount > 0 
          ? Math.round(studentStats.reduce((sum, s) => sum + s.percentage, 0) / totalStudentsCount) 
          : 100;

        // Filter student list by risk & search
        const displayList = studentStats.filter(item => {
          const nameMatch = getStudentName(item.student).toLowerCase().includes(attendanceSearch.toLowerCase()) ||
            (item.student.dni && item.student.dni.includes(attendanceSearch));
          if (!nameMatch) return false;
          if (attendanceRiskFilter === "risk") return item.isAtRisk;
          return true;
        });

        return (
          <div className="space-y-8 animate-in slide-up">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Asistencia Global */}
              <div className="p-6 rounded-[28px] bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asistencia Global</span>
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                    <UserCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-['Outfit'] font-black text-3xl text-slate-900 tracking-tight">{totalClassPercentage}%</span>
                  <p className="text-xs text-slate-500 font-medium mt-1">Promedio de la materia</p>
                </div>
              </div>

              {/* Total Clases Dictadas */}
              <div className="p-6 rounded-[28px] bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clases Dictadas</span>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                    <CalendarPlus className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-['Outfit'] font-black text-3xl text-slate-900 tracking-tight">{totalSessionsCount}</span>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {cuatrimestreFilter === "all" ? "Año completo" : `${cuatrimestreFilter}º Cuatrimestre`}
                  </p>
                </div>
              </div>

              {/* Alumnos en Riesgo */}
              <div className={`p-6 rounded-[28px] border shadow-sm relative overflow-hidden transition-all ${
                atRiskCount > 0 
                  ? "bg-rose-50/70 border-rose-200" 
                  : "bg-white border-slate-100"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${atRiskCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                    Alumnos en Riesgo
                  </span>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                    atRiskCount > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-50 text-slate-400"
                  }`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className={`font-['Outfit'] font-black text-3xl tracking-tight ${
                    atRiskCount > 0 ? "text-rose-700" : "text-slate-900"
                  }`}>
                    {atRiskCount}
                  </span>
                  <p className={`text-xs font-medium mt-1 ${atRiskCount > 0 ? "text-rose-600 font-bold" : "text-slate-500"}`}>
                    {atRiskCount > 0 ? "Menor al 75% de asistencia" : "Sin casos críticos"}
                  </p>
                </div>
              </div>

              {/* Asistencia Perfecta */}
              <div className="p-6 rounded-[28px] bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asistencia Perfecta</span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-['Outfit'] font-black text-3xl text-slate-900 tracking-tight">{perfectAttendanceCount}</span>
                  <p className="text-xs text-slate-500 font-medium mt-1">100% de presencia</p>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[28px] border border-slate-100 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar alumno o DNI..."
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setAttendanceRiskFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      attendanceRiskFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Todos ({students.length})
                  </button>
                  <button
                    onClick={() => setAttendanceRiskFilter("risk")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                      attendanceRiskFilter === "risk" 
                        ? "bg-rose-600 text-white shadow-xs" 
                        : "text-slate-500 hover:text-rose-600"
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> En Riesgo ({atRiskCount})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  onClick={() => exportAttendanceMatrixToCSV(classData?.name || "Clase", relevantSessions, students, allAttendance, cuatrimestreFilter)}
                  className="rounded-2xl h-11 px-5 font-black text-xs uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-600" /> Exportar Planilla (CSV)
                </Button>
              </div>
            </div>

            {/* Attendance Matrix Table */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
              {relevantSessions.length === 0 ? (
                <div className="p-16 text-center">
                  <CalendarPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-['Outfit'] font-black text-slate-800 text-lg">No hay sesiones creadas en este periodo</p>
                  <p className="text-slate-400 text-xs font-medium mt-1">Creá una nueva sesión para comenzar el seguimiento de asistencia</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80">
                        <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-500 sticky left-0 bg-slate-50 z-20 w-64 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          Estudiante
                        </th>
                        {relevantSessions.map(s => {
                          const dateObj = new Date(s.date + "T12:00:00");
                          return (
                            <th key={s.id} className="px-3 py-3 text-center border-l border-slate-200/60 min-w-[72px]">
                              <Link to={`/session/${s.id}`} className="group block hover:text-blue-600 transition-colors" title="Abrir sesión en vivo">
                                <span className="block font-['Outfit'] font-black text-xs text-slate-800 group-hover:text-blue-600">
                                  {format(dateObj, "d MMM", { locale: es })}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                                  {format(dateObj, "EEE", { locale: es })}
                                </span>
                              </Link>
                            </th>
                          );
                        })}
                        <th className="px-3 py-4 text-center font-black text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50/50 border-l border-slate-200/80 w-12" title="Presentes">
                          P
                        </th>
                        <th className="px-3 py-4 text-center font-black text-[10px] uppercase tracking-widest text-amber-700 bg-amber-50/50 border-l border-slate-200/80 w-12" title="Tardes">
                          T
                        </th>
                        <th className="px-3 py-4 text-center font-black text-[10px] uppercase tracking-widest text-purple-700 bg-purple-50/50 border-l border-slate-200/80 w-12" title="Justificadas">
                          J
                        </th>
                        <th className="px-3 py-4 text-center font-black text-[10px] uppercase tracking-widest text-rose-700 bg-rose-50/50 border-l border-slate-200/80 w-12" title="Ausentes">
                          A
                        </th>
                        <th className="px-5 py-4 text-center font-black text-[10px] uppercase tracking-widest text-slate-700 border-l border-slate-200/80 w-24">
                          % Final
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayList.map(item => {
                        const st = item.student;
                        return (
                          <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                            {/* Sticky student name column */}
                            <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50/60 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                  {getStudentName(st)[0]}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-['Outfit'] font-black text-sm text-slate-800 truncate block">
                                    {getStudentName(st)}
                                  </span>
                                  {st.dni && (
                                    <span className="text-[10px] font-bold text-slate-400">
                                      DNI: {st.dni}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Session status cells */}
                            {relevantSessions.map(s => {
                              const rec = attMap[`${s.id}_${st.id}`];
                              let status = "present";
                              if (rec) {
                                if (rec.is_present === false) {
                                  status = rec.status === "justified" ? "justified" : "absent";
                                } else {
                                  status = rec.status || "present";
                                }
                              }
                              const hasObs = Boolean(rec?.observation);

                              const statusBadge = {
                                present: { code: "P", full: "Presente", bg: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" },
                                late: { code: "T", full: "Tarde", bg: "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200" },
                                justified: { code: "J", full: "Justificado", bg: "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200" },
                                absent: { code: "A", full: "Ausente", bg: "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200" }
                              }[status] || { code: "P", full: "Presente", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };

                              return (
                                <td key={s.id} className="px-2 py-3 text-center border-l border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickAttendanceModal({
                                        student: st,
                                        session: s,
                                        currentStatus: status,
                                        observation: rec?.observation || ""
                                      });
                                      setQuickObsText(rec?.observation || "");
                                    }}
                                    title={`${statusBadge.full} · ${s.date}${hasObs ? ` · "${rec.observation}"` : ""}`}
                                    className={`relative inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs border transition-all ${statusBadge.bg}`}
                                  >
                                    {statusBadge.code}
                                    {hasObs && (
                                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-white" />
                                    )}
                                  </button>
                                </td>
                              );
                            })}

                            {/* Totals Summary */}
                            <td className="px-3 py-4 text-center font-bold text-xs text-emerald-700 bg-emerald-50/20 border-l border-slate-100">
                              {item.pCount}
                            </td>
                            <td className="px-3 py-4 text-center font-bold text-xs text-amber-700 bg-amber-50/20 border-l border-slate-100">
                              {item.tCount}
                            </td>
                            <td className="px-3 py-4 text-center font-bold text-xs text-purple-700 bg-purple-50/20 border-l border-slate-100">
                              {item.jCount}
                            </td>
                            <td className="px-3 py-4 text-center font-bold text-xs text-rose-700 bg-rose-50/20 border-l border-slate-100">
                              {item.aCount}
                            </td>
                            <td className="px-5 py-4 text-center border-l border-slate-100">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-['Outfit'] font-black inline-block border ${
                                item.percentage >= 75
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}>
                                {item.percentage}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 3. GAMIFICATION TAB */}
      {activeTab === "gamification" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
           {/* Rewards Management */}
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tienda Notyx</h3>
                <Button onClick={() => { setEditingItem(null); setModalForm({ name: "", description: "", cost_coins: 100, icon: "🎁", category: "item", game_name: "Sudoku", duration_minutes: 60 }); setShowRewardModal(true); }} className="rounded-2xl bg-orange-500 hover:bg-orange-600 h-10 px-5 gap-2 font-black text-[10px] uppercase tracking-widest"><Plus className="w-4 h-4" /> Crear Premio</Button>
              </div>
              <div className="grid gap-4">
                 {rewards.map(r => (
                   <div key={r.id} className="bg-white rounded-3xl p-5 border border-slate-100 flex items-center justify-between hover:shadow-lg transition-all group">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                           <RewardIcon reward={r} name={r.name} icon={r.icon} className="w-7 h-7 text-slate-700" textClassName="text-3xl" />
                         </div>
                         <div>
                            <h4 className="font-black text-slate-800 leading-none mb-1">{r.name}</h4>
                            <p className="text-xs text-slate-400 font-medium">{r.description || 'Sin descripción'}</p>
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-2 flex items-center gap-1"><LucideCoins className="w-3 h-3" /> {r.cost_coins} Coins</p>
                         </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                         <Button onClick={() => { setEditingItem(r); setModalForm(r); setShowRewardModal(true); }} variant="ghost" size="icon" className="rounded-xl"><Pencil className="w-4 h-4" /></Button>
                         <Button onClick={() => handleDeleteReward(r.id)} variant="ghost" size="icon" className="rounded-xl text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                   </div>
                 ))}
                 {rewards.length === 0 && <p className="text-center py-10 text-slate-400 font-bold italic">No hay premios creados.</p>}
              </div>

              {/* Pending Purchases Section */}
              <div className="pt-10 space-y-6">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <ShoppingCart className="w-6 h-6 text-emerald-500" />
                    Compras Pendientes
                 </h3>
                 <div className="space-y-3">
                    {purchases.filter(p => p.status === 'pending').map(p => (
                      <div key={p.id} className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 flex items-center justify-between animate-in zoom-in duration-300">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-emerald-200">
                              <RewardIcon reward={p.rewards} name={p.rewards?.name} icon={p.rewards?.icon} className="w-5 h-5 text-emerald-600" textClassName="text-xl" />
                            </div>
                            <div>
                               <h4 className="font-black text-slate-800 leading-none mb-1">{p.profiles?.full_name}</h4>
                               <p className="text-xs text-emerald-700 font-medium">Compró: <span className="font-black uppercase tracking-tight">{p.rewards?.name}</span></p>
                            </div>
                         </div>
                         <div className="flex gap-2">
                            <Button onClick={() => handleUpdatePurchaseStatus(p.id, 'delivered')} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Entregar</Button>
                            <Button onClick={() => handleUpdatePurchaseStatus(p.id, 'cancelled')} variant="ghost" className="text-red-500 hover:bg-red-100 rounded-xl h-10 font-black text-[10px] uppercase tracking-widest">Rechazar</Button>
                         </div>
                      </div>
                    ))}
                    {purchases.filter(p => p.status === 'pending').length === 0 && (
                      <div className="bg-slate-50 rounded-3xl p-8 text-center border border-dashed border-slate-200">
                         <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                         <p className="text-slate-400 font-bold italic text-sm">No hay compras por entregar.</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           {/* House Management */}
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Casas y Escudos</h3>
                 <Button onClick={() => { setEditingItem(null); setModalForm({ name: "", icon: "🏠", color: "#3b82f6" }); setShowHouseModal(true); }} className="rounded-2xl bg-blue-600 hover:bg-blue-700 h-10 px-5 gap-2 font-black text-[10px] uppercase tracking-widest"><Plus className="w-4 h-4" /> Nueva Casa</Button>
              </div>
              <div className="grid gap-6">
                 {houses.map(h => (
                   <div key={h.id} className="bg-white rounded-[40px] p-8 border border-slate-100 hover:shadow-2xl transition-all relative group overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: h.color }} />
                      <div className="flex items-center justify-between relative z-10">
                         <div className="flex items-center gap-6">
                            <div className="text-4xl w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center border-2 border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
                              {h.icon}
                            </div>
                            <div>
                               <h4 className="font-black text-2xl text-slate-800">{h.name}</h4>
                               <div className="flex items-center gap-2 mt-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: h.color }} />
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador de Casa</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Button onClick={() => { setEditingItem(h); setModalForm(h); setShowHouseModal(true); }} variant="outline" size="icon" className="rounded-xl"><Pencil className="w-4 h-4" /></Button>
                            <Button onClick={() => handleDeleteHouse(h.id)} variant="outline" size="icon" className="rounded-xl text-red-400 hover:text-red-600 border-red-100"><Trash2 className="w-4 h-4" /></Button>
                         </div>
                      </div>
                   </div>
                 ))}
                 {houses.length === 0 && <p className="text-center py-10 text-slate-400 font-bold italic">No hay casas registradas.</p>}
              </div>
           </div>
        </div>
      )}

      {/* 5. ARENA TAB */}
      {activeTab === "arena" && (() => {
        const getGameLeader = (gameName) => {
          const filtered = arenaProgress.filter(p => p.game_name === gameName && (p.high_score || 0) > 0);
          if (!filtered.length) return null;
          const sorted = [...filtered].sort((a, b) => (b.high_score || 0) - (a.high_score || 0));
          const top = sorted[0];
          const student = students.find(s => s.id === top.class_student_id);
          return {
            studentName: student ? getStudentName(student) : "Estudiante",
            score: top.high_score,
            difficulty: top.difficulty
          };
        };

        const mathLeader = getGameLeader('Math Blitz');
        const memoryLeader = getGameLeader('Memory Match');
        const sudokuLeader = getGameLeader('Sudoku');
        const pyramidLeader = getGameLeader('Pyramid');

        const totalAttempts = arenaProgress.reduce((acc, p) => acc + (p.total_games_played || 0), 0);
        const completedDuels = classDuels.filter(d => d.status === 'completed');
        const totalCoinsWagered = classDuels.reduce((acc, d) => acc + ((d.wager_coins || 0) * 2), 0);

        return (
          <div className="space-y-8 animate-in slide-up">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-[3rem] p-8 sm:p-10 text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-[24px] shadow-lg shadow-indigo-500/30">
                    <Gamepad2 className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-3 py-0.5 rounded-full">Torneo & Arena</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none mb-2">Desempeño en la Arena</h2>
                    <p className="text-indigo-200/80 font-medium text-sm">Supervisión en vivo de récords, monarcas de clase y duelos 1v1 con monedas</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center min-w-[100px]">
                    <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">Partidas</span>
                    <span className="text-2xl font-black text-white">{totalAttempts}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center min-w-[100px]">
                    <span className="text-xs text-amber-300 font-bold uppercase tracking-wider block">Duelos 1v1</span>
                    <span className="text-2xl font-black text-amber-300">{classDuels.length}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center min-w-[120px]">
                    <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider block">En Juego</span>
                    <span className="text-2xl font-black text-emerald-400">🪙 {totalCoinsWagered}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 REYES DE LA ARENA (CHAMPIONS BENTO) */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Monarcas Actuales de la Clase</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">Récords más altos registrados</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Math Blitz */}
                <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-xl -translate-y-8 translate-x-8" />
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">Math Blitz</span>
                  </div>
                  {mathLeader ? (
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rey del Cálculo</p>
                      <h4 className="text-lg font-black text-slate-900 truncate">{mathLeader.studentName}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-black text-amber-500">{mathLeader.score}</span>
                        <span className="text-xs font-bold text-slate-400">pts</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 py-2">
                      <p className="text-xs font-bold text-slate-400">Aún sin rey coronado</p>
                      <p className="text-xs text-slate-300 italic mt-1">Nadie jugó este minijuego</p>
                    </div>
                  )}
                </div>

                {/* Memory Match */}
                <div className="bg-white rounded-3xl p-5 border border-indigo-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-xl -translate-y-8 translate-x-8" />
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                      <Puzzle className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Memory</span>
                  </div>
                  {memoryLeader ? (
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mente Fotográfica</p>
                      <h4 className="text-lg font-black text-slate-900 truncate">{memoryLeader.studentName}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-black text-indigo-600">{memoryLeader.score}</span>
                        <span className="text-xs font-bold text-slate-400">pts</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 py-2">
                      <p className="text-xs font-bold text-slate-400">Aún sin rey coronado</p>
                      <p className="text-xs text-slate-300 italic mt-1">Nadie jugó este minijuego</p>
                    </div>
                  )}
                </div>

                {/* Sudoku */}
                <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full blur-xl -translate-y-8 translate-x-8" />
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                      <Brain className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">Sudoku</span>
                  </div>
                  {sudokuLeader ? (
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gran Estratega</p>
                      <h4 className="text-lg font-black text-slate-900 truncate">{sudokuLeader.studentName}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-black text-purple-600">{sudokuLeader.score}</span>
                        <span className="text-xs font-bold text-slate-400">pts</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 py-2">
                      <p className="text-xs font-bold text-slate-400">Aún sin rey coronado</p>
                      <p className="text-xs text-slate-300 italic mt-1">Nadie jugó este minijuego</p>
                    </div>
                  )}
                </div>

                {/* Pyramid */}
                <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-xl -translate-y-8 translate-x-8" />
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <Binary className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Pyramid</span>
                  </div>
                  {pyramidLeader ? (
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cúspide Aritmética</p>
                      <h4 className="text-lg font-black text-slate-900 truncate">{pyramidLeader.studentName}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-black text-emerald-600">{pyramidLeader.score}</span>
                        <span className="text-xs font-bold text-slate-400">pts</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 py-2">
                      <p className="text-xs font-bold text-slate-400">Aún sin rey coronado</p>
                      <p className="text-xs text-slate-300 italic mt-1">Nadie jugó este minijuego</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 1V1 DUELS SECTION */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Duelos 1v1 Disputados en la Clase</h3>
                    <p className="text-xs text-slate-400 font-medium">Batallas cara a cara con apuestas de Notyx Coins</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">
                  {classDuels.length} {classDuels.length === 1 ? 'Duelo' : 'Duelos'}
                </span>
              </div>

              {classDuels.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-4">Enfrentamiento</th>
                        <th className="px-6 py-4">Juego & Dificultad</th>
                        <th className="px-6 py-4 text-center">Puntajes</th>
                        <th className="px-6 py-4 text-center">Apuesta</th>
                        <th className="px-6 py-4 text-center">Estado / Ganador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {classDuels.map(duel => {
                        const challengerSt = students.find(s => s.id === duel.challenger_cs_id);
                        const challengedSt = students.find(s => s.id === duel.challenged_cs_id);
                        const challengerName = challengerSt ? getStudentName(challengerSt) : duel.challenger?.student_name || "Retador";
                        const challengedName = challengedSt ? getStudentName(challengedSt) : duel.challenged?.student_name || "Rival";
                        
                        let winnerName = null;
                        if (duel.status === 'completed') {
                          if (duel.winner_cs_id === duel.challenger_cs_id) winnerName = challengerName;
                          else if (duel.winner_cs_id === duel.challenged_cs_id) winnerName = challengedName;
                          else winnerName = "Empate";
                        }

                        return (
                          <tr key={duel.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{challengerName}</span>
                                <span className="text-xs font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">VS</span>
                                <span className="font-bold text-slate-800">{challengedName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">{duel.game_name}</span>
                                <span className="text-[10px] uppercase font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                  {duel.difficulty}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex items-center gap-2 font-mono font-bold text-xs bg-slate-100 px-3 py-1 rounded-xl">
                                <span className={duel.winner_cs_id === duel.challenger_cs_id ? "text-emerald-600 font-black" : "text-slate-600"}>
                                  {duel.challenger_score !== null && duel.challenger_score !== undefined ? duel.challenger_score : "-"}
                                </span>
                                <span className="text-slate-400">:</span>
                                <span className={duel.winner_cs_id === duel.challenged_cs_id ? "text-emerald-600 font-black" : "text-slate-600"}>
                                  {duel.challenged_score !== null && duel.challenged_score !== undefined ? duel.challenged_score : "-"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-xl text-xs">
                                🪙 {duel.wager_coins || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {duel.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  🏆 {winnerName}
                                </span>
                              ) : duel.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                                  ⏳ Esperando rival
                                </span>
                              ) : duel.status === 'pending_challenger' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                                  ⚔️ Retador jugando
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-500">
                                  {duel.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Swords className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                    Aún no se han disputado duelos 1v1 en esta clase
                  </p>
                  <p className="text-slate-400 text-xs mt-1">Los estudiantes pueden retarse entre sí apostando Notyx Coins desde su panel.</p>
                </div>
              )}
            </div>

            {/* DETAILED SOLO RECORDS TABLE */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Registro General de Puntajes</h3>
                  <p className="text-xs text-slate-400 font-medium">Historial de récords en modo práctica y clasificatoria</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">
                  {arenaProgress.length} Registros
                </span>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Estudiante</th>
                    <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Juego</th>
                    <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Dificultad</th>
                    <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Máximo Récord</th>
                    <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Intentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {arenaProgress.length > 0 ? arenaProgress.map(p => {
                    const student = students.find(s => s.id === p.class_student_id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <span className="font-black text-slate-800">{student ? getStudentName(student) : "Estudiante Desconocido"}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            {p.game_name === 'Memory Match' && <Puzzle className="w-4 h-4 text-indigo-500" />}
                            {p.game_name === 'Sudoku' && <Brain className="w-4 h-4 text-purple-500" />}
                            {p.game_name === 'Pyramid' && <Binary className="w-4 h-4 text-emerald-500" />}
                            {p.game_name === 'Math Blitz' && <Zap className="w-4 h-4 text-orange-500" />}
                            <span className="font-bold text-slate-700 text-sm">{p.game_name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            p.difficulty === 'easy' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                            p.difficulty === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {p.difficulty === 'easy' ? 'Principiante' : p.difficulty === 'medium' ? 'Caballero' : 'Leyenda'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-slate-300" />
                            <span className="font-black text-slate-800">{p.high_score}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-slate-400 font-bold">{p.total_games_played}</span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="5" className="px-8 py-20 text-center">
                        <div className="max-w-xs mx-auto">
                          <Gamepad2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Aún no hay registros de juegos en esta clase</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* --- MODALS --- */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[32px] sm:rounded-[40px] w-full max-w-sm p-6 sm:p-8 shadow-2xl animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-slate-900 mb-2">
                {editingSession ? 'Editar Sesión' : 'Nueva Sesión'}
              </h3>
              <p className="text-slate-500 text-sm font-medium mb-8">
                Seleccioná la fecha de la clase.
              </p>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Fecha de la Clase</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none transition-all" 
                      value={sessionForm.date} 
                      onChange={e => setSessionForm({...sessionForm, date: e.target.value})} 
                    />
                 </div>

                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Cuatrimestre</label>
                    <select
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                      value={sessionForm.cuatrimestre || 1}
                      onChange={e => setSessionForm({...sessionForm, cuatrimestre: Number(e.target.value)})}
                    >
                      <option value={1}>1º Cuatrimestre</option>
                      <option value={2}>2º Cuatrimestre</option>
                    </select>
                 </div>

                 <div className="flex flex-col gap-3 pt-4">
                    <Button onClick={handleSaveSession} className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">
                      {editingSession ? 'Actualizar Sesión' : 'Comenzar Clase'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowSessionModal(false); setEditingSession(null); }} className="h-12 rounded-2xl font-black text-slate-400">
                      Cancelar
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {(showRewardModal || showHouseModal) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[32px] sm:rounded-[40px] w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-black text-slate-900 mb-6">
                {editingItem ? 'Editar' : 'Crear'} {showRewardModal ? 'Premio' : 'Casa'}
              </h3>
              <div className="space-y-5">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nombre</label>
                    <input className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none transition-all" value={modalForm.name} onChange={e => setModalForm({...modalForm, name: e.target.value})} />
                 </div>
                 {showRewardModal && (
                   <>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Costo en Coins</label>
                        <input type="number" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none" value={modalForm.cost_coins} onChange={e => setModalForm({...modalForm, cost_coins: e.target.value})} />
                     </div>
                      <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Descripción</label>
                         <textarea className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none" rows={3} value={modalForm.description} onChange={e => setModalForm({...modalForm, description: e.target.value})} />
                      </div>
                      <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Categoría</label>
                         <select className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none" value={modalForm.category} onChange={e => setModalForm({...modalForm, category: e.target.value})}>
                            <option value="item">Objeto Físico / Ventaja</option>
                            <option value="game_pass">Pase de Juego (Temporal)</option>
                         </select>
                      </div>
                      {modalForm.category === 'game_pass' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-up">
                           <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Juego a Desbloquear</label>
                              <select className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none" value={modalForm.game_name} onChange={e => setModalForm({...modalForm, game_name: e.target.value})}>
                                 <option value="Sudoku">Sudoku</option>
                                 <option value="Pyramid">Pirámide Numérica</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Duración (minutos)</label>
                              <input type="number" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none" value={modalForm.duration_minutes} onChange={e => setModalForm({...modalForm, duration_minutes: e.target.value})} />
                           </div>
                        </div>
                      )}
                    </>
                 )}
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Icono (Emoji)</label>
                       <input className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold text-center text-2xl" value={modalForm.icon} onChange={e => setModalForm({...modalForm, icon: e.target.value})} />
                    </div>
                    {showHouseModal && (
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Color</label>
                          <input type="color" className="w-full h-[60px] bg-slate-50 border-2 border-transparent rounded-2xl p-2" value={modalForm.color} onChange={e => setModalForm({...modalForm, color: e.target.value})} />
                       </div>
                    )}
                 </div>
                 <div className="flex gap-3 pt-6">
                    <Button onClick={showRewardModal ? handleSaveReward : handleSaveHouse} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">Guardar Cambios</Button>
                    <Button variant="ghost" onClick={() => { setShowRewardModal(false); setShowHouseModal(false); }} className="flex-1 h-14 rounded-2xl font-black text-slate-400">Cancelar</Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Cuatrimestre Management Modal */}
      {showCuatrimestreModal && (
        <div className="modal-backdrop" onClick={() => setShowCuatrimestreModal(false)}>
          <div className="modal max-w-xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCuatrimestreModal(false)} className="modal-close">
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                <CalendarPlus className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Cuatrimestres y Notas</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">
                Configurá el cuatrimestre activo o reiniciá las notas cargadas para el nuevo periodo.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Cuatrimestre Activo para Nuevas Sesiones</span>
                  <span className="text-xs font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-xl">
                    {activeCuatrimestre}º Cuatrimestre
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => {
                      setActiveCuatrimestre(1);
                      toast("1º Cuatrimestre configurado como activo", "info");
                    }}
                    variant={activeCuatrimestre === 1 ? "default" : "outline"}
                    className="flex-1 rounded-xl font-bold text-xs"
                  >
                    1º Cuatrimestre
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveCuatrimestre(2);
                      toast("¡2º Cuatrimestre activado para nuevas sesiones!", "success");
                    }}
                    variant={activeCuatrimestre === 2 ? "default" : "outline"}
                    className="flex-1 rounded-xl font-bold text-xs"
                  >
                    2º Cuatrimestre
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Acciones de Reinicio de Notas</h4>
                
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900 text-sm">Resetear Notas del 2º Cuatrimestre</p>
                    <p className="text-slate-500 text-xs font-medium">Borra las notas registradas en el 2ºC para empezar de cero. Mantiene el 1ºC intacto.</p>
                  </div>
                  <Button
                    onClick={() => handleResetCuatrimestreGrades(2)}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 px-5 font-black text-xs shrink-0"
                  >
                    Resetear 2ºC
                  </Button>
                </div>

                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-red-900 text-sm">Resetear Notas del 1º Cuatrimestre</p>
                    <p className="text-red-600/70 text-xs font-medium">Borra únicamente las notas cargadas durante el 1er Cuatrimestre.</p>
                  </div>
                  <Button
                    onClick={() => handleResetCuatrimestreGrades(1)}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-100 rounded-xl h-11 px-5 font-black text-xs shrink-0"
                  >
                    Resetear 1ºC
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="ghost" onClick={() => setShowCuatrimestreModal(false)} className="w-full h-12 rounded-2xl font-bold text-slate-400">
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TUTOR / FAMILIES PORTAL TAB */}
      {activeTab === "tutor" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Main Status & Control Card */}
          <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-900/5 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Portal de Familias y Tutores
                  </span>
                  {classData?.tutor_portal_enabled !== false ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Enlace Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                      <ShieldAlert className="w-3 h-3 text-rose-600" /> Enlace Deshabilitado
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">
                  Consulta de Boletín Escolar con DNI
                </h2>
                <p className="text-sm font-medium text-slate-500 max-w-2xl">
                  Permite a las familias y estudiantes consultar en tiempo real las calificaciones, promedios del 1º y 2º cuatrimestre, observaciones de clase y registro de asistencias ingresando únicamente su número de DNI.
                </p>
              </div>

              {/* Enable / Disable Button Switch */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shrink-0">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                    {classData?.tutor_portal_enabled !== false ? "Enlace Habilitado" : "Enlace Deshabilitado"}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {classData?.tutor_portal_enabled !== false ? "Consultas abiertas con DNI" : "Consultas pausadas"}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  disabled={tutorUpdating}
                  onClick={handleToggleTutorPortal}
                  className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 ${
                    classData?.tutor_portal_enabled !== false ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span className="sr-only">Habilitar o deshabilitar enlace</span>
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      classData?.tutor_portal_enabled !== false ? "translate-x-8" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Share link and quick actions grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Direct Link Card */}
              <div className="lg:col-span-2 space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-600" />
                    Enlace Oficial de la Clase
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    Código: {classData?.short_code || classData?.id?.slice(0, 8)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${BASE_URL}/tutor?c=${classData?.short_code || classData?.id}`}
                    onClick={(e) => e.target.select()}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-blue-500 select-all"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${BASE_URL}/tutor?c=${classData?.short_code || classData?.id}`);
                      setTutorCopied(true);
                      toast("¡Enlace copiado al portapapeles!", "success");
                      setTimeout(() => setTutorCopied(false), 2000);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 px-5 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-500/20 shrink-0"
                  >
                    {tutorCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{tutorCopied ? "¡Copiado!" : "Copiar"}</span>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      const shareLink = `${BASE_URL}/tutor?c=${classData?.short_code || classData?.id}`;
                      const msg = `Estimadas familias y estudiantes de ${classData?.name}:\n\nLes compartimos el enlace oficial para consultar el boletín de calificaciones, notas del cuatrimestre y asistencias escolares. Solo deben ingresar el número de DNI del estudiante:\n\n🔗 ${shareLink}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 px-5 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Compartir por WhatsApp</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTutorShowQR(!tutorShowQR)}
                    className="rounded-2xl h-11 px-4 border-slate-300 hover:bg-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700"
                  >
                    <QrCode className="w-4 h-4 text-slate-600" />
                    <span>{tutorShowQR ? "Ocultar QR" : "Mostrar Código QR"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(`${BASE_URL}/tutor?c=${classData?.short_code || classData?.id}`, "_blank")}
                    className="rounded-2xl h-11 px-4 border-slate-300 hover:bg-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                    <span>Probar Vista Tutor</span>
                  </Button>
                </div>
              </div>

              {/* DNI Coverage Mini-Card */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 block">
                    Cobertura de DNI
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-['Outfit'] font-black text-3xl text-slate-900">
                      {students.filter(s => s.dni && String(s.dni).trim()).length}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      de {students.length} estudiantes
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${students.length > 0 ? (students.filter(s => s.dni && String(s.dni).trim()).length / students.length) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                <div className="text-xs font-medium text-slate-500">
                  {students.filter(s => !s.dni || !String(s.dni).trim()).length === 0 ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Todos los alumnos tienen DNI cargado.
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      {students.filter(s => !s.dni || !String(s.dni).trim()).length} alumno(s) sin DNI cargado.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Optional QR View */}
            {tutorShowQR && (
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 text-center space-y-4 animate-in fade-in duration-200">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">
                  Código QR del Curso: {classData?.name}
                </span>
                <div className="inline-block bg-white p-4 rounded-3xl border border-slate-200 shadow-md">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
                      `${BASE_URL}/tutor?c=${classData?.short_code || classData?.id}`
                    )}&margin=10`}
                    alt={`Código QR de ${classData?.name}`}
                    className="w-56 h-56 mx-auto rounded-2xl"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                  Escaneando este código con la cámara de cualquier teléfono, las familias ingresan directamente al portal de este curso y solo deben tipear el número de DNI.
                </p>
              </div>
            )}
          </div>

          {/* DNI Audit & Quick Edit Table */}
          <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-900/5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-['Outfit'] font-black text-xl text-slate-900">
                  Nómina de Estudiantes y Verificación de DNI
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Verificá y cargá los números de DNI para asegurar que todas las familias puedan consultar el boletín.
                </p>
              </div>
              <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                {students.length} Alumnos
              </span>
            </div>

            <div className="divide-y divide-slate-100 overflow-x-auto">
              {students.map((st) => {
                const isEditing = editingDniStudentId === st.id;
                const hasDni = Boolean(st.dni && String(st.dni).trim());
                return (
                  <div key={st.id} className="py-3.5 flex items-center justify-between gap-4 min-w-[500px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-['Outfit'] font-black flex items-center justify-center text-sm">
                        {getStudentName(st)[0]}
                      </div>
                      <div>
                        <span className="font-['Outfit'] font-bold text-sm text-slate-900 block">
                          {getStudentName(st)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          ID Alumno: {st.public_token?.slice(0, 8) || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Número de DNI..."
                            value={tempDniInput}
                            onChange={(e) => setTempDniInput(e.target.value)}
                            className="w-36 h-9 px-3 bg-slate-50 border border-blue-500 rounded-xl text-xs font-bold outline-none ring-2 ring-blue-500/20"
                          />
                          <Button
                            size="sm"
                            onClick={async () => {
                              await updateStudentDni(st.id, tempDniInput.trim());
                              setEditingDniStudentId(null);
                              toast("DNI actualizado correctamente", "success");
                            }}
                            className="h-9 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs"
                          >
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDniStudentId(null)}
                            className="h-9 px-2 rounded-xl text-slate-400 text-xs"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {hasDni ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              DNI: {st.dni}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                              Sin DNI cargado
                            </span>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingDniStudentId(st.id);
                              setTempDniInput(st.dni || "");
                            }}
                            className="h-8 px-2.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 font-bold text-xs flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>{hasDni ? "Editar" : "Cargar DNI"}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* QUICK ATTENDANCE & OBSERVATION MODAL */}
      {quickAttendanceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 sm:p-7 space-y-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-['Outfit'] font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  {getStudentName(quickAttendanceModal.student)[0]}
                </div>
                <div>
                  <h3 className="text-lg font-['Outfit'] font-black text-slate-900 leading-tight">
                    {getStudentName(quickAttendanceModal.student)}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Clase: {(() => {
                        const [y, m, d] = quickAttendanceModal.session.date.split('-');
                        const dObj = new Date(y, m - 1, d);
                        return format(dObj, "d 'de' MMMM, yyyy", { locale: es });
                      })()}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700">
                      {quickAttendanceModal.session.cuatrimestre || 1}º Cuat.
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setQuickAttendanceModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Selection Cards */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Estado de Asistencia
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    key: "present",
                    label: "Presente (P)",
                    desc: "Asistió a clase",
                    borderActive: "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm shadow-emerald-500/10",
                    badge: "bg-emerald-600 text-white",
                    icon: CheckCircle2
                  },
                  {
                    key: "late",
                    label: "Tarde (T)",
                    desc: "Llegó con demora",
                    borderActive: "border-amber-500 bg-amber-50/80 text-amber-900 shadow-sm shadow-amber-500/10",
                    badge: "bg-amber-600 text-white",
                    icon: Clock
                  },
                  {
                    key: "justified",
                    label: "Justificado (J)",
                    desc: "Falta justificada",
                    borderActive: "border-purple-500 bg-purple-50/80 text-purple-900 shadow-sm shadow-purple-500/10",
                    badge: "bg-purple-600 text-white",
                    icon: ShieldAlert
                  },
                  {
                    key: "absent",
                    label: "Ausente (A)",
                    desc: "No asistió",
                    borderActive: "border-rose-500 bg-rose-50/80 text-rose-900 shadow-sm shadow-rose-500/10",
                    badge: "bg-rose-600 text-white",
                    icon: X
                  }
                ].map((s) => {
                  const isSelected = quickAttendanceModal.currentStatus === s.key;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setQuickAttendanceModal(prev => ({ ...prev, currentStatus: s.key }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                        isSelected 
                          ? s.borderActive 
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-['Outfit'] font-black text-xs">
                          {s.label}
                        </span>
                        <Icon className={`w-4 h-4 ${isSelected ? "opacity-100" : "opacity-40"}`} />
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {s.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pedagogical Observations */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-500" />
                  Observación Pedagógica (Opcional)
                </label>
                {quickObsText && (
                  <button
                    type="button"
                    onClick={() => setQuickObsText("")}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600"
                  >
                    Borrar nota
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Esta observación aparecerá en el informe descargable/imprimible del alumno para esta fecha:
              </p>

              {/* Quick Preset Tags */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "💡 Gran participación",
                  "⭐ Trabajo destacado",
                  "📋 Tarea incompleta",
                  "⏳ Llegó tarde",
                  "💬 Conversa en clase",
                  "🩺 Retiro temprano",
                  "🎯 Buen desempeño",
                  "⚠️ Requiere refuerzo"
                ].map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setQuickObsText(prev => prev ? `${prev}. ${tag}` : tag)}
                    className="text-[11px] font-bold bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-xl transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={quickObsText}
                onChange={(e) => setQuickObsText(e.target.value)}
                placeholder="Escribe notas sobre participación, conducta, tareas o motivos de inasistencia..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setQuickAttendanceModal(null)}
                disabled={savingQuickAtt}
                className="rounded-xl h-11 px-5 font-bold text-slate-500 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => updateStudentAttendanceRecord(
                  quickAttendanceModal.session.id,
                  quickAttendanceModal.student.id,
                  quickAttendanceModal.currentStatus,
                  quickObsText
                )}
                disabled={savingQuickAtt}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-['Outfit'] font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 flex items-center gap-2"
              >
                {savingQuickAtt ? (
                  "Guardando..."
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Guardar Asistencia
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* TUTOR LINK SHARE MODAL */}
      <TutorLinkShareModal
        isOpen={showTutorShareModal}
        onClose={() => setShowTutorShareModal(false)}
        classData={classData}
        students={students}
        onUpdateClass={(updated) => setClassData(updated)}
      />

      <style>{`
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all 0.3s;
          color: #64748b;
        }
        .tab-btn:hover { color: #1e293b; }
        .tab-btn.active {
          background: white;
          color: #2563eb;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
      `}</style>
    </div>
  );
}
