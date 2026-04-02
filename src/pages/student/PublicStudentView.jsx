import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GraduationCap, CheckCircle2, Clock, Award, TrendingUp, Star, ShieldCheck, Trophy, Target, Sparkles, Flame, Crown, Flag, Medal, Heart, ChevronLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { calculateGamification } from "../../lib/gamificationEngine";

export default function PublicStudentView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Poll for real-time updates every 5 seconds (anon users can't use realtime channel easily)
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const gami = data?.sessions ? calculateGamification(data.sessions) : null;

  useEffect(() => {
    if (gami && gami.currentLevel > 1) {
      const storedLvl = localStorage.getItem(`level_${token}`);
      if (!storedLvl || parseInt(storedLvl) < gami.currentLevel) {
        localStorage.setItem(`level_${token}`, gami.currentLevel);
        if (storedLvl) {
           confetti({
             particleCount: 150,
             spread: 80,
             origin: { y: 0.6 }
           });
        }
      }
    }
  }, [gami?.currentLevel, token]);

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

    // Trigger confetti if average is high
    // Calculate overall average score across all sessions
    const totalPossibleScore = result?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.max_score ?? 0), 0), 0) || 1;
    const totalAchievedScore = result?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.score ?? 0), 0), 0) || 0;
    const overallPercentage = (totalAchievedScore / totalPossibleScore) * 100;

    if (overallPercentage >= 90) {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#6366f1', '#d4af37']
        });
      }, 500);
    }
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

  // Icon mapping for dynamic badge rendering
  const IconMap = { Flag, Flame, Star, Crown, TrendingUp };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <button 
             onClick={() => navigate(-1)} 
             className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
             title="Volver atrás"
          >
             <ChevronLeft className="w-6 h-6" />
          </button>
           <div className={`p-2 rounded-full ${gami?.rank?.bg || 'bg-blue-100'} border ${gami?.rank?.border || 'border-blue-200'}`}>
            <GraduationCap className={`w-6 h-6 ${gami?.rank?.color || 'text-blue-600'}`} />
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

      <div className="container mx-auto px-2 sm:px-4 py-6 max-w-2xl space-y-4 sm:space-y-6">

        {/* Gamification Main Card */}
        {gami && (
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-900/5 overflow-hidden relative">
            {/* Background elements */}
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-20 pointer-events-none ${gami.rank.bg.replace('bg-', '') || 'bg-blue-500'}`} />
            
            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
              {/* Avatar / Shield */}
              <div className="relative group shrink-0">
                <div className={`w-28 h-28 rounded-[32px] flex flex-col items-center justify-center font-black shadow-lg border-4 ${gami.rank.bg} ${gami.rank.border} ${gami.rank.color} transition-all duration-500`}>
                  <Trophy className="w-10 h-10 mb-1" />
                  <span className="text-[10px] uppercase tracking-widest leading-none">Rango</span>
                  <span className="text-sm tracking-tight leading-none mt-1">{gami.rank.name}</span>
                </div>
                {/* Level badge */}
                <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-lg border-4 border-white shadow-xl">
                  {gami.currentLevel}
                </div>
              </div>

              {/* Progress & Stats */}
              <div className="flex-1 w-full space-y-4">
                <div className="flex justify-between items-end">
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">XP Vitalicio</p>
                     <h3 className="text-3xl font-black text-slate-800 leading-none">{gami.currentXP}</h3>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nota Real</p>
                     <p className="text-xl font-black text-slate-600 leading-none">{maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0}%</p>
                   </div>
                </div>

                <div className="space-y-4">
                   {/* Level XP Bar */}
                   <div className="space-y-1.5">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                       <span className="text-blue-600">Nivel {gami.currentLevel}</span>
                       <span className="text-slate-400">{gami.currentLevelXP} / {gami.nextLevelXP} XP</span>
                     </div>
                     <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden border-2 border-white shadow-inner">
                       <div 
                         className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg shimmer transition-all duration-1000" 
                         style={{ width: `${(gami.currentLevelXP / gami.nextLevelXP) * 100}%` }}
                       />
                     </div>
                   </div>
                   
                   {/* HP System Bar */}
                   <div className={`space-y-1.5 p-3 rounded-2xl border ${gami.hp <= 30 ? 'bg-red-50 border-red-200 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)] animate-pulse' : 'bg-slate-50 border-slate-100'}`}>
                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span className="flex items-center gap-1 text-slate-700">
                         <Heart className={`w-3.5 h-3.5 ${gami.hp <= 30 ? 'text-red-500 fill-red-500' : 'text-rose-400 fill-rose-200'}`} /> 
                         Vitalidad (HP)
                       </span>
                       <span className={gami.hp <= 30 ? 'text-red-600' : 'text-slate-500'}>{gami.hp} / {gami.MAX_HP} HP</span>
                     </div>
                     <div className="relative h-2.5 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                       <div 
                         className={`absolute top-0 left-0 h-full rounded-full shadow-lg transition-all duration-1000 ${gami.hp <= 30 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} 
                         style={{ width: `${(gami.hp / gami.MAX_HP) * 100}%` }}
                       />
                     </div>
                   </div>
                </div>
              </div>
            </div>
            
            {/* Streak Indicator */}
            {gami.streak > 0 && (
               <div className="mt-6 flex items-center gap-3 bg-orange-50 border border-orange-100 p-3 rounded-2xl animate-in fade-in zoom-in">
                  <div className="bg-orange-100 p-2 rounded-xl">
                     <Flame className={`w-6 h-6 ${gami.streak >= 3 ? 'text-orange-600 fill-orange-500' : 'text-orange-500'} animate-pulse`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-orange-900 tracking-tight">¡Racha Constante!</h4>
                    <p className="text-[11px] font-bold text-orange-700/80 uppercase tracking-widest">Haz asistido a {gami.streak} clases seguidas</p>
                  </div>
               </div>
            )}
          </div>
        )}

        {/* Dynamic Achievements */}
        {gami && (
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-900/5">
             <div className="flex items-center gap-2 mb-4">
                <Medal className="w-5 h-5 text-indigo-500" />
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Medallas & Logros</h3>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gami.unlockedBadges.map((badge) => {
                  const Icon = IconMap[badge.icon] || Star;
                  return (
                    <div key={badge.id} className={`rounded-2xl p-3 flex flex-col items-center justify-center gap-2 border transition-all ${badge.unlocked ? `${badge.bg} border-transparent shadow-sm relative overflow-hidden group` : 'bg-slate-50 border-slate-100 opacity-50 grayscale'}`}>
                       {badge.unlocked && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
                       <Icon className={`w-6 h-6 ${badge.color} ${badge.unlocked && 'drop-shadow-sm'}`} />
                       <div className="text-center">
                         <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-700 block leading-tight">{badge.label}</span>
                         <span className="text-[8px] sm:text-[9px] font-medium text-slate-500 leading-tight mt-0.5 max-w-[100px] text-center mx-auto block">{badge.req}</span>
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {/* Sessions Area */}
        <div className="flex items-center gap-2 mt-8 mb-4">
           <Flag className="w-5 h-5 text-indigo-500" />
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Registro de Misiones</h3>
        </div>

        {!data.sessions || data.sessions.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-[40px] border border-dashed border-slate-200">
            <Clock className="w-16 h-16 mx-auto mb-6 text-slate-300 animate-pulse" />
            <p className="text-xl font-black text-slate-900 tracking-tight">Esperando misiones...</p>
            <p className="text-sm text-slate-500 mt-2 font-medium">Aún no te has enfrentado a ninguna clase.</p>
          </div>
        ) : (
          [...data.sessions].reverse().map((session) => {
            const sessionGami = gami.sessionScores?.find(s => s.id === session.id);
            const isAbsent = session.attendance === false;

            return (
            <div key={session.id} className={`bg-white rounded-[32px] border shadow-xl shadow-slate-900/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6 ${sessionGami?.died ? 'border-red-200 shadow-red-500/10' : 'border-slate-100'}`}>
              <div className={`border-b px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${sessionGami?.died ? 'bg-red-50 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isAbsent ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                    {isAbsent ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 capitalize text-lg tracking-tight leading-none mb-1">
                      {format(new Date(session.date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                    </h3>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none ${isAbsent ? 'text-red-500' : 'text-slate-400'}`}>
                      {isAbsent ? 'Derrota por inasistencia' : 'Misión Completada'}
                    </p>
                  </div>
                </div>
                
                {sessionGami && sessionGami.hpChange !== 0 && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest shrink-0 border w-fit ${
                    sessionGami.hpChange > 0 ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"
                  }`}>
                     <Heart className={`w-3.5 h-3.5 ${sessionGami.hpChange > 0 ? 'fill-green-500' : 'fill-red-500'}`} />
                     {sessionGami.hpChange > 0 ? '+' : ''}{sessionGami.hpChange} HP
                  </div>
                )}
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
            );
          })
        )}
      </div>
    </div>
  );
}
