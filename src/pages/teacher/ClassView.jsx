import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarPlus, Users, Copy, Check, Plus, Link as LinkIcon, Pencil, Trash2, X, ArrowLeft } from "lucide-react";

const BASE_URL = window.location.origin;

export default function ClassView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cls }, { data: sData }, { data: stData }] = await Promise.all([
      supabase.from("classes").select("*").eq("id", id).single(),
      supabase.from("sessions").select("*").eq("class_id", id).order("date", { ascending: false }),
      supabase
        .from("class_students")
        .select("id, student_id, student_name, public_token, profiles(full_name)")
        .eq("class_id", id),
    ]);
    setClassData(cls);
    setSessions(sData || []);
    const sortedStudents = (stData || []).sort((a, b) => 
      getStudentName(a).localeCompare(getStudentName(b))
    );
    setStudents(sortedStudents);
    setLoading(false);
  };

  const createSession = async () => {
    const today = new Date().toISOString().split("T")[0];
    const existing = sessions.find(s => s.date === today);
    if (existing) { navigate(`/session/${existing.id}`); return; }
    const { data, error } = await supabase.from("sessions").insert([{ class_id: id, date: today }]).select().single();
    if (data) navigate(`/session/${data.id}`);
    else alert("Error: " + error?.message);
  };

  const addStudent = async () => {
    if (!newStudentName.trim()) return;
    setAddingStudent(true);
    const { data, error } = await supabase
      .from("class_students")
      .insert([{ class_id: id, student_name: newStudentName.trim() }])
      .select("id, student_id, student_name, public_token, profiles(full_name)")
      .single();
    if (error) {
      alert("Error al agregar alumno: " + error.message);
    } else {
      setStudents(prev => [...prev, data].sort((a, b) => 
        getStudentName(a).localeCompare(getStudentName(b))
      ));
      setNewStudentName("");
    }
    setAddingStudent(false);
  };

  const copyClassLink = () => {
    if (!classData?.short_code) return;
    navigator.clipboard.writeText(`${BASE_URL}/j/${classData.short_code}`);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteStudent = async (csId) => {
    if (!confirm("¿Eliminar este alumno de la clase? Esto también borrará sus notas.")) return;
    const { error } = await supabase.from("class_students").delete().eq("id", csId);
    if (!error) setStudents(prev => prev.filter(s => s.id !== csId));
    else alert("Error al eliminar: " + error.message);
  };

  const startEdit = (st) => {
    setEditingId(st.id);
    setEditingName(st.profiles?.full_name || st.student_name || "");
  };

  const saveEdit = async (csId) => {
    if (!editingName.trim()) return;
    const { error } = await supabase
      .from("class_students")
      .update({ student_name: editingName.trim() })
      .eq("id", csId);
    if (!error) {
      setStudents(prev => prev.map(s => s.id === csId ? { ...s, student_name: editingName.trim() } : s));
      setEditingId(null);
    } else {
      alert("Error al editar: " + error.message);
    }
  };

  const getStudentName = (st) => st.profiles?.full_name || st.student_name || "Sin nombre";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  const classLink = `${BASE_URL}/j/${classData?.short_code || '...'}`;


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white border-transparent">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-none">{classData?.name}</h1>
            <p className="text-gray-500 mt-1 font-medium text-sm">Panel de control de la materia</p>
          </div>
        </div>
      </div>

      {/* Class Link Banner - Responsive */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white overflow-hidden relative shadow-xl shadow-blue-600/20 border border-blue-400/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 min-w-0">
            <div className="bg-white/20 p-3 rounded-2xl flex-shrink-0 backdrop-blur-md border border-white/20">
              <LinkIcon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-lg leading-none">Link Público</p>
              <p className="text-blue-100/80 text-xs truncate max-w-[200px] sm:max-w-xs mt-2 font-medium bg-blue-900/40 px-2 py-1 rounded-lg border border-white/5">{classLink}</p>
            </div>
          </div>
          <button
            onClick={copyClassLink}
            className="w-full md:w-auto flex items-center justify-center gap-3 bg-white text-blue-600 hover:bg-blue-50 transition-all px-6 py-4 md:py-3 rounded-2xl text-sm font-black shadow-lg"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "¡Copiado!" : "Copiar link para alumnos"}
          </button>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sessions Section */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-800 tracking-tight">Sesiones recientes</h3>
            <Button onClick={createSession} className="gap-2 rounded-2xl h-11 px-5 shadow-lg shadow-blue-600/10 font-bold hidden sm:flex">
              <CalendarPlus className="w-4 h-4" /> Nueva sesión
            </Button>
          </div>
          
          <Button onClick={createSession} className="w-full gap-2 rounded-2xl h-12 font-bold shadow-lg shadow-blue-600/10 sm:hidden">
            <CalendarPlus className="w-5 h-5" /> Iniciar sesión de hoy
          </Button>

          {sessions.length === 0 ? (
            <div
              className="border-2 border-dashed border-gray-200 rounded-[32px] py-16 px-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-all bg-white/50"
              onClick={createSession}
            >
              <CalendarPlus className="w-12 h-12 text-gray-300 mx-auto mb-4 opacity-50" />
              <p className="text-gray-900 font-black text-lg">Sin sesiones registradas</p>
              <p className="text-gray-500 font-medium max-w-xs mx-auto mt-2">Hacé clic para crear la primera sesión de evaluación de la clase.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sessions.map(s => (
                <div key={s.id} className="bg-white rounded-3xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/5 transition-all p-6 flex flex-col">
                  <div>
                    <p className="font-black text-gray-900 text-lg capitalize leading-tight">
                      {format(new Date(s.date + "T12:00:00"), "EEEE d", { locale: es })}
                    </p>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">
                      {format(new Date(s.date + "T12:00:00"), "MMMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="mt-8 flex items-center justify-between gap-4">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider">Activa</span>
                    <Link to={`/session/${s.id}`} className="flex-1">
                      <Button variant="secondary" className="w-full rounded-2xl font-black text-sm h-11 hover:bg-blue-600 hover:text-white transition-all">Ingresar notas</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students Section */}
        <div className="space-y-5">
          <Card className="rounded-[32px] border-none shadow-xl shadow-slate-900/5 bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-6 border-b border-gray-50">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl">
                  <Users className="w-4 h-4 text-white" />
                </div>
                Alumnos <span className="text-gray-400 ml-auto text-sm">{students.length}</span>
              </CardTitle>
              <div className="relative mt-4">
                <input
                  type="text"
                  placeholder="Buscar alumno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-100 rounded-2xl py-2 pl-9 pr-4 text-xs font-bold shadow-sm focus:border-blue-400 outline-none transition-all"
                />
                <Users className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {students.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm font-bold text-gray-400">Sin alumnos registrados.</p>
                </div>
              ) : (
                <ul className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {students
                    .filter(st => getStudentName(st).toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(st => (
                    <li key={st.id} className="group flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-blue-50/30 rounded-2xl px-2 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm shadow-blue-400/20">
                        {getStudentName(st)[0].toUpperCase()}
                      </div>

                      {editingId === st.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            autoFocus
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && saveEdit(st.id)}
                            className="flex-1 text-sm border-2 border-blue-400 rounded-xl px-3 py-2 outline-none shadow-lg shadow-blue-500/10 font-bold"
                          />
                          <button onClick={() => saveEdit(st.id)} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 text-gray-400 rounded-xl"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-gray-800 truncate flex-1 leading-none">{getStudentName(st)}</span>
                          <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(st)}
                              className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-white transition-all"
                              title="Editar nombre"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteStudent(st.id)}
                              className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-white transition-all"
                              title="Eliminar alumno"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Add forms */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Nuevo Integrante</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addStudent()}
                    className="flex-1 text-sm border-2 border-transparent bg-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400 transition-all font-bold shadow-sm"
                  />
                  <Button size="icon" onClick={addStudent} disabled={addingStudent} className="rounded-xl h-11 w-11 flex-shrink-0 shadow-lg shadow-blue-600/20">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
