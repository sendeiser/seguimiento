import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  CalendarPlus, Users, Copy, Check, Plus, Link as LinkIcon, 
  Pencil, Trash2, X, ArrowLeft, Download, Trophy, 
  ShoppingBag, Shield, Star, Swords, Search, CheckCircle2, 
  ShoppingCart, Flame, AlertCircle, Coins as LucideCoins, ExternalLink, UserPlus,
  Gamepad2, Binary, Brain, Zap, BarChart3, Lock, Puzzle 
} from "lucide-react";

const BASE_URL = window.location.origin;

export default function ClassView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [houses, setHouses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("sessions"); // sessions | students | ranking | rewards | arena
  const [arenaProgress, setArenaProgress] = useState([]);

  // Modals state
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [modalForm, setModalForm] = useState({ name: "", description: "", cost_coins: 100, icon: "🎁", color: "#3b82f6" });
  const [sessionForm, setSessionForm] = useState({ date: new Date().toISOString().split("T")[0] });

  // Student management state
  const [newStudentName, setNewStudentName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      console.log("Fetching all data for class:", id);
      const [
        { data: cls }, 
        { data: sData }, 
        { data: stData },
        { data: rwData },
        { data: hData },
        { data: pData },
        { data: pData2 }
      ] = await Promise.all([
        supabase.from("classes").select("*").eq("id", id).single(),
        supabase.from("sessions").select("*").eq("class_id", id).order("date", { ascending: false }),
        supabase.from("class_students").select("id, student_id, student_name, public_token, house_id, dni, profiles(full_name)").eq("class_id", id),
        supabase.from("rewards").select("*").eq("class_id", id).order("created_at", { ascending: false }),
        supabase.from("class_houses").select("*").eq("class_id", id).order("created_at", { ascending: false }),
        supabase.from("student_purchases").select("*, rewards(name, icon), profiles(full_name)").order("created_at", { ascending: false }),
        supabase.from("student_game_progress").select("*")
      ]);

      // Filter progress for this class
      const classStudentIds = (stData || []).map(s => s.id);
      const filteredProg = (pData2 || []).filter(p => classStudentIds.includes(p.class_student_id));
      setArenaProgress(filteredProg);

      console.log("Students found:", stData?.length || 0);

      setClassData(cls);
      setSessions(sData || []);
      setStudents((stData || []).sort((a, b) => {
         const nameA = getStudentName(a);
         const nameB = getStudentName(b);
         return nameA.localeCompare(nameB);
      }));
      setRewards(rwData || []);
      setHouses(hData || []);
      
      const classRewardIds = (rwData || []).map(r => r.id);
      setPurchases((pData || []).filter(p => classRewardIds.includes(p.reward_id)));
    } catch (err) {
      console.error("Error total en fetchAll:", err);
    }
    setLoading(false);
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
    if (!confirm("¿Eliminar alumno de esta clase?")) return;
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
    if (!confirm("¿Eliminar este premio?")) return;
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
    if (!confirm("¿Eliminar esta casa?")) return;
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
    const { date } = sessionForm;
    if (!date) return;

    if (editingSession) {
      const { error } = await supabase.from("sessions").update({ date }).eq("id", editingSession.id);
      if (error) { alert(error.message); return; }
    } else {
      const existing = sessions.find(s => s.date === date);
      if (existing) { navigate(`/session/${existing.id}`); return; }

      const { data: sessionData, error: sError } = await supabase
        .from("sessions")
        .insert([{ class_id: id, date }])
        .select()
        .single();
      
      if (sError) { alert(sError.message); return; }

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
    setSessionForm({ date: new Date().toISOString().split("T")[0] });
    setShowSessionModal(true);
  };

  const handleEditSession = (s) => {
    setEditingSession(s);
    setSessionForm({ date: s.date });
    setShowSessionModal(true);
  };

  const handleDeleteSession = async (sid) => {
    if (!confirm("¿Eliminar esta sesión y todas sus notas?")) return;
    const { error } = await supabase.from("sessions").delete().eq("id", sid);
    if (error) alert(error.message);
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
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-[24px] w-fit border border-slate-200/50">
        <button onClick={() => setActiveTab("sessions")} className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}><CalendarPlus className="w-4 h-4" /> Sesiones</button>
        <button onClick={() => setActiveTab("students")} className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}><Users className="w-4 h-4" /> Alumnos</button>
        <button onClick={() => setActiveTab("gamification")} className={`tab-btn ${activeTab === 'gamification' ? 'active' : ''}`}><Trophy className="w-4 h-4" /> Gamificación</button>
        <button onClick={() => setActiveTab("arena")} className={`tab-btn ${activeTab === 'arena' ? 'active' : ''}`}><Gamepad2 className="w-4 h-4" /> Arena</button>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div onClick={createSession} className="border-2 border-dashed border-slate-200 rounded-[40px] p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all bg-white group">
               <div className="w-16 h-16 rounded-[24px] bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Plus className="w-8 h-8" /></div>
               <h4 className="font-black text-slate-800 text-lg">Nueva Sesión</h4>
            </div>
            {sessions.map(s => (
              <div key={s.id} className="bg-white rounded-[40px] border border-slate-100 p-8 flex flex-col hover:shadow-2xl transition-all group/card relative overflow-hidden">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/card:opacity-100 transition-all">
                  <Button onClick={() => handleEditSession(s)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-white border border-slate-100 shadow-sm"><Pencil className="w-3.5 h-3.5 text-slate-500" /></Button>
                  <Button onClick={() => handleDeleteSession(s.id)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-red-50 hover:bg-white border border-red-100 shadow-sm"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
                <h4 className="font-black text-slate-900 text-xl capitalize">{format(new Date(s.date + "T12:00:00"), "EEEE d", { locale: es })}</h4>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">{format(new Date(s.date + "T12:00:00"), "MMMM yyyy", { locale: es })}</p>
                <Link to={`/session/${s.id}`} className="mt-8"><Button className="w-full rounded-2xl h-12 font-black uppercase text-[10px]">Ingresar Notas</Button></Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. STUDENTS TAB */}
      {activeTab === "students" && (
        <div className="space-y-8 animate-in slide-up">
           <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <form onSubmit={handleAddStudent} className="flex gap-3 w-full md:w-auto">
                 <input 
                   placeholder="Nombre del alumno..." 
                   className="bg-white border border-slate-200 rounded-2xl h-14 px-6 font-bold w-full md:w-80 outline-none focus:border-blue-400 transition-all"
                   value={newStudentName}
                   onChange={e => setNewStudentName(e.target.value)}
                 />
                 <Button type="submit" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px]"><UserPlus className="w-5 h-5 mr-2" /> Agregar</Button>
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

           <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
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
                               <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black">
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
                               className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs outline-none focus:border-blue-400 w-32"
                               value={st.dni || ""}
                               onChange={e => updateStudentDni(st.id, e.target.value)}
                            />
                         </td>
                         <td className="px-8 py-6">
                            <select 
                              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs outline-none"
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
              {filteredStudents.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-bold italic">No hay alumnos registrados aún o que coincidan con la búsqueda.</div>
              )}
           </div>
        </div>
      )}

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
                         <div className="text-3xl w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">{r.icon}</div>
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
                            <div className="text-2xl">{p.rewards?.icon}</div>
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
      {activeTab === "arena" && (
        <div className="space-y-8 animate-in slide-up">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-[3rem] p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex items-center gap-6">
              <div className="bg-white/20 p-5 rounded-[24px] backdrop-blur-xl border border-white/20">
                <Gamepad2 className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight leading-none mb-2">Desempeño en la Arena</h2>
                <p className="text-indigo-100/80 font-medium italic">Seguimiento de récords y progreso en los minijuegos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
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
      )}

      {/* --- MODALS --- */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
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
                      onChange={e => setSessionForm({date: e.target.value})} 
                    />
                 </div>

                 <div className="flex flex-col gap-3 pt-4">
                    <Button onClick={handleSaveSession} className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">
                      {editingSession ? 'Actualizar Fecha' : 'Comenzar Clase'}
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
           <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-300">
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

      {/* Styles for tabs */}
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
