import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GraduationCap, CheckCircle2, Clock } from "lucide-react";

export default function PublicStudentView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Poll for real-time updates every 5 seconds (anon users can't use realtime channel easily)
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchData = async () => {
    const { data: result, error: rpcError } = await supabase.rpc("get_student_live_data", {
      p_token: token,
    });

    if (rpcError || result?.error) {
      setError(rpcError?.message || result?.error || "Link inválido o expirado.");
      setLoading(false);
      return;
    }

    setData(result);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Conectando en vivo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-2xl font-bold mb-2">Link inválido</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const totalScore = data?.sessions?.reduce((acc, session) => {
    return acc + (session.criteria || []).reduce((a, c) => a + (c.score ?? 0), 0);
  }, 0);

  const maxTotal = data?.sessions?.reduce((acc, session) => {
    return acc + (session.criteria || []).reduce((a, c) => a + (c.max_score ?? 0), 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">{data.class_name}</h1>
            <p className="text-sm text-muted-foreground">{data.student_name}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-green-600 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            En vivo
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">

        {/* Summary Card */}
        {maxTotal > 0 && (
          <div className="bg-gradient-to-br from-primary to-indigo-700 rounded-3xl p-8 text-white shadow-2xl shadow-primary/20 relative overflow-hidden border border-white/10">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-blue-100 text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-80">Rendimiento Total</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black tracking-tighter">{totalScore}</span>
                  <span className="text-2xl text-blue-200/60 font-medium">/ {maxTotal}</span>
                </div>
                <p className="text-blue-100/70 text-sm mt-2 font-medium">Puntos acumulados en la cursada</p>
              </div>
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-xl rounded-[40px] h-28 w-28 flex flex-col items-center justify-center border border-white/20 shadow-inner">
                  <span className="text-3xl font-black">{maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0}%</span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Logrado</span>
                </div>
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full -z-10 animate-pulse" />
              </div>
            </div>
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />
          </div>
        )}

        {/* Sessions */}
        {!data.sessions || data.sessions.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-[40px] border border-dashed border-slate-200">
            <Clock className="w-16 h-16 mx-auto mb-6 text-slate-300 animate-pulse" />
            <p className="text-xl font-black text-slate-900 tracking-tight">Esperando novedades...</p>
            <p className="text-sm text-slate-500 mt-2 font-medium">El docente aún no ha registrado evaluaciones en vivo.</p>
          </div>
        ) : (
          data.sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-900/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-6 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 capitalize text-lg tracking-tight">
                    {format(new Date(session.date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Detalle de la sesión</p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                  Evaluación
                </div>
              </div>
              
              <div className="p-0 overflow-x-auto">
                {!session.criteria || session.criteria.length === 0 ? (
                  <div className="px-8 py-10 text-center">
                    <p className="text-sm text-slate-400 font-mediumitalic">Sin criterios definidos para esta clase.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30 border-b border-slate-50">
                        <th className="text-left px-8 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Criterio de Evaluación</th>
                        <th className="text-center px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Nota</th>
                        <th className="text-right px-8 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {session.criteria.map((crit) => {
                        const isGraded = crit.score !== null;
                        const percentage = isGraded ? (crit.score / crit.max_score) * 100 : 0;
                        
                        return (
                          <tr key={crit.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isGraded ? 'bg-green-50 text-green-600 shadow-sm shadow-green-100' : 'bg-slate-50 text-slate-300'}`}>
                                  {isGraded ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800 block leading-tight">{crit.name}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Máximo: {crit.max_score} puntos</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center">
                              {isGraded ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-2xl font-black text-slate-900 leading-none">{crit.score}</span>
                                  <div className="w-12 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                     <div className={`h-full rounded-full ${percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xl font-black text-slate-200 tracking-widest">—</span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-right">
                              {isGraded ? (
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                  percentage >= 70 ? 'bg-green-50 text-green-700' : 
                                  percentage >= 40 ? 'bg-yellow-50 text-yellow-700' : 
                                  'bg-red-50 text-red-700'
                                }`}>
                                  {percentage >= 70 ? 'Excelente' : percentage >= 40 ? 'En proceso' : 'Requiere apoyo'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400">
                                  Pendiente
                                </span>
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
