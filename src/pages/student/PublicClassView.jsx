import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GraduationCap, Users, Clock, Trophy, LayoutGrid, List } from "lucide-react";

export default function PublicClassView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "cards"

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchData = async () => {
    const { data: result, error: rpcError } = await supabase.rpc("get_class_live_data", { p_token: token });
    if (rpcError || result?.error) {
      setError(rpcError?.message || result?.error);
      setLoading(false);
      return;
    }
    setData(result);
    setLastUpdated(new Date());
    setLoading(false);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" />
        <p className="text-slate-400 animate-pulse font-medium">Conectando con la clase en vivo...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="text-center text-white bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-2xl max-w-sm">
        <div className="text-6xl mb-6">🔗</div>
        <h2 className="text-2xl font-black mb-2">Link no válido</h2>
        <p className="text-slate-400 mb-6 text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
          Reintentar
        </button>
      </div>
    </div>
  );

  // Flatten all criteria across all sessions for table columns
  const allCriteria = [];
  (data.sessions || []).forEach(session => {
    (session.criteria || []).forEach(crit => {
      allCriteria.push({ ...crit, sessionDate: session.date });
    });
  });

  const students = data.students || [];

  // Calculate totals per student
  const studentTotals = students.map(st => {
    const total = allCriteria.reduce((sum, crit) => {
      const score = st.grades?.[crit.id];
      return sum + (score != null ? Number(score) : 0);
    }, 0);
    const max = allCriteria.reduce((sum, crit) => sum + (crit.max_score || 0), 0);
    return { ...st, total, max };
  });

  // Sort students: highest total first
  const sortedStudents = [...studentTotals].sort((a, b) => b.total - a.total);

  const getScoreColor = (score, max) => {
    if (score == null) return "text-slate-700";
    const pct = max > 0 ? score / max : 0;
    if (pct >= 0.75) return "text-green-400";
    if (pct >= 0.5) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      {/* Moving background glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2.5 rounded-2xl shadow-lg shadow-blue-900/40 border border-blue-400/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-2xl tracking-tight leading-none bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                {data.class_name}
              </h1>
              <div className="flex items-center gap-3 mt-1.5 font-bold">
                <div className="flex items-center gap-2 text-[10px] text-green-400 uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  En Vivo
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                  {lastUpdated ? `Sync: ${format(lastUpdated, "HH:mm:ss")}` : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-slate-800 text-blue-400 shadow-inner" : "text-slate-500 hover:text-slate-300"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition-all ${viewMode === "cards" ? "bg-slate-800 text-blue-400 shadow-inner" : "text-slate-500 hover:text-slate-300"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800 flex items-center gap-2.5 shadow-lg">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-black">{students.length} <span className="text-slate-500 font-medium">alumnos</span></span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {allCriteria.length === 0 || students.length === 0 ? (
          <div className="text-center py-32 flex flex-col items-center">
            <div className="bg-slate-900 w-24 h-24 rounded-full flex items-center justify-center mb-6 border border-slate-800 shadow-inner">
              <Clock className="w-10 h-10 text-slate-700 animate-pulse" />
            </div>
            <p className="text-xl font-black text-slate-400 tracking-tight">Cargando Planilla...</p>
            <p className="text-slate-600 max-w-xs mt-2 text-sm">El docente aún no ha registrado evaluaciones en clases activas.</p>
          </div>
        ) : viewMode === "table" ? (
          <div className="relative group">
            {/* Table Shadow Overlay */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
            
            <div className="relative overflow-x-auto rounded-3xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-md shadow-2xl">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80">
                    <th className="text-left px-6 py-6 font-black text-xs uppercase tracking-[0.2em] text-slate-500 bg-slate-950/40 sticky left-0 min-w-[200px] z-10">
                      Alumno
                    </th>
                    {(data.sessions || []).map(session => (
                      <th
                        key={session.id}
                        colSpan={(session.criteria || []).length}
                        className="px-4 py-4 text-center text-[10px] uppercase tracking-[0.25em] font-black text-slate-400 bg-slate-900/60 border-l border-slate-800/50"
                      >
                        {format(new Date(session.date + "T12:00:00"), "d MMM", { locale: es })}
                      </th>
                    ))}
                    <th className="px-6 py-6 text-center text-xs uppercase tracking-[0.2em] font-black text-blue-500 bg-slate-950/40 border-l border-slate-800/50 sticky right-0 z-10">
                      Total
                    </th>
                  </tr>
                  <tr className="border-b border-slate-800 bg-slate-950/20">
                    <th className="sticky left-0 bg-slate-950/60 transition-colors" />
                    {allCriteria.map(crit => (
                      <th key={crit.id} className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-600 border-l border-slate-800/30 whitespace-nowrap min-w-[100px]">
                        <div className="truncate mb-0.5">{crit.name}</div>
                        <div className="text-[10px] opacity-40 font-medium tracking-normal">/{crit.max_score}</div>
                      </th>
                    ))}
                    <th className="sticky right-0 bg-slate-950/60" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/40">
                  {sortedStudents.map((student, idx) => (
                    <tr
                      key={student.cs_id}
                      className={`group/row transition-all ${idx % 2 === 0 ? "bg-transparent" : "bg-slate-900/20"} hover:bg-blue-600/5`}
                    >
                      <td className="px-6 py-5 font-bold text-slate-200 sticky left-0 bg-slate-950 group-hover/row:bg-slate-900 transition-colors z-10 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 shadow-lg ${
                            idx === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-black border border-yellow-300/50 shadow-yellow-500/20" :
                            idx === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500 text-black" :
                            idx === 2 ? "bg-gradient-to-br from-amber-700 to-amber-900 text-white" :
                            "bg-slate-800 text-slate-400"
                          }`}>
                            {idx < 3 ? <Trophy className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span className="truncate">{student.name}</span>
                        </div>
                      </td>
                      {allCriteria.map(crit => {
                        const score = student.grades?.[crit.id];
                        return (
                          <td key={crit.id} className="px-4 py-5 text-center border-l border-slate-800/30">
                            {score != null ? (
                              <span className={`font-black text-xl tracking-tighter ${getScoreColor(score, crit.max_score)}`}>
                                {score}
                              </span>
                            ) : (
                              <span className="text-slate-800 font-bold text-lg">•</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-5 text-center border-l border-slate-800/60 sticky right-0 bg-slate-950 group-hover/row:bg-slate-900 transition-colors z-10 shadow-[-4px_0_10px_-5px_rgba(0,0,0,0.5)]">
                        <div className="font-black text-2xl tracking-tighter text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">{student.total}</div>
                        {student.max > 0 && (
                          <div className="text-[10px] text-slate-600 font-bold mt-0.5">/{student.max}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards View for Mobile/Alternative */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedStudents.map((st, idx) => (
              <div 
                key={st.cs_id} 
                className={`relative p-6 rounded-3xl border border-slate-800 transition-all hover:border-blue-500/50 group ${
                  idx === 0 ? "bg-gradient-to-b from-blue-900/10 to-transparent border-blue-500/30 shadow-lg shadow-blue-500/5" : "bg-slate-900/40"
                }`}
              >
                {idx < 3 && (
                  <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl rotate-12 ${
                    idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-slate-400" : "bg-amber-800"
                  }`}>
                    <Trophy className="w-5 h-5 text-slate-900" />
                  </div>
                )}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl font-black text-blue-500 border border-slate-700">
                    {st.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-lg truncate text-slate-100">{st.name}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Posición #{idx + 1}</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  {allCriteria.slice(-4).map(crit => (
                    <div key={crit.id} className="flex justify-between items-center bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-600 font-bold uppercase truncate">{crit.name}</p>
                        <p className="text-[9px] text-slate-700 leading-none">{format(new Date(crit.sessionDate + "T12:00:00"), "d MMM", { locale: es })}</p>
                      </div>
                      <div className={`font-black text-xl tracking-tighter ${getScoreColor(st.grades?.[crit.id], crit.max_score)}`}>
                        {st.grades?.[crit.id] ?? "—"}
                      </div>
                    </div>
                  ))}
                  {allCriteria.length > 4 && <p className="text-center text-[10px] text-slate-600 font-bold">+ otros criterios</p>}
                </div>

                <div className="flex items-end justify-between border-t border-slate-800 pt-4">
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Puntaje Total</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-blue-400 tracking-tighter">{st.total}</span>
                      <span className="text-sm text-slate-600 font-bold">/ {st.max}</span>
                    </div>
                  </div>
                  <div className="bg-blue-600/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                    <span className="text-blue-400 font-black text-sm">{st.max > 0 ? Math.round((st.total / st.max) * 100) : 0}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
