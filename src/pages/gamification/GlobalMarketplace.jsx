import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { ShoppingBag, Coins, ShoppingCart, CheckCircle2, Star, Clock, Shield, Sparkles, Eye, Gem, Search, Trophy } from "lucide-react";
import { calculateGamification } from "../../lib/gamificationEngine";
import StudentCard from "../../components/gamification/StudentCard";
import { ShopCard } from "../../components/shop/ShopCards";
import PokemonStoreTab from "../../components/pokemon/PokemonStoreTab";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../providers/ThemeProvider";

export default function GlobalMarketplace() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = false;
  const [rewards, setRewards] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [notyxCoins, setNotyxCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewSkin, setPreviewSkin] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("rewards");
  const [rewardCategory, setRewardCategory] = useState("all"); // all, skins, class
  const [rewardSearchTerm, setRewardSearchTerm] = useState("");
  const [classStudentId, setClassStudentId] = useState(null);

  useEffect(() => {
    if (profile && profile.role !== 'student' && profile.role !== 'teacher') {
      navigate('/home');
      return;
    }
    fetchData();
  }, [profile]);

  const handleUpdateSkinPrice = async (reward, newPrice) => {
    try {
      const { error } = await supabase
        .from("rewards")
        .update({ cost_coins: newPrice })
        .eq("id", reward.id);
      if (error) throw error;
      toast(`Precio de "${reward.name}" actualizado a ${newPrice} Coins.`, "success");
      setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, cost_coins: newPrice } : r));
      if (previewSkin && previewSkin.id === reward.id) {
        setPreviewSkin(prev => ({ ...prev, cost_coins: newPrice }));
      }
    } catch (err) {
      console.error("Error updating skin price:", err);
      toast("Error al actualizar el precio.", "error");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: userProf } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setUserProfile(userProf || profile);

      const isTeacher = (userProf?.role || profile?.role) === 'teacher';

      const { data: classStudents } = await supabase.from("class_students").select("id, class_id").eq("student_id", user.id);
      let classIds = classStudents?.map(cs => cs.class_id) || [];
      if (classStudents && classStudents.length > 0) {
        setClassStudentId(classStudents[0].id);
      }

      if (isTeacher) {
        const { data: teacherClasses } = await supabase.from("classes").select("id").eq("teacher_id", user.id);
        if (teacherClasses && teacherClasses.length > 0) {
          classIds = [...new Set([...classIds, ...teacherClasses.map(c => c.id)])];
        }
      }

      const [
        { data: allRwData, error: rwError },
        { data: pData },
        { data: sData },
        { data: gData },
        { data: aData },
        { data: pokemonData }
      ] = await Promise.all([
        supabase.from("rewards").select("*, classes(name)"),
        supabase.from("student_purchases").select("*, rewards(cost_coins, category)").eq("student_id", user.id).neq("status", "cancelled"),
        classIds.length > 0 ? supabase.from("sessions").select("id, date, session_criteria(id, name, max_score)").in("class_id", classIds) : Promise.resolve({ data: [] }),
        supabase.from("grades").select("criteria_id, score").eq("student_id", user.id),
        supabase.from("attendance").select("session_id, is_present").eq("student_id", user.id),
        supabase.from("student_pokemon_store").select("cost_coins").eq("student_id", user.id)
      ]);

      if (rwError) console.error("Error fetching rewards:", rwError);

      const filteredRewards = (allRwData || []).filter(r => 
        r.category === 'cosmetic' || (r.class_id && classIds.includes(r.class_id))
      );

      setRewards(filteredRewards);
      setMyPurchases(pData || []);

      const gradesMap = gData?.reduce((acc, curr) => { acc[curr.criteria_id] = curr.score; return acc; }, {}) || {};
      const attMap = aData?.reduce((acc, curr) => { acc[curr.session_id] = curr.is_present; return acc; }, {}) || {};
      
      const spentOnPokemon = (pokemonData || []).reduce((acc, curr) => acc + (curr.cost_coins || 0), 0);
      const spentCoins = (pData?.reduce((acc, curr) => acc + (curr.rewards?.cost_coins || 0), 0) || 0) + spentOnPokemon;

      const gami = calculateGamification(sData?.map(s => ({...s, criteria: s.session_criteria || []})) || [], gradesMap, attMap, spentCoins);
      setNotyxCoins(gami.notyxCoins || 0);

      setLoading(false);
    } catch (err) {
      console.error("GlobalMarketplace fetchData error:", err);
      setLoading(false);
    }
  };

  const handleBuy = async (reward) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (notyxCoins < reward.cost_coins) {
       toast("No tienes suficientes Notyx Coins.", "warning");
       return;
    }
    
    if (myPurchases.some(p => p.reward_id === reward.id)) {
       toast("Ya compraste este artículo.", "info");
       return;
    }

    const initialStatus = reward.category === 'cosmetic' ? 'equipped' : 'pending';

    if (reward.category === 'cosmetic') {
      const cosmeticIds = rewards.filter(r => r.category === 'cosmetic').map(r => r.id);
      if (cosmeticIds.length > 0) {
        await supabase.from("student_purchases")
          .update({ status: 'purchased' })
          .eq('student_id', user.id)
          .in('reward_id', cosmeticIds);
      }
    }

    const { error } = await supabase.from("student_purchases").insert({
       student_id: user.id,
       reward_id: reward.id,
       status: initialStatus
    });

    if (!error) {
       if (reward.category === 'cosmetic') {
         toast("¡Skin desbloqueada y equipada con éxito!", "success");
       } else {
         toast("¡Compra exitosa! El profesor te lo entregará pronto.", "success");
       }
       fetchData();
    }
  };

  const handleEquip = async (reward) => {
    const { data: { user } } = await supabase.auth.getUser();
    const cosmeticIds = rewards.filter(r => r.category === 'cosmetic').map(r => r.id);
    if (cosmeticIds.length > 0) {
      await supabase.from("student_purchases")
        .update({ status: 'purchased' })
        .eq('student_id', user.id)
        .in('reward_id', cosmeticIds);
    }

    await supabase.from("student_purchases")
      .update({ status: 'equipped' })
      .eq('student_id', user.id)
      .eq('reward_id', reward.id);

    fetchData();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-xl animate-pulse bg-indigo-500/20" />
        <div className="w-12 h-12 rounded-full animate-spin border-3 border-indigo-200 border-t-indigo-600" />
      </div>
    </div>
  );

  const classRewards = rewards.filter(r => r.category !== 'cosmetic');
  const cosmetics = rewards.filter(r => r.category === 'cosmetic');

  const glassCard = "card-glass-soft";
  const glassButton = "glass-btn";

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-30 animate-pulse" style={{ background: 'radial-gradient(circle, hsl(262 83% 60% / 0.12), transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, hsl(185 85% 60% / 0.1), transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, hsl(270 70% 65% / 0.1), transparent 70%)' }} />
      </div>

      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl blur-xl animate-pulse bg-amber-400/30" />
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/25">
                  <ShoppingBag className="w-7 h-7 text-white" />
                </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-['Outfit'] font-black tracking-tight text-slate-900">
                Bazar Estudiantil
              </h1>
            </div>
            <p className="font-['DM_Sans'] font-medium text-slate-500">
              Personaliza tu leyenda con skins exclusivas.
            </p>
            {profile?.role === 'teacher' && (
              <div className="inline-flex items-center gap-2 mt-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-['Outfit'] font-black uppercase tracking-wider shadow-sm">
                <Shield className="w-3.5 h-3.5 text-amber-600" /> Modo Docente: Puedes modificar los precios de las skins
              </div>
            )}
          </div>
          
          {/* Coins Balance */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="p-1 rounded-[1.5rem] bg-white border border-slate-200/80 shadow-md shadow-slate-200/50">
              <div className="flex items-center gap-4 px-6 py-4 rounded-[1.25rem]">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl blur-md animate-pulse bg-amber-400/30" />
                  <div className="relative p-2.5 rounded-xl bg-amber-50 border border-amber-200/80">
                    <Coins className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
                  </div>
                </div>
                <div>
                  <span className="font-['DM_Sans'] font-bold text-[10px] uppercase tracking-widest block text-slate-400">Saldo Notyx</span>
                  <span className="text-3xl md:text-4xl font-['Outfit'] font-black text-amber-500">
                    {notyxCoins}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex justify-center max-w-full overflow-x-auto pb-2">
          <div className="inline-flex p-1.5 sm:p-2 rounded-[2rem] border border-slate-200/80 bg-white shadow-md shadow-slate-200/30 shrink-0">
            {[
              { id: 'rewards', label: 'Bazar Estudiantil', icon: <ShoppingBag className="w-4 h-4" /> },
              { id: 'pokemon', label: 'Tienda Pokémon', icon: <Sparkles className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-8 py-4 rounded-[1.5rem] font-['Outfit'] font-bold text-sm transition-all duration-300 cursor-pointer ${
                  activeSubTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

         {activeSubTab === "rewards" && (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
               {/* Reward Category Filters */}
               <div className="flex flex-wrap gap-2 justify-center">
                  {[
                     { id: 'all', label: 'Todo', icon: <ShoppingBag className="w-4 h-4" /> },
                     { id: 'skins', label: 'Skins', icon: <Sparkles className="w-4 h-4" /> },
                     { id: 'class', label: 'Botín Local', icon: <Trophy className="w-4 h-4" /> }
                  ].map(cat => (
                     <button
                        key={cat.id}
                        onClick={() => setRewardCategory(cat.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-['Outfit'] font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${
                           rewardCategory === cat.id 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-sm hover:bg-slate-50'
                        }`}
                     >
                        {cat.icon}
                        {cat.label}
                     </button>
                  ))}
               </div>

               {/* Search Bar */}
               <div className="max-w-md mx-auto w-full px-4">
                  <div className="relative group">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors text-slate-400 group-focus-within:text-indigo-600" />
                     <input 
                        type="text" 
                        placeholder="Buscar premios, skins o botín..." 
                        value={rewardSearchTerm}
                        onChange={(e) => setRewardSearchTerm(e.target.value)}
                        className="w-full h-12 pl-12 pr-6 rounded-2xl text-sm font-medium outline-none transition-all bg-white border-2 border-slate-200 focus:border-indigo-500 text-slate-900 shadow-sm placeholder:text-slate-400"
                     />
                  </div>
               </div>

               {/* Preview Section */}
               {previewSkin && (
                  <div className="p-6 md:p-10 rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:scale-[1.01] bg-white border border-slate-200 shadow-xl shadow-slate-200/40">
                  {/* Glow Background */}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30" />

                  <div className="absolute top-0 left-0 right-0 h-1.5" style={{
                     background: 'linear-gradient(90deg, hsl(262 83% 60%), hsl(185 85% 60%), hsl(270 70% 65%), hsl(262 83% 60%))',
                     backgroundSize: '200% 100%',
                     animation: 'gradient-shift 3s ease infinite'
                  }} />

                  <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                     <div className="shrink-0 transform hover:scale-105 transition-transform duration-500">
                        <StudentCard 
                           student={{
                           name: userProfile?.full_name || "Tu Nombre",
                           pct: 0.85,
                           gami: { currentLevel: 10, streak: 5, hp: 100, MAX_HP: 100, currentLevelXP: 450, nextLevelXP: 1000, rank: { name: "Oro" } },
                           equipped_skin: previewSkin.name
                           }}
                           isPinned={false}
                           isTop3={false}
                        />
                     </div>

                     <div className="flex-1 text-center md:text-left space-y-5">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-200/60">
                           <Sparkles className="w-4 h-4 text-purple-600" />
                           <span className="font-['DM_Sans'] font-bold text-xs uppercase tracking-widest text-purple-700">Vista Previa</span>
                        </div>
                        
                        <h2 className="text-3xl md:text-5xl font-['Outfit'] font-black text-slate-900">
                           {previewSkin.name}
                        </h2>
                        <p className="font-['DM_Sans'] font-medium text-base max-w-xl text-slate-600">
                           {previewSkin.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                           {profile?.role === 'teacher' ? (
                             <div className="flex flex-wrap items-center gap-3">
                               <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-2xl border border-amber-300 shadow-sm">
                                 <Coins className="w-5 h-5 text-amber-500" />
                                 <input
                                   type="number"
                                   min="0"
                                   step="50"
                                   value={previewSkin.cost_coins}
                                   onChange={(e) => {
                                     const val = Math.max(0, parseInt(e.target.value) || 0);
                                     setPreviewSkin(prev => ({ ...prev, cost_coins: val }));
                                   }}
                                   className="w-24 font-['Outfit'] font-black text-lg text-amber-600 bg-transparent outline-none"
                                 />
                                 <span className="font-bold text-xs text-slate-400">Coins</span>
                               </div>
                               <Button 
                                 onClick={() => handleUpdateSkinPrice(previewSkin, previewSkin.cost_coins)}
                                 className="h-14 px-8 rounded-2xl font-['DM_Sans'] font-bold uppercase tracking-wider flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-transform hover:scale-105 cursor-pointer"
                               >
                                 <CheckCircle2 className="w-5 h-5" /> Guardar Precio
                               </Button>
                               <Button 
                                 variant="secondary"
                                 onClick={() => setPreviewSkin(null)}
                                 className="h-14 px-8 rounded-2xl font-['DM_Sans'] font-bold uppercase tracking-wider transition-all hover:scale-105 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                               >
                                 Cerrar
                               </Button>
                             </div>
                           ) : (
                             <>
                               <Button 
                                 onClick={() => handleBuy(previewSkin)}
                                 className="h-14 px-8 rounded-2xl font-['DM_Sans'] font-bold uppercase tracking-wider flex items-center gap-3 transition-all hover:scale-105 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 cursor-pointer"
                               >
                                 <ShoppingCart className="w-5 h-5" /> Comprar por {previewSkin.cost_coins}
                               </Button>
                               <Button 
                                 variant="secondary"
                                 onClick={() => setPreviewSkin(null)}
                                 className="h-14 px-8 rounded-2xl font-['DM_Sans'] font-bold uppercase tracking-wider transition-all hover:scale-105 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                               >
                                 Cerrar
                               </Button>
                             </>
                           )}
                        </div>
                     </div>
                  </div>
                  </div>
               )}

               {/* Skins Legendarias Section */}
               {(rewardCategory === 'all' || rewardCategory === 'skins') && (
                 <div className="space-y-8">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <div className="relative">
                         <div className="absolute inset-0 rounded-xl blur-md animate-pulse bg-purple-500/25" />
                         <div className="relative p-3 rounded-xl bg-purple-50 border border-purple-200/80 shadow-sm">
                            <Star className="w-6 h-6 text-purple-600" />
                         </div>
                       </div>
                       <h2 className="text-2xl md:text-3xl font-['Outfit'] font-black text-slate-900">
                          Skins Legendarias
                       </h2>
                     </div>
                     <span className="font-['DM_Sans'] font-bold text-xs uppercase tracking-widest px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm">
                        {cosmetics.length} Disponibles
                     </span>
                   </div>
                   
                   {cosmetics.length === 0 ? (
                     <div className="py-20 text-center rounded-[2.5rem] bg-white border border-slate-200/80 shadow-md">
                        <div className="relative inline-block mb-6">
                           <div className="absolute inset-0 rounded-[3rem] blur-xl animate-pulse bg-fuchsia-400/20" />
                           <div className="relative w-20 h-20 rounded-[3rem] flex items-center justify-center bg-fuchsia-50 border border-fuchsia-200">
                              <Sparkles className="w-10 h-10 text-fuchsia-500" />
                           </div>
                        </div>
                        <h3 className="text-xl font-black text-slate-700">Próximamente...</h3>
                        <p className="text-slate-500 mt-2">Estamos forjando nuevas skins épicas.</p>
                     </div>
                   ) : (
                     <>
                       {rewards.filter(r => r.category === 'cosmetic' && r.name.toLowerCase().includes(rewardSearchTerm.toLowerCase())).length === 0 ? (
                          <div className="py-12 text-center text-slate-400 font-medium italic">No se encontraron skins que coincidan</div>
                       ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {rewards.filter(r => r.category === 'cosmetic' && r.name.toLowerCase().includes(rewardSearchTerm.toLowerCase())).map((reward) => (
                               <ShopCard
                                  key={reward.id}
                                  reward={reward}
                                  isBought={myPurchases.some(p => p.reward_id === reward.id)}
                                  isEquipped={myPurchases.find(p => p.reward_id === reward.id)?.status === 'equipped'}
                                  notyxCoins={notyxCoins}
                                  isDark={false}
                                  isTeacher={profile?.role === 'teacher'}
                                  onEditPrice={handleUpdateSkinPrice}
                                  onBuy={() => handleBuy(reward)}
                                  onEquip={() => handleEquip(reward)}
                                  onPreview={() => setPreviewSkin(reward)}
                               />
                            ))}
                         </div>
                       )}
                     </>
                   )}
                 </div>
               )}
  
               {/* Botín de Clase Section */}
               {(rewardCategory === 'all' || rewardCategory === 'class') && (
                 <div className="space-y-8 pt-8 border-t border-slate-200/80">
                   <div className="flex items-center gap-4">
                     <div className="relative">
                        <div className="absolute inset-0 rounded-xl blur-md animate-pulse bg-sky-500/25" />
                        <div className="relative p-3 rounded-xl bg-sky-50 border border-sky-200/80 shadow-sm">
                           <Trophy className="w-6 h-6 text-sky-600" />
                        </div>
                     </div>
                     <h2 className="text-2xl md:text-3xl font-['Outfit'] font-black text-slate-900">
                        Botín de Clase
                     </h2>
                   </div>
  
                   {classRewards.length === 0 ? (
                     <div className="py-24 text-center rounded-[2.5rem] bg-white border border-slate-200/80 shadow-md">
                        <div className="relative inline-block mb-6">
                           <div className="absolute inset-0 rounded-[3rem] blur-xl animate-pulse bg-sky-400/20" />
                           <div className="relative w-20 h-20 rounded-[3rem] flex items-center justify-center bg-sky-50 border border-sky-200">
                              <Shield className="w-10 h-10 text-sky-500" />
                           </div>
                        </div>
                        <h3 className="font-['Outfit'] font-black text-2xl text-slate-700">Sin premios locales</h3>
                        <p className="font-['DM_Sans'] font-medium mt-2 max-w-xs mx-auto text-slate-500">Espera a que tus profesores activen el botín exclusivo para esta clase.</p>
                     </div>
                   ) : (
                     <>
                       {rewards.filter(r => r.category !== 'cosmetic' && r.name.toLowerCase().includes(rewardSearchTerm.toLowerCase())).length === 0 ? (
                          <div className="py-12 text-center text-slate-400 font-medium italic">No se encontró botín que coincidan</div>
                       ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {rewards.filter(r => r.category !== 'cosmetic' && r.name.toLowerCase().includes(rewardSearchTerm.toLowerCase())).map((reward) => (
                               <ShopCard
                                  key={reward.id}
                                  reward={reward}
                                  isBought={myPurchases.some(p => p.reward_id === reward.id)}
                                  isEquipped={myPurchases.find(p => p.reward_id === reward.id)?.status === 'equipped'}
                                  notyxCoins={notyxCoins}
                                  isDark={false}
                                  isTeacher={profile?.role === 'teacher'}
                                  onEditPrice={handleUpdateSkinPrice}
                                  onBuy={() => handleBuy(reward)}
                                  onEquip={() => handleEquip(reward)}
                                  onPreview={() => setPreviewSkin(reward)}
                               />
                            ))}
                         </div>
                       )}
                     </>
                   )}
                 </div>
               )}
            </div>
         )}

         {activeSubTab === "pokemon" && (
            <div className="animate-in slide-in-from-bottom-4 duration-700">
               <PokemonStoreTab 
                 notyxCoins={notyxCoins} 
                 onBuySuccess={() => fetchData()} 
                 classStudentId={classStudentId} 
                 isTeacher={profile?.role === 'teacher' || userProfile?.role === 'teacher'}
                 isDark={false}
               />
            </div>
         )}
      </div>

      <style>{`
        @keyframes gradient-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
      `}</style>
    </div>
  );
}