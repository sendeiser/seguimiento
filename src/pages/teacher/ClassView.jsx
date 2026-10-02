import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { useToast } from "../../providers/ToastProvider";
import {
  CalendarPlus,
  Users,
  UserCheck,
  Trophy,
  Gamepad2,
  Share2,
  Shield,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";

import TutorLinkShareModal from "../../components/teacher/TutorLinkShareModal";
import ClassSessionsTab from "../../components/teacher/class-tabs/ClassSessionsTab";
import ClassStudentsTab from "../../components/teacher/class-tabs/ClassStudentsTab";
import ClassAttendanceTab from "../../components/teacher/class-tabs/ClassAttendanceTab";
import ClassGradesClosingTab from "../../components/teacher/class-tabs/ClassGradesClosingTab";
import ClassTutorTab from "../../components/teacher/class-tabs/ClassTutorTab";
import SessionModal from "../../components/teacher/class-modals/SessionModal";
import RewardHouseModal from "../../components/teacher/class-modals/RewardHouseModal";
import CuatrimestreModal from "../../components/teacher/class-modals/CuatrimestreModal";
import QuickAttendanceModal from "../../components/teacher/class-modals/QuickAttendanceModal";

// Lazy-load heavier tabs that are not required for primary attendance/session workflows
const ClassGamificationTab = lazy(() => import("../../components/teacher/class-tabs/ClassGamificationTab"));
const ClassArenaTab = lazy(() => import("../../components/teacher/class-tabs/ClassArenaTab"));

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
  const [activeTab, setActiveTab] = useState("sessions"); // sessions | students | attendance | gamification | arena | tutor
  const [arenaProgress, setArenaProgress] = useState([]);
  const [classDuels, setClassDuels] = useState([]);

  // Attendance Module State
  const [allAttendance, setAllAttendance] = useState([]);
  const [quickAttendanceModal, setQuickAttendanceModal] = useState(null); // { student, session, currentStatus, observation }
  const [savingQuickAtt, setSavingQuickAtt] = useState(false);

  // Tutor Portal Share Module State
  const [showTutorShareModal, setShowTutorShareModal] = useState(false);
  const [tutorUpdating, setTutorUpdating] = useState(false);

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
  const [modalForm, setModalForm] = useState({
    name: "",
    description: "",
    cost_coins: 100,
    icon: "🎁",
    color: "#3b82f6",
  });
  const [sessionForm, setSessionForm] = useState({
    date: new Date().toISOString().split("T")[0],
    cuatrimestre: 1,
  });

  // Skin Themes / Prices State
  const [skinRewards, setSkinRewards] = useState([]);
  const [skinPriceDrafts, setSkinPriceDrafts] = useState({});
  const [savingSkinId, setSavingSkinId] = useState(null);
  const [savingAllSkins, setSavingAllSkins] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // 1. Fetch core class data, attendance, and cosmetic skins in parallel
      const [
        { data: cls },
        { data: sData },
        { data: stData },
        { data: rwData },
        { data: hData },
        { data: attData },
        { data: skinData },
      ] = await Promise.all([
        supabase.from("classes").select("*").eq("id", id).single(),
        supabase.from("sessions").select("*").eq("class_id", id).order("date", { ascending: false }),
        supabase
          .from("class_students")
          .select("id, student_id, student_name, public_token, house_id, dni, profiles(full_name)")
          .eq("class_id", id),
        supabase.from("rewards").select("*").eq("class_id", id).order("created_at", { ascending: false }),
        supabase.from("class_houses").select("*").eq("class_id", id).order("created_at", { ascending: false }),
        supabase.from("attendance").select("*, sessions!inner(class_id)").eq("sessions.class_id", id),
        supabase.from("rewards").select("*").eq("category", "cosmetic").order("cost_coins", { ascending: true }),
      ]);

      // Ensure all attendance records are captured (with fallback if needed)
      let finalAttendance = attData || [];
      if (!finalAttendance.length && sData?.length) {
        const sessionIds = sData.map((s) => s.id);
        const { data: fallbackAtt } = await supabase.from("attendance").select("*").in("session_id", sessionIds);
        if (fallbackAtt?.length) finalAttendance = fallbackAtt;
      }
      setAllAttendance(finalAttendance);

      setClassData(cls);
      setSessions(sData || []);
      setStudents(
        (stData || []).sort((a, b) => {
          const nameA = getStudentName(a);
          const nameB = getStudentName(b);
          return nameA.localeCompare(nameB);
        })
      );
      setRewards(rwData || []);
      setHouses(hData || []);

      // Skins and drafts setup
      const validSkins = skinData || [];
      setSkinRewards(validSkins);
      const drafts = {};
      validSkins.forEach((s) => {
        drafts[s.id] = s.cost_coins;
      });
      setSkinPriceDrafts(drafts);

      // CORE CLASS DATA READY! Reveal UI to teacher immediately
      setLoading(false);

      // 2. Fetch class purchases and arena progress in background, strictly scoped to this class
      const classRewardIds = (rwData || []).map((r) => r.id);
      const classStudentIds = (stData || []).map((s) => s.id);

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
          .select(
            "*, challenger:class_students!challenges_challenger_cs_id_fkey(id, student_name), challenged:class_students!challenges_challenged_cs_id_fkey(id, student_name)"
          )
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
  const handleAddStudent = async (name) => {
    if (!name?.trim()) return;
    const { error } = await supabase.from("class_students").insert([{ class_id: id, student_name: name.trim() }]);
    if (!error) {
      fetchAll();
    } else {
      console.error("Error agregando alumno:", error);
      toast("Error al agregar alumno: " + error.message, "error");
    }
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
    setStudents((prev) => prev.map((s) => (s.id === sid ? { ...s, dni } : s)));
  };

  const handleToggleTutorPortal = async () => {
    const currentStatus = classData?.tutor_portal_enabled !== false;
    const newStatus = !currentStatus;
    setTutorUpdating(true);
    try {
      const { error } = await supabase.from("classes").update({ tutor_portal_enabled: newStatus }).eq("id", id);
      if (error) throw error;
      setClassData((prev) => ({ ...prev, tutor_portal_enabled: newStatus }));
      toast(
        newStatus
          ? "✅ Enlace de consulta de boletín HABILITADO para familias y alumnos"
          : "⏸️ Enlace de consulta de boletín DESHABILITADO temporalmente",
        newStatus ? "success" : "info"
      );
    } catch (err) {
      console.error("Error al actualizar estado del portal:", err);
      toast("Error al actualizar el estado del enlace", "error");
    } finally {
      setTutorUpdating(false);
    }
  };

  const handleToggleDniRegistration = async () => {
    const currentStatus = classData?.dni_registration_enabled !== false;
    const newStatus = !currentStatus;
    setTutorUpdating(true);
    try {
      const { error } = await supabase.from("classes").update({ dni_registration_enabled: newStatus }).eq("id", id);
      if (error) throw error;
      setClassData((prev) => ({ ...prev, dni_registration_enabled: newStatus }));
      toast(
        newStatus
          ? "✅ Enlace para CARGAR DNI HABILITADO para estudiantes y familias"
          : "⏸️ Enlace para CARGAR DNI DESHABILITADO temporalmente",
        newStatus ? "success" : "info"
      );
    } catch (err) {
      console.error("Error al actualizar estado de carga de DNI:", err);
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
      is_present: isPres,
    };
    if (cleanObs !== undefined) {
      payload.observation = cleanObs || null;
    }

    const { error } = await supabase.from("attendance").upsert(payload, { onConflict: "session_id,class_student_id" });
    if (error) {
      toast("Error al actualizar asistencia: " + error.message, "error");
    } else {
      toast("Asistencia actualizada correctamente", "success");
      setAllAttendance((prev) => {
        const idx = prev.findIndex((a) => a.session_id === sessionId && a.class_student_id === classStudentId);
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
      cost_coins: parseInt(modalForm.cost_coins, 10),
      icon: modalForm.icon,
      category: modalForm.category || "item",
      metadata:
        modalForm.category === "game_pass"
          ? {
              game_name: modalForm.game_name,
              duration_minutes: parseInt(modalForm.duration_minutes || 60, 10),
            }
          : {},
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
      icon: modalForm.icon,
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
      let { error } = await supabase
        .from("sessions")
        .update({ date, cuatrimestre: cuatrimestreVal })
        .eq("id", editingSession.id);
      if (error && (error.message?.includes("cuatrimestre") || error.code === "PGRST204")) {
        const { error: fallbackErr } = await supabase.from("sessions").update({ date }).eq("id", editingSession.id);
        if (fallbackErr) {
          toast(fallbackErr.message, "error");
          return;
        }
      } else if (error) {
        toast(error.message, "error");
        return;
      }
    } else {
      const existing = sessions.find((s) => s.date === date);
      if (existing) {
        navigate(`/session/${existing.id}`);
        return;
      }

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

      if (sError) {
        toast(sError.message, "error");
        return;
      }

      // Cloning logic: Copy criteria and grades from last session
      const lastSession = sessions[0];
      if (lastSession) {
        const { data: lastCriteria } = await supabase
          .from("session_criteria")
          .select("*")
          .eq("session_id", lastSession.id);

        if (lastCriteria && lastCriteria.length > 0) {
          const { data: newCriteria, error: cError } = await supabase
            .from("session_criteria")
            .insert(lastCriteria.map((c) => ({ session_id: sessionData.id, name: c.name, max_score: c.max_score })))
            .select();

          if (!cError && newCriteria) {
            const { data: lastGrades } = await supabase
              .from("grades")
              .select("*")
              .in("criteria_id", lastCriteria.map((c) => c.id));

            if (lastGrades && lastGrades.length > 0) {
              const critMap = {};
              newCriteria.forEach((nc) => {
                const oldC = lastCriteria.find((oc) => oc.name === nc.name);
                if (oldC) critMap[oldC.id] = nc.id;
              });

              const newGrades = lastGrades
                .map((lg) => ({
                  class_student_id: lg.class_student_id,
                  criteria_id: critMap[lg.criteria_id],
                  score: lg.score,
                  comment: lg.comment,
                  student_id: lg.student_id,
                }))
                .filter((ng) => ng.criteria_id);

              if (newGrades.length > 0) {
                await supabase.from("grades").insert(newGrades);
              }
            }
          }
        } else {
          const defaultCriteria = ["Conducta", "Participación", "Carpeta", "Actividades"];
          await supabase
            .from("session_criteria")
            .insert(defaultCriteria.map((name) => ({ session_id: sessionData.id, name, max_score: 10 })));
        }
      } else {
        const defaultCriteria = ["Conducta", "Participación", "Carpeta", "Actividades"];
        await supabase
          .from("session_criteria")
          .insert(defaultCriteria.map((name) => ({ session_id: sessionData.id, name, max_score: 10 })));
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
      cuatrimestre: activeCuatrimestre,
    });
    setShowSessionModal(true);
  };

  const handleEditSession = (s) => {
    setEditingSession(s);
    setSessionForm({
      date: s.date,
      cuatrimestre: s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1),
    });
    setShowSessionModal(true);
  };

  const handleResetCuatrimestreGrades = async (cuatrimestreNumber) => {
    const label = cuatrimestreNumber === 2 ? "2º Cuatrimestre" : "1º Cuatrimestre";
    const confirmMessage = `¿Estás seguro de que deseas RESETEAR únicamente las notas del ${label}? Las notas de los otros periodos no serán afectadas.`;

    if (!(await confirm(confirmMessage))) return;

    try {
      const targetSessions = sessions.filter(
        (s) => (s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1)) === cuatrimestreNumber
      );
      if (targetSessions.length === 0) {
        toast(`No hay sesiones registradas en el ${label}`, "info");
        return;
      }

      const sessionIds = targetSessions.map((s) => s.id);
      const { data: criteriaData } = await supabase.from("session_criteria").select("id").in("session_id", sessionIds);
      if (criteriaData && criteriaData.length > 0) {
        const criteriaIds = criteriaData.map((c) => c.id);
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

  // --- SKIN PRICE MANAGEMENT ---
  const handleUpdateSkinPrice = async (skinId) => {
    const newPrice = parseInt(skinPriceDrafts[skinId], 10);
    if (isNaN(newPrice) || newPrice < 0) {
      toast("El precio debe ser un número válido mayor o igual a 0", "error");
      return;
    }
    setSavingSkinId(skinId);
    const { error } = await supabase.from("rewards").update({ cost_coins: newPrice }).eq("id", skinId);
    setSavingSkinId(null);
    if (error) {
      toast("Error al actualizar el precio: " + error.message, "error");
    } else {
      toast("✅ Precio actualizado correctamente", "success");
      setSkinRewards((prev) => prev.map((s) => (s.id === skinId ? { ...s, cost_coins: newPrice } : s)));
    }
  };

  const handleSaveAllSkinPrices = async () => {
    const modified = skinRewards.filter(
      (s) => skinPriceDrafts[s.id] !== undefined && parseInt(skinPriceDrafts[s.id], 10) !== s.cost_coins
    );
    if (modified.length === 0) {
      toast("No hay cambios pendientes", "info");
      return;
    }
    setSavingAllSkins(true);
    try {
      await Promise.all(
        modified.map((s) =>
          supabase.from("rewards").update({ cost_coins: parseInt(skinPriceDrafts[s.id], 10) }).eq("id", s.id)
        )
      );
      setSkinRewards((prev) =>
        prev.map((s) => ({ ...s, cost_coins: parseInt(skinPriceDrafts[s.id] ?? s.cost_coins, 10) }))
      );
      toast(`✅ ${modified.length} precio(s) actualizado(s)`, "success");
    } catch (err) {
      toast("Error al guardar precios: " + err.message, "error");
    }
    setSavingAllSkins(false);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );

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
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`tab-btn flex-shrink-0 ${activeTab === "sessions" ? "active" : ""}`}
          >
            <CalendarPlus className="w-4 h-4" /> Sesiones
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`tab-btn flex-shrink-0 ${activeTab === "students" ? "active" : ""}`}
          >
            <Users className="w-4 h-4" /> Alumnos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`tab-btn flex-shrink-0 ${activeTab === "attendance" ? "active" : ""}`}
          >
            <UserCheck className="w-4 h-4" /> Asistencia
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("closing")}
            className={`tab-btn flex-shrink-0 ${activeTab === "closing" ? "active" : ""}`}
          >
            <GraduationCap className="w-4 h-4" /> Cierre de Notas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gamification")}
            className={`tab-btn flex-shrink-0 ${activeTab === "gamification" ? "active" : ""}`}
          >
            <Trophy className="w-4 h-4" /> Gamificación
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("arena")}
            className={`tab-btn flex-shrink-0 ${activeTab === "arena" ? "active" : ""}`}
          >
            <Gamepad2 className="w-4 h-4" /> Arena
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tutor")}
            className={`tab-btn flex-shrink-0 ${activeTab === "tutor" ? "active" : ""}`}
          >
            <Share2 className="w-4 h-4" /> Boletín DNI
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "sessions" && (
        <ClassSessionsTab
          classData={classData}
          sessions={sessions}
          students={students}
          allAttendance={allAttendance}
          activeCuatrimestre={activeCuatrimestre}
          cuatrimestreFilter={cuatrimestreFilter}
          setCuatrimestreFilter={setCuatrimestreFilter}
          onCreateSession={createSession}
          onEditSession={handleEditSession}
          onDeleteSession={handleDeleteSession}
          onOpenCuatrimestreModal={() => setShowCuatrimestreModal(true)}
          copyClassLink={copyClassLink}
          copied={copied}
        />
      )}

      {activeTab === "students" && (
        <ClassStudentsTab
          students={students}
          houses={houses}
          getStudentName={getStudentName}
          onAddStudent={handleAddStudent}
          onDeleteStudent={handleDeleteStudent}
          updateStudentHouse={updateStudentHouse}
          updateStudentDni={updateStudentDni}
        />
      )}

      {activeTab === "attendance" && (
        <ClassAttendanceTab
          classData={classData}
          sessions={sessions}
          students={students}
          allAttendance={allAttendance}
          cuatrimestreFilter={cuatrimestreFilter}
          getStudentName={getStudentName}
          onOpenQuickAttendance={(data) => setQuickAttendanceModal(data)}
        />
      )}

      {activeTab === "closing" && (
        <ClassGradesClosingTab
          classData={classData}
          sessions={sessions}
          students={students}
          allAttendance={allAttendance}
          getStudentName={getStudentName}
        />
      )}

      {activeTab === "gamification" && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
          }
        >
          <ClassGamificationTab
            rewards={rewards}
            houses={houses}
            purchases={purchases}
            skinRewards={skinRewards}
            skinPriceDrafts={skinPriceDrafts}
            setSkinPriceDrafts={setSkinPriceDrafts}
            savingSkinId={savingSkinId}
            savingAllSkins={savingAllSkins}
            onOpenCreateReward={() => {
              setEditingItem(null);
              setModalForm({
                name: "",
                description: "",
                cost_coins: 100,
                icon: "🎁",
                category: "item",
                game_name: "Sudoku",
                duration_minutes: 60,
              });
              setShowRewardModal(true);
            }}
            onEditReward={(r) => {
              setEditingItem(r);
              setModalForm({
                ...r,
                game_name: r.metadata?.game_name || "Sudoku",
                duration_minutes: r.metadata?.duration_minutes || 60,
              });
              setShowRewardModal(true);
            }}
            onDeleteReward={handleDeleteReward}
            onOpenCreateHouse={() => {
              setEditingItem(null);
              setModalForm({ name: "", icon: "🏠", color: "#3b82f6" });
              setShowHouseModal(true);
            }}
            onEditHouse={(h) => {
              setEditingItem(h);
              setModalForm(h);
              setShowHouseModal(true);
            }}
            onDeleteHouse={handleDeleteHouse}
            handleUpdatePurchaseStatus={handleUpdatePurchaseStatus}
            handleUpdateSkinPrice={handleUpdateSkinPrice}
            handleSaveAllSkinPrices={handleSaveAllSkinPrices}
          />
        </Suspense>
      )}

      {activeTab === "arena" && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          }
        >
          <ClassArenaTab
            students={students}
            arenaProgress={arenaProgress}
            classDuels={classDuels}
            getStudentName={getStudentName}
          />
        </Suspense>
      )}

      {activeTab === "tutor" && (
        <ClassTutorTab
          classData={classData}
          students={students}
          BASE_URL={BASE_URL}
          tutorUpdating={tutorUpdating}
          handleToggleDniRegistration={handleToggleDniRegistration}
          handleToggleTutorPortal={handleToggleTutorPortal}
          updateStudentDni={updateStudentDni}
          getStudentName={getStudentName}
          toast={toast}
        />
      )}

      {/* --- MODALS --- */}
      <SessionModal
        isOpen={showSessionModal}
        onClose={() => {
          setShowSessionModal(false);
          setEditingSession(null);
        }}
        editingSession={editingSession}
        sessionForm={sessionForm}
        setSessionForm={setSessionForm}
        onSaveSession={handleSaveSession}
      />

      <RewardHouseModal
        showRewardModal={showRewardModal}
        showHouseModal={showHouseModal}
        onClose={() => {
          setShowRewardModal(false);
          setShowHouseModal(false);
        }}
        editingItem={editingItem}
        modalForm={modalForm}
        setModalForm={setModalForm}
        handleSaveReward={handleSaveReward}
        handleSaveHouse={handleSaveHouse}
      />

      <CuatrimestreModal
        isOpen={showCuatrimestreModal}
        onClose={() => setShowCuatrimestreModal(false)}
        activeCuatrimestre={activeCuatrimestre}
        setActiveCuatrimestre={setActiveCuatrimestre}
        handleResetCuatrimestreGrades={handleResetCuatrimestreGrades}
        toast={toast}
      />

      <QuickAttendanceModal
        modalData={quickAttendanceModal}
        onClose={() => setQuickAttendanceModal(null)}
        onSave={updateStudentAttendanceRecord}
        savingQuickAtt={savingQuickAtt}
        getStudentName={getStudentName}
      />

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
