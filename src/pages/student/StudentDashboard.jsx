import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { BookOpen, TrendingUp, Award, Flame } from "lucide-react";
import { calculateGamification, RANKS, BADGE_DEFS } from "../../lib/gamificationEngine";

export default function StudentDashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gamificationData, setGamificationData] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("class_students")
      .select(`
        classes (
          id,
          name,
          profiles!classes_teacher_id_fkey (full_name)
        )
      `)
      .eq("student_id", user.id);

    if (data) {
      setClasses(data.map(item => item.classes));
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in slide-up">
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight leading-none">Mis Materias</h1>
        <p className="text-[var(--text-secondary)] mt-2 font-medium">Consulta tu progreso y rendimiento en cada clase.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="stat-label">Nivel</span>
          </div>
          <span className="stat-value text-blue-600">--</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-yellow-500" />
            <span className="stat-label">Rango</span>
          </div>
          <span className="stat-value text-yellow-600">--</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="stat-label">Racha</span>
          </div>
          <span className="stat-value text-orange-600">0</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="stat-label">Clases</span>
          </div>
          <span className="stat-value text-purple-600">{classes.length}</span>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="card-empty">
          <div className="card-empty-icon">
            <BookOpen className="w-12 h-12 text-[var(--text-muted)] opacity-50" />
          </div>
          <h3 className="card-empty-title">No estás inscripto en ninguna clase</h3>
          <p className="card-empty-description">Espera a que un docente te agregue a su lista de alumnos.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link key={c.id} to={`/student/class/${c.id}`} className="group">
              <Card className="card card-hover h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-[var(--text-primary)]">{c.name}</CardTitle>
                  <CardDescription className="text-[var(--text-secondary)]">
                    Docente: {c.profiles?.full_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="secondary" className="w-full mt-4 rounded-xl font-bold">
                    Ver Mi Progreso
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}