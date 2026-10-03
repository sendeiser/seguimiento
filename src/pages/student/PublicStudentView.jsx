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
  Brain, Puzzle, Sparkle, Binary, Hash, Zap, Timer, BarChart3, Lock, Eye, Camera, Upload, History, BookOpen
} from "lucide-react";
import confetti from "canvas-confetti";
import { calculateGamification, BADGE_DEFS } from "../../lib/gamificationEngine";
import StudentCard from "../../components/gamification/StudentCard";
import SudokuGame from "../../components/games/SudokuGame";
import PyramidGame from "../../components/games/PyramidGame";
import MemoryGame from "../../components/games/MemoryGame";
import MathBlitzGame from "../../components/games/MathBlitzGame";
import PokemonStoreTab from "../../components/pokemon/PokemonStoreTab";
import PokedexTab from "../../components/pokemon/PokedexTab";
import { ShopCard } from "../../components/shop/ShopCards";
import { RewardIcon } from "../../lib/skinThemes";
import ArenaHub from "../../components/arena/ArenaHub";

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
  const [activeShopTab, setActiveShopTab] = useState("rewards"); // rewards, pokemon, pokedex
  const [rewardCategory, setRewardCategory] = useState("all"); // all, skins, powerups, class

  const [classmates, setClassmates] = useState([]);
  const [minigameBonusCoins, setMinigameBonusCoins] = useState(0);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Increased interval to reduce load
    return () => clearInterval(interval);
  }, [token]);

  const spentOnRewards = data?.purchases?.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + (p.cost_coins || 0), 0) || 0;
  const spentOnPokemon = data?.pokemon?.reduce((sum, p) => sum + (p.cost_coins || 0), 0) || 0;
  const spentCoins = spentOnRewards + spentOnPokemon;
  const gami = data?.sessions ? calculateGamification(data.sessions, null, null, spentCoins, data.class_max_xp) : null;
  const totalNotyxCoins = Math.max(0, (gami?.notyxCoins || 0) + minigameBonusCoins);

  const fetchData = async () => {
    const { data: result, error: rpcError } = await supabase.rpc("get_student_live_data", { p_token: token });
    if (rpcError || result?.error) {
      setError(rpcError?.message || result?.error || "Link inválido.");
      setLoading(false);
      return;
    }

    setData(result);
    setLoading(false);

    // Fetch classmates for duels and rankings
    if (result.class_id) {
      const { data: cData } = await supabase
        .from("class_students")
        .select("id, student_name, avatar_url, house_id")
        .eq("class_id", result.class_id);
      setClassmates(cData || []);
    }

    // Fetch minigame bonus coins
    const { data: logs } = await supabase
      .from("student_minigame_logs")
      .select("reward_coins")
      .eq("class_student_id", result.cs_id);
    const bonus = (logs || []).reduce((sum, l) => sum + (l.reward_coins || 0), 0);
    setMinigameBonusCoins(bonus);
  };

  const handlePurchase = (reward) => {
    if (gami.notyxCoins < reward.cost_coins) return;
    setSelectedReward(reward);
    setDniInput("");
    setDniError("");
    setShowDniModal(true);
  };

  const handlePokemonPurchase = (pokemon) => {
    if (gami.notyxCoins < pokemon.cost_coins) return;
    setSelectedReward({ ...pokemon, isPokemon: true });
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

      if (selectedReward.isPokemon) {
        // Find the actual student_id (profile UUID) since class_student_id doesn't directly map to pokemon store if they don't have a profile yet.
        // But if they don't have a profile, they can't save pokemon globally. 
        // For now, we'll try to insert using an RPC to bypass RLS, or directly if allowed.
        const { error: rpcErr } = await supabase.rpc('buy_pokemon_public', { 
           p_cs_id: data.cs_id, 
           p_pokemon_id: selectedReward.id,
           p_pokemon_name: selectedReward.name,
           p_sprite_url: selectedReward.sprite,
           p_cost_coins: selectedReward.cost_coins
        });
        if (rpcErr) throw rpcErr;
      } else {
        const initialStatus = selectedReward.category === 'cosmetic' ? 'equipped' : 'pending';

        if (selectedReward.category === 'cosmetic') {
          const cosmeticIds = data.rewards.filter(r => r.category === 'cosmetic').map(r => r.id);
          await supabase.from("student_purchases").update({ status: 'purchased' }).eq('class_student_id', data.cs_id).in('reward_id', cosmeticIds);
        }

        await supabase.from("student_purchases").insert([{ class_student_id: data.cs_id, reward_id: selectedReward.id, status: initialStatus }]);
      }

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

      const { error: updateError } = await supabase.rpc("update_student_avatar", { 
        p_token: token, 
        p_avatar_url: publicUrl 
      });

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

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-inner"><XCircle className="w-10 h-10" /></div>
      <h2 className="text-2xl font-black text-slate-800 mb-2">¡Ups! Algo salió mal</h2>
      <p className="text-slate-500 font-medium mb-8 max-w-xs">{error}</p>
      <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20">Reintentar</button>
    </div>
  );

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center bg-slate-50 font-black">Cargando...</div>;

  const totalScore = data?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.score ?? 0), 0), 0);
  const maxTotal = data?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.max_score ?? 0), 0), 0);
  const overallPct = maxTotal > 0 ? totalScore / maxTotal : 0;

  const hasPhotoPower = data?.purchases?.some(p => {
    const reward = data?.rewards?.find(r => r.id === p.reward_id);
    return reward?.metadata?.type === 'custom_avatar';
  });

  const cosmetics = data?.rewards?.filter(r => r.category === 'cosmetic') || [];
  const powerups = data?.rewards?.filter(r => r.category === 'powerup') || [];
  const classRewards = data?.rewards?.filter(r => r.category === 'item' || r.category === 'game_pass') || [];

  const currentEquippedSkin = (() => {
    const equipped = data?.purchases?.find(p => p.status === 'equipped');
    if (!equipped) return null;
    return data?.rewards?.find(r => r.id === equipped.reward_id)?.name;
  })();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="sticky top-0 bg-white/95 backdrop-blur-2xl border-b border-slate-200/80 z-50 shadow-xs">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-3">
            {/* Left: Back button + Student Info */}
            <div className="flex items-center justify-between md:justify-start gap-2.5 min-w-0">
               <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                 <button
                   onClick={() => navigate(-1)}
                   className="p-1.5 sm:p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 shrink-0 active:scale-95 transition-all cursor-pointer"
                   title="Volver"
                 >
                   <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                 </button>
                 <div className="min-w-0">
                     <h1 className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight text-slate-900 truncate leading-tight">{data.class_name}</h1>
                     <p className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate leading-none mt-0.5">{data.student_name}</p>
                 </div>
               </div>
               
               {/* Mobile Coins Badge */}
               <div className="flex md:hidden items-center gap-1.5 bg-amber-50/80 border border-amber-200/70 px-2.5 py-1 rounded-xl shadow-2xs shrink-0">
                  <CoinsIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-amber-800 leading-none">{totalNotyxCoins}</span>
               </div>
            </div>
            
            {/* Center: Navigation Tabs - Apple Compact Segmented Control */}
            <div className="flex items-center justify-center">
              <div className="grid grid-cols-3 sm:flex items-center bg-slate-100/90 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 shadow-2xs w-full sm:w-auto">
                 <button
                   onClick={() => setActiveTab("progress")}
                   className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                     activeTab === 'progress' 
                       ? 'bg-white text-blue-600 shadow-xs' 
                       : 'text-slate-500 hover:text-slate-800'
                   }`}
                 >
                   <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                   <span>Progreso</span>
                 </button>
                 <button
                   onClick={() => setActiveTab("shop")}
                   className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                     activeTab === 'shop' 
                       ? 'bg-white text-orange-600 shadow-xs' 
                       : 'text-slate-500 hover:text-slate-800'
                   }`}
                 >
                   <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                   <span>Bazar</span>
                 </button>
                 <button
                   onClick={() => setActiveTab("games")}
                   className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                     activeTab === 'games' 
                       ? 'bg-white text-indigo-600 shadow-xs' 
                       : 'text-slate-500 hover:text-slate-800'
                   }`}
                 >
                   <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
                   <span>Arena</span>
                 </button>
              </div>
            </div>

            {/* Desktop Coins Badge */}
            <div className="hidden md:flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/70 px-3 py-1.5 rounded-xl shadow-2xs shrink-0">
               <CoinsIcon className="w-4 h-4 text-amber-500" />
               <span className="text-sm font-bold text-amber-800 leading-none">{totalNotyxCoins}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-5 sm:space-y-6">
        {activeTab === "progress" && (
          <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-500">
            <div className="apple-card rounded-2xl p-4 sm:p-6 overflow-hidden relative flex flex-col md:flex-row items-center gap-5 sm:gap-8 border border-slate-200/80 shadow-xs">
               <div className="w-[220px] sm:w-[240px] shrink-0 relative group">
                  <StudentCard 
                    student={{
                      name: data.student_name,
                      pct: overallPct,
                      gami: gami,
                      avatar_url: data.avatar_url,
                      equipped_skin: currentEquippedSkin
                    }}
                  />
                  {hasPhotoPower && (
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="absolute bottom-4 right-4 bg-white p-2.5 rounded-xl shadow-md border border-slate-200/80 hover:scale-105 active:scale-95 transition-all z-50 text-blue-600"
                    >
                      <Camera className="w-4 h-4" />
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </button>
                  )}
               </div>
               <div className="flex-1 w-full space-y-3.5 sm:space-y-4">
                  <div className="space-y-1 text-center md:text-left">
                     <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">Mi Perfil Notyx</h2>
                     <p className="text-slate-400 font-medium text-xs sm:text-sm">Tu rango actual es <span className="text-blue-600 font-semibold">{gami?.rank?.name || 'Hierro'}</span></p>
                  </div>
                  
                  {hasPhotoPower && !data.avatar_url && (
                    <div className="bg-blue-50/80 border border-blue-200/60 p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-left duration-300">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-xs shrink-0">
                        <Camera className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-blue-700 leading-none">¡Poder Desbloqueado!</p>
                        <p className="text-xs font-normal text-slate-600 truncate mt-0.5">Sube tu foto personalizada</p>
                      </div>
                      <button 
                        onClick={() => fileInputRef.current.click()}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
                      >
                        Subir
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="apple-card p-3.5 sm:p-4 rounded-xl border border-slate-200/70 shadow-2xs">
                      <span className="text-[11px] sm:text-xs font-semibold text-slate-400 block mb-0.5">Puntos XP</span>
                      <span className="text-xl sm:text-2xl font-extrabold text-blue-600 tracking-tight">{gami.currentXP}</span>
                    </div>
                    <div className="apple-card p-3.5 sm:p-4 rounded-xl border border-slate-200/70 shadow-2xs">
                      <span className="text-[11px] sm:text-xs font-semibold text-slate-400 block mb-0.5">Vitalidad</span>
                      <div className="flex items-center gap-2">
                         <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 fill-rose-500" />
                         <span className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">{gami.hp}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-500 px-1">
                      <span>Nivel {gami.currentLevel}</span>
                      <span>{gami.currentLevelXP} / {gami.nextLevelXP} XP</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700" style={{ width: `${(gami.currentLevelXP / gami.nextLevelXP) * 100}%` }} /></div>
                  </div>
               </div>
            </div>

            {/* Logros Section */}
            <div className="space-y-3 sm:space-y-4">
               <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                     <div className="bg-amber-100 p-1.5 sm:p-2 rounded-xl"><Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /></div>
                     <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">Mis Logros</h3>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                     {gami?.unlockedBadges?.filter(b => b.unlocked).length || 0} / {Object.keys(BADGE_DEFS).length} Desbloqueados
                  </span>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {Object.keys(BADGE_DEFS).map((key) => {
                    const badge = BADGE_DEFS[key];
                    const isUnlocked = gami?.unlockedBadges?.find(b => b.id === key)?.unlocked;
                    const BadgeIcon = { Star, Flame, Crown, TrendingUp, Heart, Sparkles, Flag, ShieldCheck }[badge.icon] || Star;
                    return (
                      <div 
                        key={key}
                        className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${
                          isUnlocked 
                            ? 'bg-gradient-to-br from-amber-50 to-yellow-100/80 border-amber-300 shadow-sm shadow-amber-500/10' 
                            : 'bg-white/80 border-slate-200/80 opacity-60'
                        }`}
                      >
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2.5 ${
                          isUnlocked ? 'bg-amber-500 text-white' : 'bg-slate-200 text-white'
                        }`}>
                          {isUnlocked ? <BadgeIcon className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                        </div>
                        <h4 className={`font-extrabold text-xs sm:text-sm mb-0.5 leading-snug ${isUnlocked ? 'text-amber-900' : 'text-slate-500'}`}>
                          {badge.label}
                        </h4>
                        <p className={`text-[10px] font-medium leading-tight ${isUnlocked ? 'text-amber-700' : 'text-slate-400'}`}>
                          {badge.req}
                        </p>
                        {isUnlocked && (
                          <div className="absolute top-2.5 right-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
               </div>
            </div>

            {/* Class History Section */}
            <div className="space-y-3 sm:space-y-4">
               <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                     <div className="bg-blue-100 p-1.5 sm:p-2 rounded-xl"><History className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /></div>
                     <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">Historial de Clases</h3>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">{data.sessions?.length || 0} Sesiones</span>
               </div>
               
               <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                     <table className="w-full text-sm border-collapse min-w-[500px] md:min-w-full">
                        <thead>
                           <tr className="border-b border-slate-200/80 bg-slate-50/50">
                              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Fecha</th>
                              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Asistencia</th>
                              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Rendimiento</th>
                              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-right text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Puntaje</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {data.sessions?.map((session, idx) => {
                              const sessTotal = session.criteria?.reduce((sum, c) => sum + (c.score || 0), 0) || 0;
                              const sessMax = session.criteria?.reduce((sum, c) => sum + (c.max_score || 0), 0) || 0;
                              const sessPct = sessMax > 0 ? (sessTotal / sessMax) * 100 : 0;
                              
                              return (
                                 <tr key={session.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                                       <span className="text-xs sm:text-sm font-bold text-slate-700">{format(new Date(session.date + "T12:00:00"), "d 'de' MMMM", { locale: es })}</span>
                                    </td>
                                    <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                                       {session.attendance ? (
                                          <span className="bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Presente</span>
                                       ) : (
                                          <span className="bg-rose-50 border border-rose-200/70 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Ausente</span>
                                       )}
                                    </td>
                                    <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                                       <div className="flex items-center gap-2 sm:gap-3">
                                          <div className="flex-1 h-1.5 w-16 sm:w-20 bg-slate-100 rounded-full overflow-hidden">
                                             <div className={`h-full rounded-full ${sessPct >= 80 ? 'bg-emerald-500' : sessPct >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${sessPct}%` }} />
                                          </div>
                                          <span className="text-[11px] font-bold text-slate-500">{Math.round(sessPct)}%</span>
                                       </div>
                                    </td>
                                    <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right">
                                       <span className="text-xs sm:text-sm font-extrabold text-slate-800">{sessTotal} / {sessMax}</span>
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
          <div className="space-y-4 sm:space-y-5 animate-in slide-up duration-300">
             {/* Unified Bazar Control Bar */}
             <div className="bg-white/95 backdrop-blur-md p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2">
                {/* Left: Sub-tabs (Premios / Pokémon / Pokedex) */}
                <div className="flex items-center justify-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
                   {[
                      { id: 'rewards', label: 'Premios', icon: <Trophy className="w-3.5 h-3.5" /> },
                      { id: 'pokemon', label: 'Tienda Pokémon', icon: <Sparkles className="w-3.5 h-3.5" /> },
                      { id: 'pokedex', label: 'Mi Pokedex', icon: <BookOpen className="w-3.5 h-3.5" /> }
                   ].map((tab) => (
                      <button
                         key={tab.id}
                         onClick={() => setActiveShopTab(tab.id)}
                         className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                            activeShopTab === tab.id 
                               ? 'bg-orange-500 text-white shadow-xs' 
                               : 'text-slate-500 hover:text-slate-800'
                         }`}
                      >
                         {tab.icon}
                         <span>{tab.label}</span>
                      </button>
                   ))}
                </div>

                {/* Right (when in rewards): Category filter pills */}
                {activeShopTab === "rewards" && (
                   <div className="flex items-center justify-center sm:justify-end gap-1 overflow-x-auto no-scrollbar pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5 shrink-0">Filtrar:</span>
                      {[
                         { id: 'all', label: 'Todo', icon: <ShoppingBag className="w-3 h-3" /> },
                         { id: 'skins', label: 'Skins', icon: <Sparkles className="w-3 h-3" /> },
                         { id: 'powerups', label: 'Poderes', icon: <Zap className="w-3 h-3" /> },
                         { id: 'class', label: 'Clase', icon: <Trophy className="w-3 h-3" /> }
                      ].map(cat => (
                         <button
                            key={cat.id}
                            onClick={() => setRewardCategory(cat.id)}
                            className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-bold text-xs transition-all cursor-pointer shrink-0 ${
                               rewardCategory === cat.id 
                                  ? 'bg-slate-900 text-white shadow-xs' 
                                  : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80'
                            }`}
                         >
                            {cat.icon}
                            <span>{cat.label}</span>
                         </button>
                      ))}
                   </div>
                )}
             </div>

             {activeShopTab === "rewards" && (
                <div className="space-y-5 sm:space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                   {/* Powerups Section */}
                   {(rewardCategory === 'all' || rewardCategory === 'powerups') && powerups.length > 0 && (
                      <div className="space-y-3 sm:space-y-4">
                         <div className="flex items-center gap-2.5 px-1">
                            <div className="bg-amber-100 p-1.5 sm:p-2 rounded-xl"><Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /></div>
                            <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">Superpoderes</h3>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {powerups.map(reward => {
                               const isBought = data.purchases?.some(p => p.reward_id === reward.id);
                               const canAfford = totalNotyxCoins >= reward.cost_coins;
                               return (
                                 <div key={reward.id} className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${isBought ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/80 hover:border-amber-300 shadow-2xs hover:shadow-xs'}`}>
                                    <div>
                                       <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 mb-3 shadow-2xs">
                                         <RewardIcon reward={reward} name={reward.name} icon={reward.icon} className="w-6 h-6 text-amber-600" textClassName="text-2xl" />
                                       </div>
                                       <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1">{reward.name}</h4>
                                       <p className="text-slate-500 text-xs sm:text-sm font-medium mb-4 leading-relaxed">{reward.description}</p>
                                    </div>
                                    <Button 
                                      disabled={isBought || !canAfford} 
                                      onClick={() => handlePurchase(reward)}
                                      className={`w-full h-10 sm:h-11 rounded-xl font-bold uppercase text-xs tracking-wider cursor-pointer ${isBought ? 'bg-amber-100 text-amber-800' : canAfford ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                       {isBought ? 'Desbloqueado' : <><CoinsIcon className="w-3.5 h-3.5 mr-1.5" /> {reward.cost_coins}</>}
                                    </Button>
                                 </div>
                               )
                            })}
                         </div>
                      </div>
                   )}

                   {/* Skins Section */}
                   {(rewardCategory === 'all' || rewardCategory === 'skins') && cosmetics.length > 0 && (
                      <div className="space-y-3 sm:space-y-4">
                         <div className="flex items-center gap-2.5 px-1">
                            <div className="bg-fuchsia-100 p-1.5 sm:p-2 rounded-xl"><Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-600" /></div>
                            <div>
                              <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">Temas Legendarios</h3>
                              <p className="text-[11px] text-slate-400 font-medium">Personalizá tu tarjeta de estudiante con efectos, halos y partículas animadas</p>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cosmetics.map(reward => {
                               const purchase = data.purchases?.find(p => p.reward_id === reward.id);
                               const isBought = !!purchase;
                               const isEquipped = purchase?.status === 'equipped';
                               const canAfford = totalNotyxCoins >= reward.cost_coins;

                               return (
                                 <ShopCard
                                   key={reward.id}
                                   reward={reward}
                                   purchase={purchase}
                                   isBought={isBought}
                                   isEquipped={isEquipped}
                                   notyxCoins={totalNotyxCoins}
                                   canAfford={canAfford}
                                   onPurchase={handlePurchase}
                                   onEquip={handleEquip}
                                   onPreview={setPreviewSkin}
                                   isLoading={purchasing === reward.id}
                                 />
                               );
                            })}
                         </div>
                      </div>
                   )}

                   {/* Class Rewards Section */}
                   {(rewardCategory === 'all' || rewardCategory === 'class') && classRewards.length > 0 && (
                      <div className="space-y-3 sm:space-y-4">
                         <div className="flex items-center gap-2.5 px-1">
                            <div className="bg-blue-100 p-1.5 sm:p-2 rounded-xl"><Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /></div>
                            <div>
                              <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">Premios de Clase</h3>
                              <p className="text-[11px] text-slate-400 font-medium">Recompensas especiales canjeables en el aula</p>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {classRewards.map(reward => {
                               const isBought = data.purchases?.some(p => p.reward_id === reward.id);
                               const canAfford = totalNotyxCoins >= reward.cost_coins;
                               return (
                                 <div key={reward.id} className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${isBought ? 'border-blue-300 bg-blue-50/20' : 'border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs'}`}>
                                    <div>
                                       <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 mb-3 shadow-2xs">
                                         <RewardIcon reward={reward} name={reward.name} icon={reward.icon} className="w-6 h-6 text-blue-600" textClassName="text-2xl" />
                                       </div>
                                       <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1">{reward.name}</h4>
                                       <p className="text-slate-500 text-xs sm:text-sm font-medium mb-4 leading-relaxed">{reward.description}</p>
                                    </div>
                                    <Button 
                                      disabled={isBought || !canAfford} 
                                      onClick={() => handlePurchase(reward)}
                                       className={`w-full h-10 sm:h-11 rounded-xl font-bold uppercase text-xs tracking-wider cursor-pointer ${isBought ? 'bg-blue-100 text-blue-800' : canAfford ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                       {isBought ? 'Adquirido' : <><CoinsIcon className="w-3.5 h-3.5 mr-1.5" /> {reward.cost_coins}</>}
                                    </Button>
                                 </div>
                               )
                            })}
                         </div>
                      </div>
                   )}
                </div>
             )}

             {activeShopTab === "pokemon" && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                   <PokemonStoreTab 
                     notyxCoins={totalNotyxCoins} 
                     onBuySuccess={fetchData} 
                     onBuyRequest={handlePokemonPurchase} 
                     ownedPokemonIds={data?.pokemon?.map(p => p.pokemon_id) || []}
                     classStudentId={data.cs_id}
                   />
                </div>
             )}

             {activeShopTab === "pokedex" && (
                 <div className="animate-in slide-in-from-bottom-4 duration-700">
                   <PokedexTab studentId={data.profile_id} classStudentId={data.cs_id} />
                 </div>
             )}
          </div>
        )}

        {activeTab === "games" && (
           <ArenaHub 
             classStudentId={data.cs_id}
             classId={data.class_id}
             studentName={data.student_name}
             avatarUrl={data.avatar_url}
             notyxCoins={totalNotyxCoins}
             studentsList={classmates}
             onRewardEarned={() => fetchData()}
           />
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
                 {dniError && <p className="text-red-500 text-xs font-black uppercase tracking-widest mb-6">{dniError}</p>}
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
