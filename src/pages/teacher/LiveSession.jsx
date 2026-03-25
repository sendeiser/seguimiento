import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Star, Award, TrendingUp, Info, ChevronLeft, ChevronRight, LayoutGrid, Maximize2, Search, Table as TableIcon, CheckCircle2, XCircle, Download, Sparkles, ArrowLeft, PlusCircle, Save, Trash2, List, Users, X } from "lucide-react";

export default function LiveSession() {
  const { id } = useParams(); // session id
  const [session, setSession] = useState(null);
  const [className, setClassName] = useState("");
  const [criteria, setCriteria] = useState([]);
  const [students, setStudents] = useState([]); // [{cs_id, student_id, name}]
  const [grades, setGrades] = useState({}); // { cs_id_criteriaId: score }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [viewMode, setViewMode] = useState("table"); // "table", "cards", or "focus"
  const [focusIndex, setFocusIndex] = useState(0);
  const [showStudentList, setShowStudentList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [attendance, setAttendance] = useState({}); // { cs_id: boolean }

  const inputRefs = useRef({});
  const listRef = useRef(null);

  useEffect(() => {
    fetchData();

    const subscription = supabase
      .channel("live-session-grades")
      .on("postgres_changes", { event: "*", schema: "public", table: "grades" }, () => {
        fetchGrades();
      })
      .subscribe();

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setViewMode("focus");
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check

    return () => {
      supabase.removeChannel(subscription);
      window.removeEventListener("resize", handleResize);
    };
  }, [id]);

  const fetchData = async () => {
    const { data: s } = await supabase.from("sessions").select("*, classes(name, id)").eq("id", id).single();
    if (!s) return;
    setSession(s);
    setClassName(s.classes.name);

    const [{ data: cData }, { data: stData }] = await Promise.all([
      supabase.from("session_criteria").select("*").eq("session_id", id).order("created_at"),
      supabase
        .from("class_students")
        .select("id, student_id, student_name, profiles(full_name)")
        .eq("class_id", s.classes.id),
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
      (gData || []).forEach(g => {
        map[`${g.class_student_id}_${g.criteria_id}`] = g.score;
      });
      setGrades(map);

      // Fetch attendance if exists
      const { data: aData } = await supabase.from("attendance").select("*").eq("session_id", id);
      const aMap = {};
      (aData || []).forEach(a => { aMap[a.class_student_id] = a.is_present; });
      setAttendance(aMap);
    }
    setLoading(false);
  };

  const fetchGrades = async () => {
    if (!criteria.length) return;
    const cIds = criteria.map(c => c.id);
    const { data: gData } = await supabase.from("grades").select("*").in("criteria_id", cIds);
    const map = {};
    (gData || []).forEach(g => {
      map[`${g.class_student_id}_${g.criteria_id}`] = g.score;
    });
    setGrades(map);
  };

  const handleAddCriteria = async () => {
    const name = prompt("Nombre del criterio (Ej: Participación):");
    if (!name) return;
    const maxScore = prompt("Puntaje máximo:", "10");
    const { data } = await supabase
      .from("session_criteria")
      .insert([{ session_id: id, name, max_score: parseFloat(maxScore) || 10 }])
      .select()
      .single();
    if (data) setCriteria([...criteria, data]);
  };

  const handleDeleteCriteria = async (criteriaId) => {
    if (!confirm("¿Eliminar este criterio y todas sus notas asociadas?")) return;
    const { error } = await supabase.from("session_criteria").delete().eq("id", criteriaId);
    if (!error) {
      setCriteria(prev => prev.filter(c => c.id !== criteriaId));
    } else {
      alert("Error al eliminar criterio: " + error.message);
    }
  };

  const handleGradeChange = (csId, criteriaId, value) => {
    const key = `${csId}_${criteriaId}`;
    setGrades(prev => ({ ...prev, [key]: value }));
  };

  const saveGrade = async (csId, criteriaId, value) => {
    const score = parseFloat(value);
    if (value === "" || isNaN(score)) return;

    const key = `${csId}_${criteriaId}`;
    setSaving(prev => ({ ...prev, [key]: true }));

    await supabase.from("grades").upsert({
      class_student_id: csId,
      criteria_id: criteriaId,
      score,
      updated_at: new Date().toISOString(),
    }, { onConflict: "class_student_id,criteria_id" });

    setSaving(prev => ({ ...prev, [key]: false }));
  };

  const setQuickGrade = async (csId, criteriaId, score) => {
    handleGradeChange(csId, criteriaId, score.toString());
    await saveGrade(csId, criteriaId, score.toString());
  };

  const handleKeyDown = (e, studentIndex, criteriaIndex) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextStudentIndex = (studentIndex + 1) % filteredStudents.length;
      const nextStudent = filteredStudents[nextStudentIndex];
      const nextCriteria = criteria[criteriaIndex];
      if (nextStudent && nextCriteria) {
        const nextKey = `${nextStudent.cs_id}_${nextCriteria.id}`;
        inputRefs.current[nextKey]?.focus();
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const nextCriteriaIndex = (criteriaIndex + 1) % criteria.length;
      const nextStudent = filteredStudents[studentIndex];
      const nextCriteria = criteria[nextCriteriaIndex];
      if (nextStudent && nextCriteria) {
        const nextKey = `${nextStudent.cs_id}_${nextCriteria.id}`;
        inputRefs.current[nextKey]?.focus();
      }
    }
  };

  const filteredStudents = students
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === "asc") return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

  const toggleAttendance = async (csId) => {
    const newState = !attendance[csId];
    setAttendance(prev => ({ ...prev, [csId]: newState }));
    
    // Upsert attendance
    await supabase.from("attendance").upsert({
      session_id: id,
      class_student_id: csId,
      is_present: newState
    }, { onConflict: "session_id,class_student_id" });
  };

  const generateAIFeedback = (csId) => {
    const studentGrades = criteria.map(c => {
      const key = `${csId}_${c.id}`;
      const score = parseFloat(grades[key]) || 0;
      return { name: c.name, score, max_score: c.max_score };
    });

    let feedback = "El alumno ha mostrado un desempeño ";
    const totalScore = studentGrades.reduce((sum, g) => sum + g.score, 0);
    const maxPossibleScore = studentGrades.reduce((sum, g) => sum + g.max_score, 0);
    const percentage = (totalScore / maxPossibleScore) * 100;

    if (percentage >= 90) {
      feedback += "excelente. Destaca en todas las áreas evaluadas, demostrando un gran dominio y participación activa. ¡Felicidades!";
    } else if (percentage >= 70) {
      feedback += "bueno. Ha cumplido con la mayoría de los objetivos. Podría mejorar en algunos aspectos específicos para alcanzar su máximo potencial.";
    } else if (percentage >= 50) {
      feedback += "aceptable. Necesita reforzar ciertos conceptos y habilidades. Se recomienda prestar más atención y buscar apoyo adicional.";
    } else {
      feedback += "que requiere atención. Es fundamental revisar los contenidos y practicar más para mejorar significativamente. Estamos aquí para apoyarte.";
    }

    const areasToImprove = studentGrades.filter(g => g.score < g.max_score / 2);
    if (areasToImprove.length > 0) {
      feedback += ` Áreas específicas de mejora: ${areasToImprove.map(a => a.name).join(', ')}.`;
    }

    const strongAreas = studentGrades.filter(g => g.score >= g.max_score * 0.8);
    if (strongAreas.length > 0) {
      feedback += ` Puntos fuertes: ${strongAreas.map(a => a.name).join(', ')}.`;
    }

    return feedback;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const currentStudent = filteredStudents[focusIndex] || null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/class/${session.class_id}`}>
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white border-transparent">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-none">Evaluación en Vivo</h1>
            <p className="text-gray-500 mt-1 capitalize font-bold text-sm">
              {className} · {format(new Date(session.date + "T12:00:00"), "d 'de' MMMM", { locale: es })}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64 group">
            <input
              type="text"
              placeholder="Buscar alumno..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setFocusIndex(0); }}
              className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold shadow-sm focus:border-blue-400 outline-none transition-all"
            />
            <Users className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
          </div>

          {!isMobile && (
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-gray-100 shadow-sm w-fit">
              <button 
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest ${viewMode === "table" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-gray-600"}`}
              >
                <List className="w-4 h-4" /> <span className="hidden sm:inline">Lista</span>
              </button>
              <button 
                onClick={() => setViewMode("cards")}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest ${viewMode === "cards" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-gray-600"}`}
              >
                <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Tarjetas</span>
              </button>
              <button 
                onClick={() => setViewMode("focus")}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest ${viewMode === "focus" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-gray-600"}`}
              >
                <Users className="w-4 h-4" /> <span className="hidden sm:inline">Enfoque</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === "focus" ? (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col sm:relative sm:inset-auto sm:h-[700px] sm:rounded-[40px] sm:overflow-hidden animate-in fade-in duration-300">
           {/* Top Bar - Focus Mode */}
           <div className="flex items-center justify-between p-6 border-b border-slate-900 shadow-sm relative z-10">
              <button 
                onClick={() => setViewMode("table")} 
                className="p-2 text-slate-500 hover:text-white transition-colors"
                title="Salir de Modo Enfoque"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="text-center">
                <h3 className="font-black text-white text-sm uppercase tracking-widest leading-none">Modo Enfoque</h3>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">{className}</p>
              </div>
              <button 
                onClick={() => setShowStudentList(!showStudentList)} 
                className="p-2 text-slate-500 hover:text-white transition-colors"
                title="Cambiar Alumno"
              >
                <LayoutGrid className="w-6 h-6" />
              </button>
           </div>

           {/* Student list drawer (Overlay) */}
           {showStudentList && (
             <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col animate-in slide-in-from-top duration-300">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-white tracking-tight">Lista de Alumnos</h4>
                  <button onClick={() => setShowStudentList(false)} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cerrar</button>
                </div>
                 <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {filteredStudents.map((st, idx) => (
                     <button
                       key={st.cs_id}
                       onClick={() => { setFocusIndex(idx); setShowStudentList(false); }}
                       className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all border ${
                         idx === focusIndex ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                       }`}
                     >
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${idx === focusIndex ? "bg-white/20" : "bg-slate-800"}`}>
                         {idx + 1}
                       </div>
                       <span className="font-bold truncate flex-1 text-left">{st.name}</span>
                       <button 
                         onClick={(e) => { e.stopPropagation(); toggleAttendance(st.cs_id); }}
                         className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                           attendance[st.cs_id] !== false ? "bg-green-100 text-green-700 shadow-sm" : "bg-red-100 text-red-700"
                         }`}
                       >
                         {attendance[st.cs_id] !== false ? "Presente" : "Ausente"}
                       </button>
                     </button>
                   ))}
                </div>
             </div>
           )}

           {/* Main Content Area */}
           <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col py-8 px-6 space-y-8 pb-32">
              <div className="text-center animate-in zoom-in duration-500 relative">
                <div className="absolute top-0 right-0">
                  <button 
                    onClick={() => toggleAttendance(currentStudent.cs_id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                      attendance[currentStudent.cs_id] !== false ? "bg-green-600 text-white shadow-lg shadow-green-600/20" : "bg-red-600 text-white shadow-lg shadow-red-600/20"
                    }`}
                  >
                    {attendance[currentStudent.cs_id] !== false ? "Presente" : "Ausente"}
                  </button>
                </div>
                <div className="w-20 h-20 rounded-[32px] bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-blue-600/30 mx-auto mb-4 border-2 border-slate-800">
                  {currentStudent?.name[0].toUpperCase()}
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{currentStudent?.name}</h2>
                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/50 w-fit mx-auto px-3 py-1 rounded-full border border-slate-800">
                   Alumno {focusIndex + 1} de {filteredStudents.length}
                </div>
              </div>

              <div className="space-y-4 max-w-md mx-auto w-full">
                {criteria.map((c, idx) => {
                  const key = `${currentStudent?.cs_id}_${c.id}`;
                  const val = grades[key] ?? "";
                  const isSaving = saving[key];
                  return (
                    <div key={c.id} className="bg-slate-900 p-5 rounded-[28px] border border-slate-800 relative group overflow-hidden transition-all hover:border-slate-700">
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Criterio {idx + 1} de {criteria.length}</span>
                          <button 
                            onClick={() => alert(`Sugerencia IA: ${generateAIFeedback(currentStudent.cs_id)}`)}
                            className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          >
                            <Sparkles className="w-3 h-3" /> IA Feedback
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <h4 className="text-xl font-black text-white tracking-tight leading-none truncate">{c.name}</h4>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Máximo {c.max_score}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            max={c.max_score}
                            step="0.5"
                            value={val}
                            onChange={e => handleGradeChange(currentStudent.cs_id, c.id, e.target.value)}
                            onBlur={e => saveGrade(currentStudent.cs_id, c.id, e.target.value)}
                            className="w-full bg-slate-950 border-2 border-slate-800 focus:border-blue-600 rounded-2xl py-3 px-4 font-black text-3xl text-blue-400 outline-none transition-all text-center shadow-inner"
                            placeholder="0"
                          />
                        </div>
                        <div className="w-6 h-6 flex items-center justify-center">
                          {isSaving ? (
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : val !== "" && (
                            <div className="w-6 h-6 text-green-500 animate-in fade-in zoom-in">
                              <CheckCircle2 className="w-6 h-6 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0.5, 0].filter(n => n <= c.max_score).map(num => (
                          <button
                            key={num}
                            onClick={() => setQuickGrade(currentStudent.cs_id, c.id, num)}
                            className={`h-11 px-3 min-w-[3.8rem] rounded-xl font-black text-xs transition-all border-2 ${
                              val === num.toString() ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20 scale-105" : "bg-slate-950 text-slate-600 border-slate-800 active:bg-slate-800 active:scale-95"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>

           <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/80 backdrop-blur-xl border-t border-slate-900 sm:relative sm:inset-auto z-40">
             <div className="max-w-md mx-auto flex items-center gap-3">
                <Button 
                  onClick={() => setFocusIndex(prev => (prev - 1 + filteredStudents.length) % filteredStudents.length)}
                  variant="ghost" 
                  className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white p-0 flex-shrink-0"
                  disabled={filteredStudents.length <= 1}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                
                <Button 
                  onClick={() => setFocusIndex(prev => (prev + 1) % filteredStudents.length)}
                  className="flex-1 h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black text-lg gap-3 shadow-2xl shadow-blue-600/30 border-t border-white/10 active:scale-[0.98] transition-all"
                  disabled={filteredStudents.length <= 1}
                >
                  Siguiente Alumno <ChevronRight className="w-6 h-6" />
                </Button>
             </div>
           </div>
        </div>
      ) : (
        <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-900/5 overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between py-6 px-8 gap-4">
            <div className="min-w-0">
              <CardTitle className="text-lg font-black tracking-tight">Planilla de Notas</CardTitle>
              <p className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-widest">Atajo: [Enter] para siguiente alumno</p>
            </div>
            <Button onClick={handleAddCriteria} variant="secondary" className="gap-2 rounded-2xl h-11 px-6 font-black text-sm w-full sm:w-auto">
              <PlusCircle className="w-5 h-5" /> Agregar Criterio
            </Button>
          </CardHeader>
          
          <CardContent className="p-0">
            {criteria.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center px-6">
                <div className="bg-blue-50 w-20 h-20 rounded-[40px] flex items-center justify-center mb-6">
                  <PlusCircle className="w-10 h-10 text-blue-600 opacity-20" />
                </div>
                <p className="font-black text-xl text-gray-800">No hay criterios de evaluación</p>
                <p className="text-gray-500 max-w-xs mt-2 font-medium">Definí los aspectos a evaluar hoy (ej: Conducta, Examen, etc.)</p>
                <Button onClick={handleAddCriteria} className="mt-8 gap-2 rounded-2xl h-12 px-8 font-black shadow-lg shadow-blue-600/20">
                  <PlusCircle className="w-5 h-5" /> Crear primer criterio
                </Button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-24 text-center">
                 <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                 <p className="font-black text-lg text-gray-400">No se encontraron alumnos con "{searchTerm}"</p>
              </div>
            ) : viewMode === "table" ? (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm border-collapse">
                  <thead>
                      <tr className="bg-slate-50/30 border-b border-gray-100">
                        <th 
                          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                          className="text-left px-4 sm:px-8 py-5 font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-gray-400 sticky left-0 bg-white z-20 min-w-[150px] sm:min-w-[200px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] cursor-pointer hover:text-blue-600 transition-colors group/h"
                        >
                          <div className="flex items-center gap-2">
                             Alumno
                             <ChevronRight className={`w-3 h-3 transition-transform ${sortOrder === "desc" ? "rotate-90" : "-rotate-90"}`} />
                          </div>
                        </th>
                        {criteria.map(c => (
                          <th key={c.id} className="px-3 sm:px-4 py-5 font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-gray-400 text-center min-w-[100px] sm:min-w-[140px] group relative border-l border-gray-50/50">
                            <div className="truncate text-gray-900 max-w-[80px] sm:max-w-none mx-auto">{c.name}</div>
                            <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold mt-1 tracking-widest whitespace-nowrap">MÁX {c.max_score}</div>
                            <button
                              onClick={() => handleDeleteCriteria(c.id)}
                              className="absolute -top-1 -right-1 p-2 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm z-30"
                              title="Eliminar criterio"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredStudents.map((student, sIdx) => (
                        <tr key={student.cs_id} className="hover:bg-blue-50/20 transition-all group">
                          <td className="px-4 sm:px-8 py-4 sm:py-5 font-black text-gray-800 sticky left-0 bg-white group-hover:bg-blue-50/50 transition-colors z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <button 
                                onClick={() => toggleAttendance(student.cs_id)}
                                className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex-shrink-0 ${
                                  attendance[student.cs_id] !== false ? "bg-green-500 border-green-200" : "bg-red-500 border-red-200"
                                }`}
                                title={attendance[student.cs_id] !== false ? "Presente" : "Ausente"}
                              />
                              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-black shadow-md sm:shadow-lg shadow-blue-400/20 text-center flex-shrink-0">
                                {student.name[0].toUpperCase()}
                              </div>
                              <span className="truncate text-xs sm:text-sm">{student.name}</span>
                            </div>
                          </td>
                          {criteria.map((c, cIdx) => {
                            const key = `${student.cs_id}_${c.id}`;
                            const val = grades[key] ?? "";
                            const isSaving = saving[key];
                            return (
                              <td key={c.id} className="px-2 sm:px-4 py-4 sm:py-5 text-center border-l border-gray-50/50">
                                <div className="relative inline-block group/input">
                                  <input
                                    ref={el => inputRefs.current[key] = el}
                                    type="number"
                                    min="0"
                                    max={c.max_score}
                                    step="0.5"
                                    value={val}
                                    onChange={e => handleGradeChange(student.cs_id, c.id, e.target.value)}
                                    onBlur={e => saveGrade(student.cs_id, c.id, e.target.value)}
                                    onKeyDown={e => handleKeyDown(e, sIdx, cIdx)}
                                    placeholder="—"
                                    className={`w-14 sm:w-20 text-center border-2 rounded-xl sm:rounded-2xl px-1 sm:px-2 py-2 sm:py-3 font-black text-lg sm:text-xl outline-none transition-all scale-95 focus:scale-100 group-hover/input:scale-100 ${
                                      val !== "" ? "bg-white border-blue-100 text-blue-600" : "bg-gray-50 border-transparent text-gray-300 focus:bg-white focus:border-blue-400"
                                    }`}
                                  />
                                  {isSaving && (
                                    <div className="absolute top-0 right-0 p-0.5 sm:p-1">
                                      <div className="w-1.5 h-1.5 sm:w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/30">
                {filteredStudents.map(student => (
                  <div key={student.cs_id} className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-900/5 border border-gray-100 flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-[32px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20 text-center">
                        {student.name[0].toUpperCase()}
                      </div>
                      <button 
                        onClick={() => toggleAttendance(student.cs_id)}
                        className={`absolute -top-1 -right-1 w-7 h-7 rounded-full border-4 border-white shadow-md flex items-center justify-center transition-all ${
                          attendance[student.cs_id] !== false ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {attendance[student.cs_id] !== false ? <CheckCircle2 className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
                      </button>
                    </div>
                    <h3 className="font-black text-lg text-gray-900 truncate tracking-tight">{student.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1 mb-8">Evaluación Diaria</p>
                    
                    <div className="w-full space-y-4">
                      {criteria.map(c => {
                        const key = `${student.cs_id}_${c.id}`;
                        const val = grades[key] ?? "";
                        const isSaving = saving[key];
                        return (
                          <div key={c.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all group/card-input">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{c.name}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={c.max_score}
                                step="0.5"
                                value={val}
                                onChange={e => handleGradeChange(student.cs_id, c.id, e.target.value)}
                                onBlur={e => saveGrade(student.cs_id, c.id, e.target.value)}
                                className={`w-14 text-center border-2 rounded-xl py-1.5 font-black text-sm outline-none transition-all ${
                                  val !== "" ? "bg-white border-blue-500 text-blue-600 shadow-sm" : "bg-white/50 border-gray-100 text-gray-300"
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {viewMode !== "focus" && (
        <div className="hidden md:flex justify-center mt-8">
          <div className="bg-slate-900/5 px-6 py-3 rounded-full border border-slate-900/5 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <kbd className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-black shadow-sm uppercase tracking-widest text-gray-500">Enter</kbd>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Próximo Alumno</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2">
              <kbd className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-black shadow-sm uppercase tracking-widest text-gray-500">Tab</kbd>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Próximo Criterio</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
