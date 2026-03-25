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

  const allCriteria = sessionsData.flatMap(s => s.criteriaWithGrades);
  const totalScore = allCriteria.reduce((a, c) => a + (c.score || 0), 0);
  const maxTotal = allCriteria.reduce((a, c) => a + (c.max_score || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/home">
            <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-white border-transparent">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-none">{classData?.name}</h2>
            <p className="text-slate-500 text-sm mt-2 flex items-center gap-2 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Seguimiento en vivo del alumno
            </p>
          </div>
        </div>
      </div>

      {maxTotal > 0 && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[40px] p-8 text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden border border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
            <div className="text-center sm:text-left">
              <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.3em] mb-3 opacity-80">Rendimiento Consolidado</p>
              <div className="flex items-baseline justify-center sm:justify-start gap-2">
                <span className="text-7xl font-black tracking-tighter leading-none">{totalScore}</span>
                <span className="text-2xl text-blue-200/60 font-black">/ {maxTotal}</span>
              </div>
              <p className="text-blue-100/70 text-sm mt-4 font-bold tracking-wide">Puntos acumulados hasta hoy</p>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-2xl rounded-[48px] h-36 w-36 flex flex-col items-center justify-center border-2 border-white/20 shadow-2xl">
                <span className="text-4xl font-black">{maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0}%</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mt-2">Promedio</span>
              </div>
              <div className="absolute inset-0 bg-blue-400/30 blur-3xl rounded-full -z-10 animate-pulse" />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        </div>
      )}

      <div className="space-y-8">
        {sessionsData.length === 0 ? (
          <div className="py-24 text-center bg-white/50 rounded-[48px] border-2 border-dashed border-slate-200">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-6 text-slate-200" />
            <p className="text-xl font-black text-slate-400">Sin sesiones registradas</p>
          </div>
        ) : (
          sessionsData.map(session => (
            <div key={session.id} className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-900/5 overflow-hidden">
              <div className="bg-slate-50/50 border-b border-slate-100 px-10 py-8">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">Registro de Sesión</p>
                <h3 className="capitalize text-2xl font-black text-slate-900 tracking-tight">
                  {format(new Date(session.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                </h3>
              </div>
              
              <div className="p-0 overflow-x-auto">
                {session.criteriaWithGrades.length === 0 ? (
                  <div className="px-10 py-12 text-center text-slate-400 font-bold italic">
                    Sin criterios definidos aún.
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30 border-b border-slate-50">
                        <th className="text-left px-10 py-5 font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Criterio</th>
                        <th className="text-center px-6 py-5 font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Nota Obtenida</th>
                        <th className="text-right px-10 py-5 font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Desempeño</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {session.criteriaWithGrades.map(crit => {
                        const isGraded = crit.score !== null;
                        const percentage = isGraded ? (crit.score / crit.max_score) * 100 : 0;
                        
                        return (
                          <tr key={crit.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-all ${isGraded ? 'bg-blue-50 text-blue-600 shadow-lg shadow-blue-500/5' : 'bg-slate-100 text-slate-300'}`}>
                                  <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                  <span className="font-black text-slate-800 block text-base leading-tight">{crit.name}</span>
                                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Escala: 0 a {crit.max_score}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6 text-center">
                              {isGraded ? (
                                <div className="inline-flex flex-col items-center">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{crit.score}</span>
                                    <span className="text-sm font-bold text-slate-300">/ {crit.max_score}</span>
                                  </div>
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden shadow-inner">
                                     <div className={`h-full rounded-full transition-all duration-1000 ${percentage >= 70 ? 'bg-blue-600' : percentage >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${percentage}%` }} />
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200/50">
                                  Pendiente
                                </span>
                              )}
                            </td>
                            <td className="px-10 py-6 text-right">
                              {isGraded ? (
                                <div className="flex flex-col items-end">
                                  <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${
                                    percentage >= 70 ? 'text-blue-600' : 
                                    percentage >= 40 ? 'text-amber-600' : 
                                    'text-rose-600'
                                  }`}>
                                    {percentage >= 70 ? 'Dominado' : percentage >= 40 ? 'En Progreso' : 'A Reforzar'}
                                  </span>
                                  <span className="text-[10px] text-slate-300 font-bold mt-1">Evaluado hoy</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-bold italic">Esperando nota</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
