import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { BookOpen } from "lucide-react";

export default function StudentDashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-8">Cargando mis clases...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Mis Materias</h2>
        <p className="text-muted-foreground">Consulta tu progreso y notas de cada clase.</p>
      </div>

      {classes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-lg font-medium">No estás inscripto en ninguna clase</p>
          <p className="text-sm text-muted-foreground">Espera a que un docente te agregue a su lista de alumnos.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Card key={c.id} className="hover:border-primary transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{c.name}</CardTitle>
                <CardDescription>
                  Docente: {c.profiles?.full_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={`/student/class/${c.id}`}>
                  <Button variant="secondary" className="w-full mt-4">Ver Mi Progreso</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
