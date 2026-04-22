import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Plus, BookOpen, GraduationCap, ArrowRight, X } from "lucide-react";
import { generateShortCode } from "../../lib/utils";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("*, class_students(count)")
      .eq("teacher_id", user.id);
    setClasses(data || []);
    setLoading(false);
  };

  const createClass = async () => {
    if (!newClassName.trim()) return;
    const { error } = await supabase
      .from("classes")
      .insert([{
        name: newClassName,
        teacher_id: user.id,
        short_code: generateShortCode()
      }]);


    if (error) alert(error.message);
    else {
      setNewClassName("");
      setShowModal(false);
      fetchClasses();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight leading-none">Mis Clases</h1>
          <p className="text-[var(--text-secondary)] mt-2 font-medium">Gestioná tus materias y el progreso de tus alumnos.</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="gap-2 rounded-2xl h-12 px-6 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all font-bold w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" /> Nueva Clase
        </Button>
      </div>

      {classes.length === 0 ? (
        <div className="card-empty">
          <div className="card-empty-icon">
            <BookOpen className="w-12 h-12 text-[var(--text-muted)] opacity-50" />
          </div>
          <h3 className="card-empty-title">Empezá creando tu primera clase</h3>
          <p className="card-empty-description">Una vez creada, vas a poder agregar alumnos y empezar a registrar notas.</p>
          <Button onClick={() => setShowModal(true)} variant="outline" className="mt-8 rounded-2xl font-bold border-2">
            Crear ahora
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {classes.map((cls) => (
            <Link key={cls.id} to={`/class/${cls.id}`} className="group h-full">
              <Card className="card card-hover h-full rounded-3xl">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 opacity-80 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex-1 p-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <GraduationCap className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl font-black text-[var(--text-primary)] group-hover:text-blue-600 transition-colors uppercase tracking-tight">{cls.name}</CardTitle>
                  <CardDescription className="font-medium pt-1">
                    Gestión académica y seguimiento en vivo
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 mt-auto border-t border-[var(--border)]/50 bg-[var(--bg-secondary)]/30">
                  <div className="flex items-center justify-between text-sm font-bold mt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Alumnos</span>
                      <span className="text-[var(--text-primary)]">{cls.class_students?.[0]?.count || 0} Registrados</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Modern Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowModal(false)}
              className="modal-close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-8">
              <div className="bg-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Nueva Clase</h3>
              <p className="text-[var(--text-secondary)] font-medium mt-1">Ingresá el nombre de la materia o división.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="label">Nombre de la Clase</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Ej: Matemáticas 5to B"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createClass()}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={createClass}
                  disabled={!newClassName.trim()}
                  className="w-full h-14 rounded-2xl shadow-xl shadow-blue-600/20 font-black text-lg transition-all"
                >
                  Crear Clase
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="w-full h-12 rounded-2xl font-bold text-[var(--text-secondary)]"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}