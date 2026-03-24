import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";

export default function StudentClassView() {
  const { id } = useParams(); // class id
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [sessionsData, setSessionsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    if (!user) return;

    // Listen to MY grades dynamically to update the UI specifically for this student
    const subscription = supabase
      .channel('public:my_grades')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'grades',
        filter: `student_id=eq.${user.id}`
      }, payload => {
        // Simple strategy: re-fetch everything to ensure consistency
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id, user]);

  const fetchData = async () => {
    if (!user) return;

    const { data: c } = await supabase.from("classes").select("*").eq("id", id).single();
    if (c) setClassData(c);

    // Fetch sessions and their criteria
    const { data: sData } = await supabase
      .from("sessions")
      .select(`
        id, date,
        session_criteria(id, name, max_score)
      `)
      .eq("class_id", id)
      .order("date", { ascending: false });

    // Fetch my grades for this class's criteria
    const criteriaIds = [];
    sData?.forEach(s => s.session_criteria?.forEach(c => criteriaIds.push(c.id)));

    const gradesMap = {};
    if (criteriaIds.length > 0) {
      const { data: gData } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", user.id)
        .in("criteria_id", criteriaIds);

      gData?.forEach(g => {
        gradesMap[g.criteria_id] = g.score;
      });
    }

    // Embed grades into session criteria object for easy rendering
    const enhancedSessions = (sData || []).map(sess => ({
      ...sess,
      criteriaWithGrades: (sess.session_criteria || []).map(crit => ({
        ...crit,
        score: gradesMap[crit.id] !== undefined ? gradesMap[crit.id] : null
      }))
    }));

    setSessionsData(enhancedSessions);
    setLoading(false);
  };

  if (loading) return <div className="p-8">Cargando progreso en vivo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Progreso en: {classData?.name}</h2>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Conectado en vivo - Tus notas se actualizarán automáticamente
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {sessionsData.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground border-dashed">
            Todavía no hay sesiones registradas para esta materia.
          </Card>
        ) : (
          sessionsData.map(session => (
            <Card key={session.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50 border-b pb-4">
                <CardTitle className="capitalize text-lg text-primary">
                  {format(new Date(session.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {session.criteriaWithGrades.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">El docente aún no ha definido los criterios de evaluación para hoy.</p>
                ) : (
                  <div className="divide-y">
                    {session.criteriaWithGrades.map(crit => (
                      <div key={crit.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className={`w-5 h-5 ${crit.score !== null ? 'text-green-500' : 'text-slate-300'}`} />
                          <span className="font-medium">{crit.name}</span>
                        </div>
                        <div className="text-right">
                          {crit.score !== null ? (
                            <div className="text-xl font-bold text-slate-800">
                              {crit.score} <span className="text-sm font-normal items-center text-slate-400">/ {crit.max_score}</span>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Pendiente</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
