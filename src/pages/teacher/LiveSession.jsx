import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, PlusCircle, Save, Trash2, LayoutGrid, List, ChevronRight, ChevronLeft, Users } from "lucide-react";

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

  const inputRefs = useRef({});

  useEffect(() => {
    fetchData();

    const subscription = supabase
      .channel("live-session-grades")
      .on("postgres_changes", { event: "*", schema: "public", table: "grades" }, () => {
        fetchGrades();
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
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
      // Move to next student, same criteria
      const nextStudentIndex = (studentIndex + 1) % students.length;
      const nextKey = `${students[nextStudentIndex].cs_id}_${criteria[criteriaIndex].id}`;
      inputRefs.current[nextKey]?.focus();
      inputRefs.current[nextKey]?.select();
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const currentStudent = students[focusIndex];

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

        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-gray-100 shadow-sm w-fit self-center">
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
      </div>

      <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-900/5 overflow-hidden bg-white">
        {viewMode !== "focus" && (
          <CardHeader className="bg-slate-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between py-6 px-8 gap-4">
            <div className="min-w-0">
              <CardTitle className="text-lg font-black tracking-tight">Planilla de Notas</CardTitle>
              <p className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-widest">Atajo: [Enter] para siguiente alumno</p>
            </div>
            <Button onClick={handleAddCriteria} variant="secondary" className="gap-2 rounded-2xl h-11 px-6 font-black text-sm w-full sm:w-auto">
              <PlusCircle className="w-5 h-5" /> Agregar Criterio
            </Button>
          </CardHeader>
        )}
        
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
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 border-b border-gray-100">
                    <th className="text-left px-8 py-5 font-black text-[11px] uppercase tracking-[0.2em] text-gray-400 sticky left-0 bg-white z-10 min-w-[200px]">Alumno</th>
                    {criteria.map(c => (
                      <th key={c.id} className="px-4 py-5 font-black text-[11px] uppercase tracking-[0.2em] text-gray-400 text-center min-w-[140px] group relative border-l border-gray-50/50">
                        <div className="truncate text-gray-900">{c.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold mt-1 tracking-widest">MÁX {c.max_score}</div>
                        <button
                          onClick={() => handleDeleteCriteria(c.id)}
                          className="absolute -top-1 -right-1 p-2 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                          title="Eliminar criterio"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student, sIdx) => (
                    <tr key={student.cs_id} className="hover:bg-blue-50/20 transition-all group">
                      <td className="px-8 py-5 font-black text-gray-800 sticky left-0 bg-white group-hover:bg-blue-50/50 transition-colors z-10 shadow-[2px_0_10px_-5px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-400/20 text-center">
                            {student.name[0].toUpperCase()}
                          </div>
                          <span className="truncate">{student.name}</span>
                        </div>
                      </td>
                      {criteria.map((c, cIdx) => {
                        const key = `${student.cs_id}_${c.id}`;
                        const val = grades[key] ?? "";
                        const isSaving = saving[key];
                        return (
                          <td key={c.id} className="px-4 py-5 text-center border-l border-gray-50/50">
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
                                className={`w-20 text-center border-2 rounded-2xl px-2 py-3 font-black text-xl outline-none transition-all scale-95 group-hover/input:scale-100 ${
                                  val ? "bg-white border-blue-100 text-blue-600" : "bg-gray-50 border-transparent text-gray-300 focus:bg-white focus:border-blue-400"
                                }`}
                              />
                              {isSaving && (
                                <div className="absolute top-0 right-0 p-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
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
          ) : viewMode === "cards" ? (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/30">
              {students.map(student => (
                <div key={student.cs_id} className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-900/5 border border-gray-100 flex flex-col">
                  <div className="flex items-center gap-4 mb-6 border-b border-gray-50 pb-4">
                    <div className="w-12 h-12 rounded-[20px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-blue-500/20 text-center">
                      {student.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-lg text-gray-900 truncate tracking-tight">{student.name}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Evaluación Diaria</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6 flex-1">
                    {criteria.map(c => {
                      const key = `${student.cs_id}_${c.id}`;
                      const val = grades[key] ?? "";
                      const isSaving = saving[key];
                      return (
                        <div key={c.id} className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest truncate">{c.name}</p>
                            <span className="text-[10px] font-bold text-gray-300">MÁX {c.max_score}</span>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max={c.max_score}
                                step="0.5"
                                value={val}
                                onChange={e => handleGradeChange(student.cs_id, c.id, e.target.value)}
                                onBlur={e => saveGrade(student.cs_id, c.id, e.target.value)}
                                placeholder="0.0"
                                className="w-full text-center border-2 border-transparent focus:border-blue-400 bg-slate-50 rounded-2xl py-4 font-black text-2xl outline-none transition-all"
                              />
                              {isSaving && (
                                <div className="absolute top-1/2 -translate-y-1/2 right-4">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                                </div>
                              )}
                            </div>
                            
                            {/* Quick score buttons */}
                            <div className="flex flex-wrap gap-1.5 justify-center">
                              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].filter(n => n <= c.max_score).map(num => (
                                <button
                                  key={num}
                                  onClick={() => setQuickGrade(student.cs_id, c.id, num)}
                                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all border ${
                                    val === num.toString() ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30" : "bg-white text-gray-400 border-gray-100 hover:border-blue-200 hover:text-blue-500"
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* FOCUS MODE: One student at a time with large buttons */
            <div className="flex flex-col h-[600px] bg-slate-50/50">
              <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-10">
                <div className="text-center animate-in zoom-in duration-500">
                  <div className="w-24 h-24 rounded-[40px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-blue-600/30 mx-auto mb-6 border-4 border-white">
                    {currentStudent.name[0].toUpperCase()}
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{currentStudent.name}</h2>
                  <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs mt-2">Criterios de hoy ({criteria.length})</p>
                </div>

                <div className="w-full max-w-xl space-y-8 h-full overflow-y-auto px-4 custom-scrollbar pb-10">
                  {criteria.map(c => {
                    const key = `${currentStudent.cs_id}_${c.id}`;
                    const val = grades[key] ?? "";
                    const isSaving = saving[key];
                    return (
                      <div key={c.id} className="bg-white p-6 rounded-[32px] shadow-xl shadow-slate-950/5 border border-white relative group">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">{c.name}</h4>
                          <span className="text-[10px] font-black text-slate-300">MAX {c.max_score}</span>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max={c.max_score}
                              step="0.5"
                              value={val}
                              onChange={e => handleGradeChange(currentStudent.cs_id, c.id, e.target.value)}
                              onBlur={e => saveGrade(currentStudent.cs_id, c.id, e.target.value)}
                              className="w-full text-center bg-slate-50 border-4 border-transparent focus:border-blue-500 rounded-[24px] py-6 font-black text-4xl outline-none transition-all shadow-inner"
                              placeholder="0"
                            />
                            {isSaving && (
                              <div className="absolute top-4 right-4 animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                            )}
                          </div>
                          
                          <div className="grid grid-cols-5 gap-2">
                             {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0.5, 0].filter(n => n <= c.max_score).map(num => (
                                <button
                                  key={num}
                                  onClick={() => setQuickGrade(currentStudent.cs_id, c.id, num)}
                                  className={`h-12 rounded-2xl font-black text-sm transition-all border-2 ${
                                    val === num.toString() ? "bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/40 scale-105" : "bg-white text-slate-400 border-slate-50 hover:border-blue-200 hover:text-blue-500"
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Bar for Focus Mode */}
              <div className="bg-white border-t border-gray-100 p-6 flex items-center justify-between">
                <Button 
                  onClick={() => setFocusIndex(prev => (prev - 1 + students.length) % students.length)}
                  variant="ghost" 
                  className="gap-2 rounded-2xl h-14 px-6 font-black text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                >
                  <ChevronLeft className="w-6 h-6" /> <span className="hidden sm:inline">Anterior</span>
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-gray-900">{focusIndex + 1}</span>
                  <span className="text-gray-300 font-black">/</span>
                  <span className="text-gray-400 font-bold">{students.length}</span>
                </div>

                <Button 
                  onClick={() => setFocusIndex(prev => (prev + 1) % students.length)}
                  className="gap-2 rounded-2xl h-14 px-8 font-black shadow-xl shadow-blue-600/20"
                >
                  <span className="hidden sm:inline">Siguiente</span> <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="hidden md:flex justify-center">
        <div className="bg-slate-900/5 px-6 py-3 rounded-full border border-slate-900/5 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <kbd className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-black shadow-sm">Enter</kbd>
            <span className="text-xs font-bold text-gray-400">Próximo Alumno</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <kbd className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-black shadow-sm">Tab</kbd>
            <span className="text-xs font-bold text-gray-400">Próximo Criterio</span>
          </div>
        </div>
      </div>
    </div>
  );
}
