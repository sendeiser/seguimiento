import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, X, Users, XCircle, ChevronLeft, ChevronRight, LayoutGrid, ArrowLeft, PlusCircle, Sparkles, Trash2, TrendingUp, Pencil } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useTheme } from "../../providers/ThemeProvider";

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

  const inputRefs = useRef({});
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
    if (!confirm("¿Eliminar este criterio y todas sus notas?")) return;
    await supabase.from("session_criteria").delete().eq("id", criteriaId);
    setCriteria(prev => prev.filter(c => c.id !== criteriaId));
  };

  const handleFillMaxGrades = async (crit) => {
    if (!confirm(`¿Llenar con nota MÁXIMA (${crit.max_score}) a todos los alumnos presentes?`)) return;
    const studentsToUpdate = students.filter(s => {
      const isPresent = attendance[s.cs_id] !== false;
      const key = `${s.cs_id}_${crit.id}`;
      const val = grades[key];
      return isPresent && (val === undefined || val === "");
    });
    if (studentsToUpdate.length === 0) { alert("Todos los alumnos presentes ya tienen nota."); return; }
    const newGrades = { ...grades };
    const upserts = [];
    studentsToUpdate.forEach(s => {
      const key = `${s.cs_id}_${crit.id}`;
      newGrades[key] = crit.max_score.toString();
      upserts.push({ class_student_id: s.cs_id, criteria_id: crit.id, score: crit.max_score, updated_at: new Date().toISOString() });
    });
    setGrades(newGrades);
    await supabase.from("grades").upsert(upserts, { onConflict: "class_student_id,criteria_id" });
  };

  const handleGradeChange = (csId, criteriaId, value) => setGrades(prev => ({ ...prev, [`${csId}_${criteriaId}`]: value }));

  const saveGrade = async (csId, criteriaId, value, maxScore) => {
    const score = parseFloat(value);
    if (value === "" || isNaN(score)) return;
    const key = `${csId}_${criteriaId}`;
    setSaving(prev => ({ ...prev, [key]: true }));
    await supabase.from("grades").upsert({ class_student_id: csId, criteria_id: criteriaId, score, updated_at: new Date().toISOString() }, { onConflict: "class_student_id,criteria_id" });
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

  const glassCard = {
    background: isDark 
      ? 'linear-gradient(145deg, hsl(220 20% 12% / 0.6), hsl(220 20% 8% / 0.3))'
      : 'linear-gradient(145deg, hsl(0 0% 100% / 0.6), hsl(0 0% 100% / 0.3))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: isDark ? '1px solid hsl(0 0% 100% / 0.08)' : '1px solid hsl(0 0% 100% / 0.15)',
    boxShadow: isDark ? '0 8px 32px rgb(0 0 0 / 0.3)' : '0 8px 32px rgb(0 0 0 / 0.1)',
  };

  const glassInput = {
    background: isDark ? 'rgb(0 0 0 / 0.2)' : 'rgb(255 255 255 / 0.5)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: isDark ? '1px solid hsl(0 0% 100% / 0.08)' : '1px solid hsl(0 0% 100% / 0.1)',
    color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)',
  };

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
            <p className="font-['DM_Sans'] font-medium text-sm mt-1 flex items-center gap-2" style={{ color: isDark ? 'hsl(220 10% 60%)' : 'hsl(220 8% 35%)' }}>
              {className} · {format(new Date(session.date + "T12:00:00"), "d 'de' MMMM", { locale: es })}
              <button onClick={() => { const newDate = prompt("Nueva fecha (YYYY-MM-DD):", session.date); if (newDate && newDate !== session.date) supabase.from("sessions").update({ date: newDate }).eq("id", id).then(() => setSession(prev => ({...prev, date: newDate}))); }} className="p-1 rounded-lg transition-all hover:scale-110" style={{ background: isDark ? 'hsl(0 0% 100% / 0.05)' : 'hsl(0 0% 0% / 0.03)' }}>
                <Pencil className="w-3 h-3" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }} />
              </button>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <input type="text" placeholder="Buscar alumno..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setFocusIndex(0); }}
              className="input w-full" style={glassInput} />
            <Users className="input-icon" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }} />
          </div>

          <div className="flex items-center gap-1 p-1.5 rounded-2xl" style={glassCard}>
            {[
              { mode: "table", icon: LayoutGrid, label: "Lista" },
              { mode: "cards", icon: Users, label: "Tarjetas" },
              { mode: "focus", icon: Users, label: "Enfoque" }
            ].map(({ mode, icon: Icon, label }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className="px-3 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                style={{
                  background: viewMode === mode ? 'linear-gradient(135deg, hsl(262 83% 60%), hsl(270 70% 55%))' : 'transparent',
                  color: viewMode === mode ? 'white' : isDark ? 'hsl(220 10% 60%)' : 'hsl(220 8% 35%)',
                  boxShadow: viewMode === mode ? '0 4px 20px hsl(262 83% 60% / 0.4)' : 'none',
                }}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Focus Mode */}
      {viewMode === "focus" ? (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: isDark ? 'hsl(220 25% 6%)' : 'hsl(220 40% 98%)' }}>
          <div className="flex items-center justify-between p-6" style={{ borderBottom: isDark ? '1px solid hsl(0 0% 100% / 0.08)' : '1px solid hsl(0 0% 0% / 0.05)' }}>
            <button onClick={() => setViewMode("table")} className="p-3 rounded-2xl transition-all hover:scale-105" style={glassCard}>
              <ArrowLeft className="w-6 h-6" style={{ color: isDark ? 'hsl(220 20% 70%)' : 'hsl(220 8% 35%)' }} />
            </button>
            <div className="text-center">
              <h3 className="font-['Outfit'] font-extrabold text-lg uppercase tracking-widest" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>Modo Enfoque</h3>
              <p className="font-['DM_Sans'] font-bold text-sm mt-1" style={{ color: 'hsl(262 70% 60%)' }}>{className}</p>
            </div>
            <button onClick={() => setShowStudentList(!showStudentList)} className="p-3 rounded-2xl transition-all hover:scale-105" style={glassCard}>
              <LayoutGrid className="w-6 h-6" style={{ color: isDark ? 'hsl(220 20% 70%)' : 'hsl(220 8% 35%)' }} />
            </button>
          </div>

          {showStudentList && (
            <div className="absolute inset-0 z-50 p-6 overflow-y-auto" style={{ background: isDark ? 'hsl(220 25% 6%)' : 'hsl(220 40% 98%)' }}>
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-['Outfit'] font-extrabold text-xl" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>Lista de Alumnos</h4>
                <button onClick={() => setShowStudentList(false)} className="font-['DM_Sans'] font-bold uppercase text-xs tracking-widest" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>Cerrar</button>
              </div>
              <div className="space-y-3">
                {filteredStudents.map((st, idx) => (
                  <button key={st.cs_id} onClick={() => { setFocusIndex(idx); setShowStudentList(false); }}
                    className="w-full p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.02]"
                    style={{
                      background: idx === focusIndex ? 'linear-gradient(135deg, hsl(262 83% 60%), hsl(270 70% 55%))' : isDark 
                        ? 'linear-gradient(145deg, hsl(220 20% 12% / 0.6), hsl(220 20% 8% / 0.3))'
                        : 'linear-gradient(145deg, hsl(0 0% 100% / 0.6), hsl(0 0% 100% / 0.3))',
                      backdropFilter: 'blur(20px)',
                      border: isDark ? '1px solid hsl(0 0% 100% / 0.08)' : '1px solid hsl(0 0% 100% / 0.1)',
                      boxShadow: idx === focusIndex ? '0 8px 30px hsl(262 83% 60% / 0.4)' : '0 4px 20px rgb(0 0 0 / 0.1)',
                      color: idx === focusIndex ? 'white' : isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)',
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-['Outfit'] font-extrabold" style={{ background: 'hsl(0 0% 100% / 0.2)', color: 'white' }}>
                      {idx + 1}
                    </div>
                    <span className="font-['DM_Sans'] font-bold flex-1 text-left">{st.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleAttendance(st.cs_id); }} className="px-3 py-1 rounded-lg text-xs font-bold uppercase">
                      {attendance[st.cs_id] !== false ? (
                        <span className="flex items-center gap-1" style={{ color: '#10b981' }}><CheckCircle2 className="w-4 h-4" /> Presente</span>
                      ) : (
                        <span className="flex items-center gap-1" style={{ color: '#ef4444' }}><X className="w-4 h-4" /> Ausente</span>
                      )}
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 rounded-[3rem] blur-xl opacity-50" style={{ background: 'linear-gradient(135deg, hsl(262 83% 60%), hsl(185 85% 60%))' }} />
                <div className="relative w-24 h-24 rounded-[3rem] flex items-center justify-center text-4xl font-['Outfit'] font-extrabold text-white"
                  style={{ background: 'linear-gradient(135deg, hsl(262 83% 60%), hsl(270 70% 55%))', boxShadow: '0 8px 30px hsl(262 83% 60% / 0.4)' }}>
                  {currentStudent?.name[0].toUpperCase()}
                </div>
              </div>
              <h2 className="text-2xl font-['Outfit'] font-extrabold" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>{currentStudent?.name}</h2>
              <p className="font-['DM_Sans'] font-bold text-sm mt-2 uppercase tracking-widest" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>Alumno {focusIndex + 1} de {filteredStudents.length}</p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              {criteria.map((c, idx) => {
                const key = `${currentStudent?.cs_id}_${c.id}`;
                const val = grades[key] ?? "";
                const inheritedVal = inheritedGrades[`${currentStudent?.cs_id}_${c.name}`] ?? "";
                const isSaving = saving[key];
                const displayVal = val !== "" ? val : inheritedVal;
                const isInherited = val === "" && inheritedVal !== "";

                return (
                  <div key={c.id} className="p-5 rounded-2xl transition-all hover:scale-[1.01]" style={glassCard}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-['DM_Sans'] font-bold text-xs uppercase tracking-widest" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>{idx + 1}/{criteria.length}</span>
                      <button onClick={() => alert(`Sugerencia IA: ${generateAIFeedback(currentStudent.cs_id)}`)} 
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, hsl(262 83% 20%), hsl(262 70% 15%))', color: 'hsl(270 70% 70%)' }}>
                        <Sparkles className="w-3 h-3" /> IA
                      </button>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-['Outfit'] font-extrabold text-lg" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>{c.name}</h4>
                      <span className="font-['DM_Sans'] font-bold text-xs uppercase tracking-widest" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>/{c.max_score}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <input ref={el => inputRefs.current[key] = el} type="number" min="0" max={c.max_score} step="0.5" value={displayVal}
                        onChange={e => handleGradeChange(currentStudent.cs_id, c.id, e.target.value)}
                        onBlur={e => saveGrade(currentStudent.cs_id, c.id, e.target.value, c.max_score)}
                        placeholder="0.0" className="input text-center font-['Outfit'] font-extrabold text-2xl flex-1" style={{ ...glassInput, background: isInherited ? (isDark ? 'hsl(35 90% 20% / 0.3)' : 'hsl(35 90% 30% / 0.3)') : undefined }} />
                      {isSaving && <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid hsl(262 83% 60%)', borderTopColor: 'transparent' }} />}
                      {val !== "" && !isSaving && <CheckCircle2 className="w-5 h-5" style={{ color: '#10b981' }} />}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0.5, 0].filter(n => n <= c.max_score).map(num => (
                        <button key={num} onClick={() => setQuickGrade(currentStudent.cs_id, c.id, num, c.max_score)}
                          className="btn-sm rounded-lg font-bold text-xs transition-all hover:scale-105"
                          style={{
                            background: val === num.toString() 
                              ? 'linear-gradient(135deg, hsl(262 83% 60%), hsl(270 70% 55%))'
                              : isDark ? 'hsl(0 0% 100% / 0.05)' : 'hsl(0 0% 0% / 0.03)',
                            color: val === num.toString() ? 'white' : isDark ? 'hsl(220 10% 70%)' : 'hsl(220 8% 35%)',
                            boxShadow: val === num.toString() ? '0 4px 15px hsl(262 83% 60% / 0.4)' : 'none',
                          }}>
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6" style={{ borderTop: isDark ? '1px solid hsl(0 0% 100% / 0.08)' : '1px solid hsl(0 0% 0% / 0.05)' }}>
            <div className="max-w-md mx-auto flex items-center gap-3">
              <Button onClick={() => setFocusIndex(prev => (prev - 1 + filteredStudents.length) % filteredStudents.length)} 
                className="h-16 w-16 rounded-2xl" style={{ ...glassCard, color: isDark ? 'hsl(220 20% 70%)' : 'hsl(220 8% 35%)' }} disabled={filteredStudents.length <= 1}>
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button onClick={() => setFocusIndex(prev => (prev + 1) % filteredStudents.length)}
                className="flex-1 h-16 rounded-2xl font-['DM_Sans'] font-bold text-lg gap-2"
                style={{ background: 'linear-gradient(135deg, hsl(262 83% 60%), hsl(270 70% 55%))', color: 'white', boxShadow: '0 8px 30px hsl(262 83% 60% / 0.4)' }} disabled={filteredStudents.length <= 1}>
                Siguiente Alumno <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[2.5rem] overflow-hidden" style={glassCard}>
          {/* Gradient Top Bar */}
          <div className="h-1.5 w-full" style={{
            background: 'linear-gradient(90deg, hsl(262 83% 60%), hsl(185 85% 60%), hsl(270 70% 65%), hsl(262 83% 60%))',
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 3s ease infinite'
          }} />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 px-8 gap-4" style={{ borderBottom: isDark ? '1px solid hsl(0 0% 100% / 0.08)' : '1px solid hsl(0 0% 0% / 0.05)' }}>
            <div>
              <h2 className="font-['Outfit'] font-extrabold text-xl" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>Planilla de Notas</h2>
              <p className="font-['DM_Sans'] font-medium text-xs mt-1 uppercase tracking-widest" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>Atajo: [Enter] para siguiente</p>
            </div>
            <Button onClick={handleAddCriteria} className="btn-primary gap-2 rounded-2xl h-11 px-6 font-['DM_Sans'] font-bold">
              <PlusCircle className="w-5 h-5" /> Agregar Criterio
            </Button>
          </div>
          
          <div className="p-0">
            {criteria.length === 0 ? (
              <div className="py-24 text-center px-6">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 rounded-[3rem] blur-xl opacity-30" style={{ background: 'linear-gradient(135deg, hsl(262 83% 60%), hsl(185 85% 60%))' }} />
                  <div className="relative w-20 h-20 rounded-[3rem] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(262 83% 20%), hsl(270 70% 15%))' }}>
                    <PlusCircle className="w-10 h-10" style={{ color: 'hsl(270 70% 70%)', opacity: 0.5 }} />
                  </div>
                </div>
                <p className="font-['Outfit'] font-extrabold text-xl" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>No hay criterios de evaluación</p>
                <p className="font-['DM_Sans'] font-medium mt-2" style={{ color: isDark ? 'hsl(220 10% 60%)' : 'hsl(220 8% 35%)' }}>Definí los aspectos a evaluar hoy</p>
                <Button onClick={handleAddCriteria} className="btn-primary mt-8 gap-2 rounded-2xl h-12 px-8 font-['DM_Sans'] font-bold">
                  <PlusCircle className="w-5 h-5" /> Crear criterio
                </Button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-24 text-center">
                <Users className="w-16 h-16 mx-auto mb-4" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }} />
                <p className="font-['Outfit'] font-extrabold" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>No se encontraron alumnos</p>
              </div>
            ) : viewMode === "table" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: isDark ? 'hsl(220 20% 10% / 0.5)' : 'hsl(220 40% 96%)' }}>
                      <th onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="text-left px-4 py-4 font-['DM_Sans'] font-bold text-xs uppercase tracking-widest cursor-pointer" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>Alumno</th>
                      {criteria.map(c => (
                        <th key={c.id} className="px-4 py-4 text-center font-['DM_Sans'] font-bold text-xs uppercase tracking-widest relative group" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>
                          <div className="truncate">{c.name}</div>
                          <div className="text-[10px] font-normal" style={{ color: isDark ? 'hsl(220 10% 40%)' : 'hsl(220 10% 45%)' }}>Max: {c.max_score}</div>
                          <button onClick={() => handleFillMaxGrades(c)} className="absolute top-1 left-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'hsl(140 70% 20%)' }}><CheckCircle2 className="w-3 h-3" style={{ color: '#10b981' }} /></button>
                          <button onClick={() => handleDeleteCriteria(c.id)} className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'hsl(0 70% 20%)' }}><Trash2 className="w-3 h-3" style={{ color: '#ef4444' }} /></button>
                        </th>
                      ))}
                      <th className="hidden sm:table-cell px-4 py-4 text-center font-['DM_Sans'] font-bold text-xs uppercase tracking-widest" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>Tendencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, sIdx) => {
                      const names = student.name.split(" ");
                      const mobileName = names.length > 1 ? `${names[0]} ${names[1][0]}.` : names[0];
                      return (
                        <tr key={student.cs_id} className="group">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <button onClick={() => toggleAttendance(student.cs_id)} 
                                className={`w-4 h-4 rounded-full border-2 transition-all ${attendance[student.cs_id] !== false ? 'bg-emerald-500 border-emerald-300' : 'bg-red-500 border-red-300'}`} />
                              <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-['Outfit'] font-extrabold text-white"
                                style={{ background: 'linear-gradient(135deg, hsl(262 83% 60%), hsl(185 85% 60%))' }}>{student.name[0].toUpperCase()}</div>
                              <span className="font-['DM_Sans'] font-bold text-sm" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>
                                <span className="sm:hidden">{mobileName}</span><span className="hidden sm:inline">{student.name}</span>
                              </span>
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
                            return (
                              <td key={c.id} className={`px-4 py-4 text-center border-l transition-colors ${flash === "success" ? "flash-success" : flash === "danger" ? "flash-danger" : ""}`}>
                                <div className="relative inline-flex">
                                  <input ref={el => inputRefs.current[key] = el} type="number" min="0" max={c.max_score} step="0.5" value={displayVal}
                                    onChange={e => handleGradeChange(student.cs_id, c.id, e.target.value)}
                                    onBlur={e => saveGrade(student.cs_id, c.id, e.target.value, c.max_score)}
                                    onKeyDown={e => handleKeyDown(e, sIdx, cIdx)}
                                    placeholder="—" className="input w-20 text-center font-['DM_Sans'] font-bold"
                                    style={{ 
                                      background: isInherited 
                                        ? (isDark ? 'hsl(35 90% 15% / 0.3)' : 'hsl(35 90% 25% / 0.3)')
                                        : val !== '' 
                                          ? (isDark ? 'hsl(140 70% 15% / 0.3)' : 'hsl(140 70% 20% / 0.3)')
                                          : (isDark ? 'hsl(220 20% 10% / 0.3)' : 'hsl(220 40% 96%)'),
                                      color: isInherited 
                                        ? 'hsl(35 90% 60%)' 
                                        : val !== '' 
                                          ? '#10b981' 
                                          : (isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)')
                                    }} />
                                  {isSaving && <div className="absolute -right-2 top-1/2 -translate-y-1/2"><div className="w-2 h-2 rounded-full animate-ping" style={{ background: 'hsl(262 83% 60%)' }} /></div>}
                                </div>
                              </td>
                            );
                          })}
                          <td className="hidden sm:table-cell px-4 py-4 border-l">
                            {(() => {
                              const spark = sparklineData[student.cs_id]?.filter(d => d.pct !== null);
                              if (!spark || spark.length < 2) return <span className="font-['DM_Sans'] font-bold text-xs" style={{ color: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 10% 55%)' }}>—</span>;
                              const last = spark[spark.length - 1].pct;
                              const prev = spark[spark.length - 2].pct;
                              const color = last >= prev ? '#10b981' : '#ef4444';
                              return (
                                <div className="flex flex-col items-center">
                                  <ResponsiveContainer width={80} height={32}><LineChart data={spark}><Line type="monotone" dataKey="pct" stroke={color} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
                                  <span className="font-['DM_Sans'] font-bold text-xs" style={{ color }}>{last >= prev ? "▲" : "▼"} {last}%</span>
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
                  <div key={student.cs_id} className="p-6 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-xl" style={glassCard}>
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
                              onBlur={e => saveGrade(student.cs_id, c.id, e.target.value, c.max_score)} 
                              className="input input-sm w-14 text-center font-['DM_Sans'] font-bold" style={glassInput} />
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
      )}

      <style>{`
        @keyframes gradient-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .flash-success { background: hsl(140 70% 20% / 0.3) !important; }
        .flash-danger { background: hsl(0 70% 20% / 0.3) !important; }
      `}</style>
    </div>
  );
}