import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { 
  Plus, BookOpen, GraduationCap, ArrowRight, X, Search, 
  Users, Calendar, Copy, Check, Sparkles, ShieldCheck
} from "lucide-react";
import { generateShortCode } from "../../lib/utils";
import { useToast } from "../../providers/ToastProvider";

const BASE_URL = window.location.origin;

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'with_students' | 'active'
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    const teacherId = user?.id || "31269a89-33af-49b7-b7b8-45141b85a11c";
    const { data } = await supabase
      .from("classes")
      .select("*, class_students(count), sessions(count)")
      .eq("teacher_id", teacherId);
    setClasses(data || []);
    setLoading(false);
  };

  const createClass = async () => {
    if (!newClassName.trim()) return;
    const { error } = await supabase
      .from("classes")
      .insert([{
        name: newClassName.trim(),
        teacher_id: user.id,
        short_code: generateShortCode()
      }]);

    if (error) toast(error.message, "error");
    else {
      setNewClassName("");
      setShowModal(false);
      fetchClasses();
      toast("¡Clase creada exitosamente!", "success");
    }
  };

  const handleCopyLink = (e, cls) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cls?.short_code) return;
    navigator.clipboard.writeText(`${BASE_URL}/j/${cls.short_code}`);
    setCopiedId(cls.id);
    toast(`Enlace para ${cls.name} copiado al portapapeles`, "success");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Metrics summary
  const totalStudents = useMemo(() => {
    return classes.reduce((acc, c) => acc + (c.class_students?.[0]?.count || 0), 0);
  }, [classes]);

  const totalSessions = useMemo(() => {
    return classes.reduce((acc, c) => acc + (c.sessions?.[0]?.count || 0), 0);
  }, [classes]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    let result = [...classes];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.short_code && c.short_code.toLowerCase().includes(q))
      );
    }
    if (filterType === "with_students") {
      result = result.filter(c => (c.class_students?.[0]?.count || 0) > 0);
    } else if (filterType === "active") {
      result = result.filter(c => (c.sessions?.[0]?.count || 0) > 0);
      result.sort((a, b) => (b.sessions?.[0]?.count || 0) - (a.sessions?.[0]?.count || 0));
    }
    return result;
  }, [classes, searchQuery, filterType]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* Compact Apple-style Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-['Outfit'] font-black text-slate-900 tracking-[-0.025em] leading-tight">
            Mis Clases
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Gestión de materias, asistencia y progreso pedagógico en tiempo real
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="gap-2 rounded-xl h-10 sm:h-11 px-4 sm:px-5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-bold text-xs uppercase tracking-wider w-full sm:w-auto transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Nueva Clase
        </Button>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Cursos Activos</p>
            <p className="text-lg sm:text-xl font-['Outfit'] font-black text-slate-900 leading-tight">{classes.length}</p>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Alumnos</p>
            <p className="text-lg sm:text-xl font-['Outfit'] font-black text-slate-900 leading-tight">{totalStudents}</p>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Sesiones Dictadas</p>
            <p className="text-lg sm:text-xl font-['Outfit'] font-black text-slate-900 leading-tight">{totalSessions}</p>
          </div>
        </div>
      </div>

      {/* Unified Control Bar (Search & Filter Pills) */}
      <div className="bg-white/95 backdrop-blur-md p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar materia o código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-8 pr-7 py-1 sm:py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-center sm:justify-end gap-1 overflow-x-auto no-scrollbar pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5 shrink-0 hidden sm:inline">
            Mostrar:
          </span>
          {[
            { id: "all", label: `Todas (${classes.length})` },
            { id: "with_students", label: "Con alumnos" },
            { id: "active", label: "Más activas" }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-xs transition-all cursor-pointer shrink-0 ${
                filterType === pill.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <span>{pill.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
            <BookOpen className="w-7 h-7 opacity-80" />
          </div>
          <h3 className="text-xl font-['Outfit'] font-black text-slate-900 tracking-tight">
            Empezá creando tu primera clase
          </h3>
          <p className="text-xs font-medium text-slate-600 leading-relaxed">
            Una vez creada la clase, podrás añadir alumnos, tomar asistencia en vivo y calificar por criterios pedagógicos.
          </p>
          <Button
            onClick={() => setShowModal(true)}
            className="rounded-xl h-10 px-5 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            Crear clase ahora
          </Button>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-8 text-center max-w-md mx-auto shadow-2xs space-y-2">
          <p className="text-sm font-bold text-slate-800">No se encontraron clases</p>
          <p className="text-xs text-slate-500">Ningún curso coincide con el filtro o búsqueda seleccionada.</p>
          <Button
            variant="ghost"
            onClick={() => { setSearchQuery(""); setFilterType("all"); }}
            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 mt-2"
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredClasses.map((cls) => {
            const studentCount = cls.class_students?.[0]?.count || 0;
            const sessionCount = cls.sessions?.[0]?.count || 0;
            const isCopied = copiedId === cls.id;

            return (
              <div
                key={cls.id}
                className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 sm:p-5 h-full flex flex-col justify-between shadow-2xs hover:shadow-lg hover:shadow-slate-900/[0.04] hover:border-indigo-400/50 transition-all duration-200 group"
              >
                <div>
                  {/* Card Top: Icon & Join Code */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform duration-200 shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>

                    {cls.short_code && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(e, cls)}
                        title="Copiar enlace de acceso de alumnos"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          isCopied
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 hover:border-indigo-200"
                        }`}
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{isCopied ? "¡Copiado!" : cls.short_code}</span>
                      </button>
                    )}
                  </div>

                  {/* Course Title */}
                  <h3 className="text-base sm:text-lg font-['Outfit'] font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight leading-snug line-clamp-1 mb-2">
                    {cls.name}
                  </h3>

                  {/* Badges / Stats */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100/90 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {studentCount} {studentCount === 1 ? "alumno" : "alumnos"}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100/90 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {sessionCount} {sessionCount === 1 ? "clase" : "clases"}
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between gap-2">
                  <Link
                    to={`/class/${cls.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-indigo-600 text-white h-9 px-3 rounded-xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Ingresar al aula</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {cls.short_code && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(e, cls)}
                      title="Copiar enlace para que los alumnos ingresen"
                      className="h-9 px-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apple-style Sheet Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowModal(false)}>
          <div className="bg-white border border-slate-200/80 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-['Outfit'] font-black text-slate-900 tracking-tight">Nueva Clase</h3>
                  <p className="text-xs font-medium text-slate-500">Ingresá el nombre de la materia o división.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Nombre de la Clase
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Ej: Matemáticas 5to B"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createClass()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-10 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={createClass}
                  disabled={!newClassName.trim()}
                  className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Crear Clase
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}