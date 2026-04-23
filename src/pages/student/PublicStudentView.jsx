import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  GraduationCap, CheckCircle2, Clock, Award, TrendingUp, Star, 
  ShieldCheck, Trophy, Target, Sparkles, Flame, Crown, Flag, 
  Medal, Heart, ChevronLeft, XCircle, ShoppingBag, Coins as CoinsIcon, 
  Check, AlertCircle, ShoppingCart 
} from "lucide-react";
import confetti from "canvas-confetti";
import { calculateGamification } from "../../lib/gamificationEngine";
import { SkillsRadar } from "../../components/ui/SkillsRadar";

export default function PublicStudentView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("progress"); // "progress" | "shop"
  const [purchasing, setPurchasing] = useState(null);
  const [showDniModal, setShowDniModal] = useState(false);
  const [dniInput, setDniInput] = useState("");
  const [selectedReward, setSelectedReward] = useState(null);
  const [dniError, setDniError] = useState("");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const spentCoins = data?.purchases?.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + (p.cost_coins || 0), 0) || 0;
  const gami = data?.sessions ? calculateGamification(data.sessions, null, null, spentCoins) : null;

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

    // Confetti for high performance
    const totalPossibleScore = result?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.max_score ?? 0), 0), 0) || 1;
    const totalAchievedScore = result?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.score ?? 0), 0), 0) || 0;
    const overallPercentage = (totalAchievedScore / totalPossibleScore) * 100;

    if (overallPercentage >= 90) {
      const lastConfetti = localStorage.getItem(`confetti_${token}`);
      if (!lastConfetti || Date.now() - parseInt(lastConfetti) > 3600000) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#6366f1', '#d4af37']
        });
        localStorage.setItem(`confetti_${token}`, Date.now().toString());
      }
    }
  };

  const handlePurchase = (reward) => {
    if (gami.notyxCoins < reward.cost_coins) return;
    setSelectedReward(reward);
    setDniInput("");
    setDniError("");
    setShowDniModal(true);
  };

  const confirmPurchase = async () => {
    if (!dniInput.trim()) {
      setDniError("Debes ingresar tu DNI.");
      return;
    }
    
    setPurchasing(selectedReward.id);
    setDniError("");
    
    try {
      // Validate DNI securely via RPC
      const { data: isValid, error: checkError } = await supabase
        .rpc("validate_student_dni", {
          p_cs_id: data.cs_id,
          p_dni: dniInput
        });

      if (checkError || !isValid) {
        setDniError("DNI incorrecto. Verifica tus datos.");
        setPurchasing(null);
        return;
      }

      const { error: pError } = await supabase.from("student_purchases").insert([{
        class_student_id: data.cs_id,
        reward_id: selectedReward.id,
        status: 'pending'
      }]);

      if (pError) throw pError;

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
      setShowDniModal(false);
      await fetchData();
    } catch (err) {
      console.error("Error en compra:", err);
      setDniError("Error al procesar la compra.");
    }
    setPurchasing(null);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="text-center relative z-10 flex flex-col items-center">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
          <GraduationCap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600" />
        </div>
        <p className="text-slate-800 font-black text-2xl tracking-tight">Cargando tu Perfil...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center bg-white p-12 rounded-[40px] shadow-2xl border border-slate-200 max-w-sm">
        <div className="text-6xl mb-6">🔗</div>
        <h2 className="text-2xl font-black mb-2 text-slate-800 tracking-tight">Link inválido</h2>
        <p className="text-slate-500 font-medium mb-8">{error}</p>
        <button onClick={() => navigate('/')} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest">Ir al inicio</button>
      </div>
    </div>
  );

  const totalScore = data?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.score ?? 0), 0), 0);
  const maxTotal = data?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.max_score ?? 0), 0), 0);

  const IconMap = { Flag, Flame, Star, Crown, TrendingUp: ShieldCheck };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF] pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-4 w-full flex-1">
             <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-all border border-slate-200"><ChevronLeft className="w-6 h-6" /></button>
             <div className="flex-1 min-w-0">
                <h1 className="font-black text-xl md:text-2xl tracking-tight text-slate-800 truncate leading-none mb-1">{data.class_name}</h1>
                <div className="flex items-center gap-2">
                   <p className="text-sm font-bold text-slate-500 truncate opacity-80">{data.student_name}</p>
                   {data.house && (
                     <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ backgroundColor: data.house.color + '15', color: data.house.color, borderColor: data.house.color + '30' }}>
                        {data.house.icon} {data.house.name}
                     </span>
                   )}
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             {/* Coins Display */}
             <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 px-5 py-2.5 rounded-2xl shadow-sm">
                <CoinsIcon className="w-5 h-5 text-orange-500" />
                <span className="text-xl font-black text-orange-700 leading-none">{gami?.notyxCoins || 0}</span>
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Coins</span>
             </div>

             <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button onClick={() => setActiveTab("progress")} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'progress' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Progreso</button>
                <button onClick={() => setActiveTab("shop")} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'shop' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tienda</button>
             </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-[800px] space-y-8 animate-in fade-in duration-500">
        
        {activeTab === "progress" ? (
          <>
            {/* Gamification Main Card */}
            {gami && (
              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-2xl shadow-slate-900/5 overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-20 pointer-events-none ${gami.rank.bg.replace('bg-', 'bg-')}`} />
                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                  <div className="relative group shrink-0">
                    <div className={`w-32 h-32 rounded-[40px] flex flex-col items-center justify-center font-black shadow-lg border-4 ${gami.rank.bg} ${gami.rank.border} ${gami.rank.color}`}>
                      <Trophy className="w-12 h-12 mb-1" />
                      <span className="text-[10px] uppercase tracking-widest leading-none">Rango</span>
                      <span className="text-sm tracking-tight leading-none mt-1">{gami.rank.name}</span>
                    </div>
                    <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xl border-4 border-white shadow-xl">
                      {gami.currentLevel}
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-6">
                    <div className="flex justify-between items-end">
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">XP TOTAL</p>
                         <h3 className="text-4xl font-black text-slate-800 leading-none tracking-tighter">{gami.currentXP}</h3>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nota Promedio</p>
                         <p className="text-2xl font-black text-slate-600 leading-none tracking-tighter">{maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0}%</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                         <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                           <span className="text-blue-600">Nivel {gami.currentLevel}</span>
                           <span className="text-slate-400">{gami.currentLevelXP} / {gami.nextLevelXP} XP</span>
                         </div>
                         <div className="h-4 bg-slate-100 rounded-full overflow-hidden border-2 border-white shadow-inner">
                           <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${(gami.currentLevelXP / gami.nextLevelXP) * 100}%` }} />
                         </div>
                       </div>
                       <div className={`p-4 rounded-3xl border transition-all ${gami.hp <= 30 ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-slate-50 border-slate-100'}`}>
                         <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest mb-2">
                           <span className="flex items-center gap-2 text-slate-700"><Heart className={`w-4 h-4 ${gami.hp <= 30 ? 'text-red-500 fill-red-500' : 'text-rose-400 fill-rose-200'}`} /> Vitalidad (HP)</span>
                           <span className={gami.hp <= 30 ? 'text-red-600 font-black' : 'text-slate-500 font-black'}>{gami.hp} / {gami.MAX_HP} HP</span>
                         </div>
                         <div className="h-3 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                           <div className={`h-full rounded-full transition-all duration-1000 ${gami.hp <= 30 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} style={{ width: `${(gami.hp / gami.MAX_HP) * 100}%` }} />
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Achievements Grid */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl">
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3"><Medal className="w-6 h-6 text-indigo-500" /> Tus Logros</h3>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {gami?.unlockedBadges.map((badge) => {
                    const Icon = IconMap[badge.icon] || Star;
                    return (
                      <div key={badge.id} className={`rounded-3xl p-4 flex flex-col items-center justify-center gap-3 border transition-all ${badge.unlocked ? `${badge.bg} border-transparent shadow-md` : 'bg-slate-50 border-slate-100 opacity-30 grayscale scale-95'}`}>
                         <Icon className={`w-8 h-8 ${badge.color}`} />
                         <div className="text-center">
                           <span className="text-[10px] font-black uppercase tracking-tight text-slate-700 block leading-tight">{badge.label}</span>
                           <span className="text-[8px] font-bold text-slate-500 mt-1 block">{badge.req}</span>
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>

            {/* Missions Register */}
            <div className="space-y-8">
               <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Flag className="w-8 h-8 text-indigo-500" /> Historial de Misiones</h3>
               <div className="space-y-6">
                  {[...data.sessions].map((session) => {
                    const sessionGami = gami?.sessionScores?.find(s => s.id === session.id);
                    const isAbsent = session.attendance === false;
                    return (
                      <div key={session.id} className={`bg-white rounded-[40px] border overflow-hidden shadow-lg ${sessionGami?.died ? 'border-red-200' : 'border-slate-100'}`}>
                        <div className={`px-8 py-6 border-b flex items-center justify-between ${isAbsent ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isAbsent ? 'bg-red-100 text-red-600' : 'bg-white border border-slate-200'}`}>
                                {isAbsent ? <XCircle className="w-6 h-6" /> : <Clock className="w-6 h-6 text-slate-400" />}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-800 capitalize leading-none mb-1">{format(new Date(session.date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}</h4>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isAbsent ? 'text-red-500' : 'text-slate-400'}`}>{isAbsent ? 'Derrota por Falta' : 'Misión Completada'}</p>
                              </div>
                           </div>
                           {sessionGami && (
                             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${sessionGami.hpChange >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                               <Heart className={`w-3 h-3 ${sessionGami.hpChange >= 0 ? 'fill-emerald-500' : 'fill-red-500'}`} /> {sessionGami.hpChange >= 0 ? '+' : ''}{sessionGami.hpChange} HP
                             </div>
                           )}
                        </div>
                        <div className="p-0">
                           <table className="w-full text-left">
                              <tbody className="divide-y divide-slate-50">
                                 {(session.criteria || []).map(crit => (
                                   <tr key={crit.id} className="group hover:bg-slate-50/50 transition-all">
                                      <td className="px-8 py-5 font-bold text-slate-700 text-sm">{crit.name}</td>
                                      <td className="px-8 py-5 text-center">
                                         <div className="inline-flex flex-col items-center">
                                            <span className="text-2xl font-black text-slate-900 leading-none">{crit.score ?? '—'}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase mt-1">/ {crit.max_score}</span>
                                         </div>
                                      </td>
                                      <td className="px-8 py-5 text-right">
                                         <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${crit.score != null ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>{crit.score != null ? 'Logrado' : 'Pendiente'}</span>
                                      </td>
                                   </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                      </div>
                    )
                  })}
               </div>
            </div>
          </>
        ) : (
          /* SHOP TAB */
          <div className="space-y-10 animate-in slide-up">
             <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-orange-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                   <div className="flex items-center gap-6">
                      <div className="bg-white/20 p-5 rounded-[24px] backdrop-blur-xl border border-white/20"><ShoppingBag className="w-10 h-10" /></div>
                      <div>
                         <h2 className="text-3xl font-black tracking-tight leading-none mb-2">Tienda de Premios</h2>
                         <p className="text-orange-100/80 font-medium italic">Canjea tus Notyx Coins por ventajas en clase</p>
                      </div>
                   </div>
                   <div className="bg-white text-orange-600 px-8 py-4 rounded-3xl flex flex-col items-center shadow-xl">
                      <span className="text-[10px] font-black uppercase tracking-widest mb-1">Tu Saldo Actual</span>
                      <div className="flex items-center gap-2">
                         <CoinsIcon className="w-6 h-6" />
                         <span className="text-4xl font-black leading-none">{gami?.notyxCoins || 0}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(data.rewards || []).map(reward => {
                  const alreadyBought = data.purchases?.some(p => p.reward_id === reward.id && p.status === 'pending');
                  const canAfford = (gami?.notyxCoins || 0) >= reward.cost_coins;

                  return (
                    <div key={reward.id} className={`bg-white rounded-[40px] p-8 border-2 transition-all flex flex-col justify-between group ${alreadyBought ? 'border-emerald-200 shadow-emerald-500/5' : 'border-slate-100 hover:border-orange-200 hover:shadow-2xl shadow-slate-200/50'}`}>
                       <div>
                          <div className="flex items-start justify-between mb-6">
                             <div className="text-5xl w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">{reward.icon}</div>
                             <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Costo</span>
                                <div className="flex items-center gap-1.5 justify-end">
                                   <CoinsIcon className="w-4 h-4 text-orange-500" />
                                   <span className="text-2xl font-black text-slate-800">{reward.cost_coins}</span>
                                </div>
                             </div>
                          </div>
                          <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-3">{reward.name}</h4>
                          <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">{reward.description || 'Sin descripción'}</p>
                       </div>

                       {alreadyBought ? (
                         <div className="bg-emerald-50 text-emerald-600 py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest border border-emerald-200"><Check className="w-5 h-5" /> Canje Pendiente</div>
                       ) : (
                         <Button 
                            disabled={!canAfford || purchasing === reward.id}
                            onClick={() => handlePurchase(reward)}
                            className={`w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${
                              canAfford 
                                ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20" 
                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                            }`}
                         >
                            {purchasing === reward.id ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : (canAfford ? 'Canjear Premio' : 'Faltan Coins')}
                         </Button>
                       )}
                    </div>
                  );
                })}
             </div>

             {/* Recent Purchases List */}
             {(data.purchases?.length || 0) > 0 && (
                <div className="pt-10 space-y-6">
                   <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3"><ShoppingCart className="w-6 h-6 text-blue-500" /> Mis Últimos Canjes</h3>
                   <div className="grid gap-3">
                      {data.purchases.slice(0, 5).map(p => (
                        <div key={p.id} className="bg-white border border-slate-100 p-5 rounded-3xl flex items-center justify-between shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className="text-2xl w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-50">🎁</div>
                              <div>
                                 <h5 className="font-black text-slate-800 text-sm leading-none mb-1">Premio #{(p.id || '').slice(0, 4)}</h5>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado: <span className={p.status === 'delivered' ? 'text-emerald-500' : p.status === 'cancelled' ? 'text-red-500' : 'text-amber-500'}>{p.status === 'delivered' ? 'Entregado' : p.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}</span></p>
                              </div>
                           </div>
                           <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                              <CoinsIcon className="w-3.5 h-3.5 text-orange-400" />
                              <span className="text-sm font-black text-slate-600">{p.cost_coins}</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             )}
          </div>
        )}
      </div>

      {/* DNI Validation Modal */}
      {showDniModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-orange-500" />
              <div className="text-center">
                 <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="w-10 h-10" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Validar Identidad</h3>
                 <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                    Para confirmar el canje de <span className="font-black text-orange-600">{selectedReward?.name}</span>, ingresa tu DNI registrado por el profesor.
                 </p>
                 
                 <div className="space-y-4">
                    <div className="relative">
                       <input 
                          type="password"
                          placeholder="Ingresa tu DNI..."
                          autoFocus
                          className={`w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 font-bold text-center text-xl outline-none transition-all ${dniError ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-orange-500'}`}
                          value={dniInput}
                          onChange={e => setDniInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && confirmPurchase()}
                       />
                       {dniError && (
                         <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center justify-center gap-1">
                           <AlertCircle className="w-3 h-3" /> {dniError}
                         </p>
                       )}
                    </div>

                    <div className="flex gap-3 pt-4">
                       <Button 
                          onClick={confirmPurchase}
                          disabled={purchasing === selectedReward?.id}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-500/20"
                       >
                          {purchasing === selectedReward?.id ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : 'Confirmar'}
                       </Button>
                       <Button 
                          variant="ghost" 
                          onClick={() => setShowDniModal(false)}
                          className="flex-1 h-14 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-[10px]"
                       >
                          Cancelar
                       </Button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// Reuse existing Button component if possible, or define simple one
function Button({ children, className, onClick, disabled, type = "button" }) {
  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}
