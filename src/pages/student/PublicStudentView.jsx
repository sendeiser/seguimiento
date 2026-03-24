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
          <div className="bg-white rounded-xl border shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Puntaje acumulado</p>
              <p className="text-4xl font-black text-primary">{totalScore} <span className="text-xl font-normal text-muted-foreground">/ {maxTotal}</span></p>
            </div>
            <div className="bg-primary/10 rounded-full h-20 w-20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0}%</span>
            </div>
          </div>
        )}

        {/* Sessions */}
        {!data.sessions || data.sessions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Esperando clases...</p>
            <p className="text-sm mt-1">El docente aún no ha registrado ninguna sesión.</p>
          </div>
        ) : (
          data.sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b px-6 py-4">
                <h3 className="font-semibold text-primary capitalize">
                  {format(new Date(session.date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                </h3>
              </div>
              <div className="divide-y">
                {!session.criteria || session.criteria.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-muted-foreground">Sin criterios definidos aún.</p>
                ) : (
                  session.criteria.map((crit) => (
                    <div key={crit.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${crit.score !== null ? 'text-green-500' : 'text-slate-200'}`} />
                        <span className="font-medium">{crit.name}</span>
                      </div>
                      <div className="text-right ml-4">
                        {crit.score !== null ? (
                          <div>
                            <span className="text-2xl font-bold">{crit.score}</span>
                            <span className="text-sm text-muted-foreground"> / {crit.max_score}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Pendiente</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
