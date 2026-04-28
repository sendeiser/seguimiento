import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  GraduationCap, CheckCircle2, Clock, Award, TrendingUp, Star, 
  ShieldCheck, Trophy, Target, Sparkles, Flame, Crown, Flag, 
  Medal, Heart, ChevronLeft, XCircle, ShoppingBag, Coins as CoinsIcon, 
  Check, AlertCircle, ShoppingCart, Gamepad2, Play, RotateCcw, 
  Brain, Puzzle, Sparkle, Binary, Hash, Zap, Timer, BarChart3, Lock, Eye, Camera, Upload, History
} from "lucide-react";
import confetti from "canvas-confetti";
import { calculateGamification } from "../../lib/gamificationEngine";
import StudentCard from "../../components/gamification/StudentCard";
import SudokuGame from "../../components/games/SudokuGame";
import PyramidGame from "../../components/games/PyramidGame";
import MemoryGame from "../../components/games/MemoryGame";
import MathBlitzGame from "../../components/games/MathBlitzGame";

export default function PublicStudentView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("progress"); 
  const [purchasing, setPurchasing] = useState(null);
  const [showDniModal, setShowDniModal] = useState(false);
  const [dniInput, setDniInput] = useState("");
  const [selectedReward, setSelectedReward] = useState(null);
  const [dniError, setDniError] = useState("");
  const [previewSkin, setPreviewSkin] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Arena Games State
  const [activeGame, setActiveGame] = useState(null); 
  
  // Difficulty & Progress
  const [difficulty, setDifficulty] = useState('easy'); 
  const [gameProgress, setGameProgress] = useState([]);
  const [activeUnlocks, setActiveUnlocks] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Increased interval to reduce load
    return () => clearInterval(interval);
  }, [token]);

  const spentCoins = data?.purchases?.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + (p.cost_coins || 0), 0) || 0;
  const gami = data?.sessions ? calculateGamification(data.sessions, null, null, spentCoins, data.class_max_xp) : null;

  const fetchData = async () => {
    const { data: result, error: rpcError } = await supabase.rpc("get_student_live_data", { p_token: token });
    if (rpcError || result?.error) {
      setError(rpcError?.message || result?.error || "Link inválido.");
      setLoading(false);
      return;
    }

    setData(result);
    setLoading(false);

    const { data: progData } = await supabase.from("student_game_progress").select("*").eq("class_student_id", result.cs_id);
    setGameProgress(progData || []);

    const { data: unlocks } = await supabase.from("student_temporary_unlocks").select("*").eq("class_student_id", result.cs_id).gt("expires_at", new Date().toISOString());
    setActiveUnlocks(unlocks || []);
  };

  const handlePurchase = (reward) => {
    if (gami.notyxCoins < reward.cost_coins) return;
    setSelectedReward(reward);
    setDniInput("");
    setDniError("");
    setShowDniModal(true);
  };

  const confirmPurchase = async () => {
    if (!dniInput.trim()) { setDniError("Debes ingresar tu DNI."); return; }
    setPurchasing(selectedReward.id);
    setDniError("");
    try {
      const { data: isValid } = await supabase.rpc("validate_student_dni", { p_cs_id: data.cs_id, p_dni: dniInput });
      if (!isValid) { setDniError("DNI incorrecto."); setPurchasing(null); return; }

      const initialStatus = selectedReward.category === 'cosmetic' ? 'equipped' : 'pending';

      if (selectedReward.category === 'cosmetic') {
        const cosmeticIds = data.rewards.filter(r => r.category === 'cosmetic').map(r => r.id);
        await supabase.from("student_purchases").update({ status: 'purchased' }).eq('class_student_id', data.cs_id).in('reward_id', cosmeticIds);
      }

      await supabase.from("student_purchases").insert([{ class_student_id: data.cs_id, reward_id: selectedReward.id, status: initialStatus }]);

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
      setShowDniModal(false);
      await fetchData();
    } catch (err) { console.error(err); }
    setPurchasing(null);
  };

  const handleEquip = async (reward) => {
    setPurchasing(reward.id);
    try {
      const cosmeticIds = data.rewards.filter(r => r.category === 'cosmetic').map(r => r.id);
      await supabase.from("student_purchases").update({ status: 'purchased' }).eq('class_student_id', data.cs_id).in('reward_id', cosmeticIds);
      await supabase.from("student_purchases").update({ status: 'equipped' }).eq('class_student_id', data.cs_id).eq('reward_id', reward.id);
      await fetchData();
    } catch (err) { console.error(err); }
    setPurchasing(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${data.cs_id}_${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("class_students")
        .update({ avatar_url: publicUrl })
        .eq("id", data.cs_id);

      if (updateError) throw updateError;

      confetti({ particleCount: 50, spread: 60 });
      await fetchData();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleGameWin = async (xpGain) => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    await fetchData();
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 font-black">Cargando...</div>;

  const totalScore = data?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.score ?? 0), 0), 0);
  const maxTotal = data?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.max_score ?? 0), 0), 0);
  const overallPct = maxTotal > 0 ? totalScore / maxTotal : 0;

  const hasPhotoPower = data.purchases?.some(p => {
    const reward = data.rewards.find(r => r.id === p.reward_id);
    return reward?.metadata?.type === 'custom_avatar';
  });

  const cosmetics = data.rewards.filter(r => r.category === 'cosmetic');
  const powerups = data.rewards.filter(r => r.category === 'powerup');
  const classRewards = data.rewards.filter(r => r.category === 'item' || r.category === 'game_pass');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF] pb-20">
      <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-4 w-full flex-1">
             <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200"><ChevronLeft className="w-6 h-6" /></button>
             <div className="flex-1 min-w-0">
                <h1 className="font-black text-xl md:text-2xl tracking-tight text-slate-800 truncate leading-none mb-1">{data.class_name}</h1>
                <p className="text-sm font-bold text-slate-500 truncate opacity-80">{data.student_name}</p>
             </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 px-5 py-2.5 rounded-2xl shadow-sm">
                <CoinsIcon className="w-5 h-5 text-orange-500" />
                <span className="text-xl font-black text-orange-700 leading-none">{gami?.notyxCoins || 0}</span>
             </div>
             <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button onClick={() => setActiveTab("progress")} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'progress' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Progreso</button>
                <button onClick={() => setActiveTab("shop")} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'shop' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tienda</button>
                <button onClick={() => setActiveTab("games")} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'games' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Arena</button>
             </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-[900px] space-y-12">
        {activeTab === "progress" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-[40px] p-6 md:p-10 border border-slate-100 shadow-2xl overflow-hidden relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
               <div className="w-[240px] shrink-0 relative group">
                  <StudentCard 
                    student={{
                      name: data.student_name,
                      pct: overallPct,
                      gami: gami,
                      avatar_url: data.avatar_url,
                      equipped_skin: data.purchases?.find(p => p.status === 'equipped')?.reward_id ? data.rewards.find(r => r.id === data.purchases.find(p => p.status === 'equipped').reward_id)?.name : null
                    }}
                  />
                  {hasPhotoPower && (
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="absolute bottom-4 right-4 bg-white p-3 rounded-2xl shadow-2xl border border-slate-100 hover:scale-110 transition-all z-50 text-blue-600"
                    >
                      <Camera className="w-5 h-5" />
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </button>
                  )}
               </div>
               <div className="flex-1 w-full space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">Mi Perfil Notyx</h3>
                    <p className="text-slate-400 font-bold text-sm">Tu nivel actual es {gami.rank.name}</p>
                  </div>
                  
                  {hasPhotoPower && !data.avatar_url && (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl flex items-center gap-4">
                       <div className="bg-blue-500 text-white p-2 rounded-xl"><Upload className="w-5 h-5" /></div>
                       <div className="flex-1">
                          <p className="text-xs font-black text-blue-800 uppercase tracking-widest">¡Poder de Foto Activado!</p>
                          <p className="text-[10px] text-blue-600 font-bold">Haz clic en la cámara para subir tu foto personalizada.</p>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Puntos XP</span>
                      <span className="text-3xl font-black text-blue-600 tracking-tight">{gami.currentXP}</span>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vitalidad</span>
                      <div className="flex items-center gap-2">
                         <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                         <span className="text-3xl font-black text-slate-800 tracking-tight">{gami.hp}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
                      <span>Nivel {gami.currentLevel}</span>
                      <span>{gami.currentLevelXP} / {gami.nextLevelXP} XP</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden border-2 border-white shadow-inner"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${(gami.currentLevelXP / gami.nextLevelXP) * 100}%` }} /></div>
                  </div>
               </div>
            </div>

            {/* Class History Section */}
            <div className="space-y-6">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                     <div className="bg-blue-100 p-2 rounded-xl"><History className="w-5 h-5 text-blue-600" /></div>
                     <h3 className="text-2xl font-black text-slate-800 tracking-tight">Historial de Clases</h3>
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{data.sessions?.length || 0} Sesiones</span>
               </div>
               
               <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead>
                           <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Asistencia</th>
                              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Rendimiento</th>
                              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntaje</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {data.sessions?.map((session, idx) => {
                              const sessTotal = session.criteria?.reduce((sum, c) => sum + (c.score || 0), 0) || 0;
                              const sessMax = session.criteria?.reduce((sum, c) => sum + (c.max_score || 0), 0) || 0;
                              const sessPct = sessMax > 0 ? (sessTotal / sessMax) * 100 : 0;
                              
                              return (
                                 <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                       <span className="text-sm font-black text-slate-700">{format(new Date(session.date + "T12:00:00"), "d 'de' MMMM", { locale: es })}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                       {session.attendance ? (
                                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Presente</span>
                                       ) : (
                                          <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Ausente</span>
                                       )}
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                          <div className="flex-1 h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                                             <div className={`h-full rounded-full ${sessPct >= 80 ? 'bg-emerald-500' : sessPct >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${sessPct}%` }} />
                                          </div>
                                          <span className="text-xs font-black text-slate-500">{Math.round(sessPct)}%</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className="text-sm font-black text-slate-900">{sessTotal} / {sessMax}</span>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === "shop" && (
          <div className="space-y-12 animate-in slide-up">
             <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                   <div className="flex items-center gap-6">
                      <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-xl border border-white/20"><ShoppingBag className="w-10 h-10" /></div>
                      <div>
                         <h2 className="text-4xl font-black tracking-tight leading-none mb-2">Bazar Estudiantil</h2>
                         <p className="text-orange-100 text-lg font-medium italic">Canjea tus monedas por gloria y estilo</p>
                      </div>
                   </div>
                   <div className="bg-white text-orange-600 px-10 py-5 rounded-[2rem] flex flex-col items-center shadow-xl border-4 border-orange-100">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">Tu Fortuna</span>
                      <div className="flex items-center gap-2 font-black text-4xl">
                         <CoinsIcon className="w-8 h-8" /> {gami?.notyxCoins || 0}
                      </div>
                   </div>
                </div>
             </div>

             {/* Powerups Section */}
             <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                   <div className="bg-amber-100 p-2 rounded-xl"><Zap className="w-5 h-5 text-amber-600" /></div>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight">Superpoderes</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   {powerups.map(reward => {
                      const isBought = data.purchases?.some(p => p.reward_id === reward.id);
                      const canAfford = gami.notyxCoins >= reward.cost_coins;
                      return (
                        <div key={reward.id} className={`bg-white rounded-[2.5rem] p-8 border-2 transition-all flex flex-col justify-between ${isBought ? 'border-amber-400 bg-amber-50/30' : 'border-slate-100 hover:border-amber-200'}`}>
                           <div>
                              <div className="text-5xl w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center border border-amber-100 mb-6 shadow-inner">{reward.icon}</div>
                              <h4 className="text-2xl font-black text-slate-800 mb-2">{reward.name}</h4>
                              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">{reward.description}</p>
                           </div>
                           <Button 
                             disabled={isBought || !canAfford} 
                             onClick={() => handlePurchase(reward)}
                             className={`w-full h-16 rounded-2xl font-black uppercase text-xs tracking-[0.2em] ${isBought ? 'bg-amber-100 text-amber-600' : canAfford ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-slate-100 text-slate-400'}`}
                           >
                              {isBought ? 'Desbloqueado' : <><CoinsIcon className="w-4 h-4 mr-2" /> {reward.cost_coins}</>}
                           </Button>
                        </div>
                      )
                   })}
                </div>
             </div>

             {/* Skins Section */}
             <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                   <div className="bg-fuchsia-100 p-2 rounded-xl"><Sparkles className="w-5 h-5 text-fuchsia-600" /></div>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight">Temas Legendarios</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   {cosmetics.map(reward => {
                      const purchase = data.purchases?.find(p => p.reward_id === reward.id);
                      const isBought = !!purchase;
                      const isEquipped = purchase?.status === 'equipped';
                      const canAfford = gami.notyxCoins >= reward.cost_coins;

                      return (
                        <div key={reward.id} className={`bg-white rounded-[2.5rem] p-8 border-2 transition-all flex flex-col justify-between ${isEquipped ? 'border-fuchsia-400 ring-8 ring-fuchsia-100' : 'border-slate-100'}`}>
                           <div>
                              <div className="flex justify-between items-start mb-6">
                                 <div className="text-5xl w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100">{reward.icon}</div>
                                 <button onClick={() => setPreviewSkin(reward)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-500 transition-all"><Eye className="w-6 h-6" /></button>
                              </div>
                              <h4 className="text-2xl font-black text-slate-800 mb-2">{reward.name}</h4>
                              <p className="text-slate-500 text-sm font-medium mb-8 line-clamp-2">{reward.description}</p>
                           </div>
                           <div className="space-y-3">
                              {isEquipped ? (
                                <div className="bg-fuchsia-50 text-fuchsia-600 h-16 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest border-2 border-fuchsia-200">Equipado</div>
                              ) : isBought ? (
                                <Button onClick={() => handleEquip(reward)} className="w-full h-16 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest">Equipar</Button>
                              ) : (
                                <Button onClick={() => handlePurchase(reward)} disabled={!canAfford} className={`w-full h-16 rounded-2xl font-black uppercase text-xs tracking-widest ${canAfford ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                   <CoinsIcon className="w-4 h-4 mr-2" /> {reward.cost_coins}
                                </Button>
                              )}
                           </div>
                        </div>
                      )
                   })}
                </div>
             </div>

             {/* Class Rewards Section */}
             {classRewards.length > 0 && (
               <div className="space-y-6">
                  <div className="flex items-center gap-3 px-2">
                     <div className="bg-blue-100 p-2 rounded-xl"><Trophy className="w-5 h-5 text-blue-600" /></div>
                     <h3 className="text-2xl font-black text-slate-800 tracking-tight">Premios de Clase</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     {classRewards.map(reward => {
                        const isBought = data.purchases?.some(p => p.reward_id === reward.id);
                        const canAfford = gami.notyxCoins >= reward.cost_coins;
                        return (
                          <div key={reward.id} className={`bg-white rounded-[2.5rem] p-8 border-2 transition-all flex flex-col justify-between ${isBought ? 'border-blue-400 bg-blue-50/30' : 'border-slate-100 hover:border-blue-200'}`}>
                             <div>
                                <div className="text-5xl w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center border border-blue-100 mb-6 shadow-inner">{reward.icon}</div>
                                <h4 className="text-2xl font-black text-slate-800 mb-2">{reward.name}</h4>
                                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">{reward.description}</p>
                             </div>
                             <Button 
                               disabled={isBought || !canAfford} 
                               onClick={() => handlePurchase(reward)}
                               className={`w-full h-16 rounded-2xl font-black uppercase text-xs tracking-[0.2em] ${isBought ? 'bg-blue-100 text-blue-600' : canAfford ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'bg-slate-100 text-slate-400'}`}
                             >
                                {isBought ? 'Adquirido' : <><CoinsIcon className="w-4 h-4 mr-2" /> {reward.cost_coins}</>}
                             </Button>
                          </div>
                        )
                     })}
                  </div>
               </div>
             )}
          </div>
        )}

        {activeTab === "games" && (
           <div className="space-y-12 animate-in slide-up">
              {activeGame === 'Sudoku' ? (
                <SudokuGame studentId={data.cs_id} onExit={() => setActiveGame(null)} onWin={handleGameWin} />
              ) : activeGame === 'Pyramid' ? (
                <PyramidGame studentId={data.cs_id} onExit={() => setActiveGame(null)} onWin={handleGameWin} />
              ) : activeGame === 'Memory Match' ? (
                <MemoryGame studentId={data.cs_id} onExit={() => setActiveGame(null)} onWin={handleGameWin} />
              ) : activeGame === 'Math Blitz' ? (
                <MathBlitzGame studentId={data.cs_id} onExit={() => setActiveGame(null)} onWin={handleGameWin} />
              ) : (
                <>
                  <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                       <div className="flex items-center gap-6">
                          <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-xl border border-white/20"><Gamepad2 className="w-10 h-10" /></div>
                          <div>
                             <h2 className="text-4xl font-black tracking-tight leading-none mb-2">Arena de Juegos</h2>
                             <p className="text-indigo-100 text-lg font-medium italic">Entrena tu mente y gana monedas extra</p>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {/* Sudoku Game Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 hover:border-indigo-200 transition-all flex flex-col group relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
                       <div className="relative z-10">
                          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6"><Brain className="w-8 h-8" /></div>
                          <h3 className="text-2xl font-black text-slate-800 mb-2">Sudyx (4x4)</h3>
                          <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">Completa el desafío lógico de números.</p>
                          {activeUnlocks.some(u => u.unlock_type === 'game' && u.unlock_key === 'Sudoku') ? (
                            <Button onClick={() => setActiveGame('Sudoku')} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2"><Play className="w-4 h-4 fill-white" /> Jugar Ahora</Button>
                          ) : (
                            <div className="bg-slate-50 text-slate-400 h-14 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest border border-slate-100"><Lock className="w-4 h-4" /> Bloqueado</div>
                          )}
                       </div>
                    </div>

                    {/* Pyramid Game Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 hover:border-emerald-200 transition-all flex flex-col group relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
                       <div className="relative z-10">
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6"><Binary className="w-8 h-8" /></div>
                          <h3 className="text-2xl font-black text-slate-800 mb-2">Pyramyx</h3>
                          <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">Suma y construye la pirámide numérica.</p>
                          {activeUnlocks.some(u => u.unlock_type === 'game' && u.unlock_key === 'Pyramid') ? (
                            <Button onClick={() => setActiveGame('Pyramid')} className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2"><Play className="w-4 h-4 fill-white" /> Jugar Ahora</Button>
                          ) : (
                            <div className="bg-slate-50 text-slate-400 h-14 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest border border-slate-100"><Lock className="w-4 h-4" /> Bloqueado</div>
                          )}
                       </div>
                    </div>

                    {/* Memory Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 hover:border-purple-200 transition-all flex flex-col group relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
                       <div className="relative z-10">
                          <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-6"><Puzzle className="w-8 h-8" /></div>
                          <h3 className="text-2xl font-black text-slate-800 mb-2">Memory Match</h3>
                          <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">Encuentra los pares y entrena tu memoria.</p>
                          {activeUnlocks.some(u => u.unlock_type === 'game' && u.unlock_key === 'Memory Match') ? (
                            <Button onClick={() => setActiveGame('Memory Match')} className="w-full h-14 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2"><Play className="w-4 h-4 fill-white" /> Jugar Ahora</Button>
                          ) : (
                            <div className="bg-slate-50 text-slate-400 h-14 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest border border-slate-100"><Lock className="w-4 h-4" /> Bloqueado</div>
                          )}
                       </div>
                    </div>

                    {/* Math Blitz */}
                    <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 hover:border-orange-200 transition-all flex flex-col group relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
                       <div className="relative z-10">
                          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6"><Zap className="w-8 h-8" /></div>
                          <h3 className="text-2xl font-black text-slate-800 mb-2">Math Blitz</h3>
                          <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">¡Cálculo mental contra reloj!</p>
                          {activeUnlocks.some(u => u.unlock_type === 'game' && u.unlock_key === 'Math Blitz') ? (
                            <Button onClick={() => setActiveGame('Math Blitz')} className="w-full h-14 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2"><Play className="w-4 h-4 fill-white" /> Jugar Ahora</Button>
                          ) : (
                            <div className="bg-slate-50 text-slate-400 h-14 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest border border-slate-100"><Lock className="w-4 h-4" /> Bloqueado</div>
                          )}
                       </div>
                    </div>
                  </div>
                </>
              )}
           </div>
        )}
      </div>

      {/* DNI Modal */}
      {showDniModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-sm p-12 shadow-2xl relative overflow-hidden animate-in zoom-in">
              <div className="text-center">
                 <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8"><ShieldCheck className="w-12 h-12" /></div>
                 <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Seguridad Notyx</h3>
                 <p className="text-slate-500 text-sm font-medium mb-10">Ingresa tu DNI para autorizar el canje de <span className="font-black text-orange-600">{selectedReward?.name}</span>.</p>
                 <input type="password" placeholder="Tu DNI aquí..." className={`w-full bg-slate-50 border-4 rounded-3xl px-8 py-5 font-black text-center text-2xl outline-none mb-6 transition-all ${dniError ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-orange-500'}`} value={dniInput} onChange={e => setDniInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmPurchase()} />
                 {dniError && <p className="text-red-500 text-xs font-black uppercase tracking-widest mb-6 animate-bounce">{dniError}</p>}
                 <div className="flex gap-4">
                    <Button onClick={confirmPurchase} disabled={purchasing === selectedReward?.id} className="flex-1 bg-orange-500 text-white h-16 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-500/20">Confirmar</Button>
                    <Button onClick={() => setShowDniModal(false)} variant="ghost" className="flex-1 text-slate-400 font-bold">Cerrar</Button>
                 </div>
              </div>
           </div>
        </div>
      )}
      {/* Skin Preview Modal */}
      {previewSkin && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-6" onClick={() => setPreviewSkin(null)}>
           <div className="w-full max-w-sm animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <div className="relative group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-[3rem] blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                 <StudentCard 
                    student={{
                       ...data,
                       name: data.student_name,
                       pct: overallPct,
                       gami: gami,
                       equipped_skin: previewSkin.name
                    }} 
                 />
              </div>
              <div className="mt-12 text-center space-y-6">
                 <div>
                    <h3 className="text-3xl font-black text-white tracking-tight mb-2">{previewSkin.name}</h3>
                    <p className="text-slate-400 font-medium">{previewSkin.description}</p>
                 </div>
                 <Button onClick={() => setPreviewSkin(null)} className="mx-auto bg-white/10 hover:bg-white/20 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest border border-white/10 transition-all">
                    Cerrar Vista Previa
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function Button({ children, className, onClick, disabled, variant = "solid" }) {
  return (
    <button disabled={disabled} onClick={onClick} className={`flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 hover:brightness-110 ${className}`}>
      {children}
    </button>
  );
}
