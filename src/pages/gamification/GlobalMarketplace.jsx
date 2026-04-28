import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ShoppingBag, Coins, ShoppingCart, CheckCircle2, Star, Clock, Shield, Sparkles, Eye } from "lucide-react";
import { calculateGamification } from "../../lib/gamificationEngine";
import StudentCard from "../../components/gamification/StudentCard";
import { useAuth } from "../../providers/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function GlobalMarketplace() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [notyxCoins, setNotyxCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewSkin, setPreviewSkin] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (profile && profile.role !== 'student') {
      navigate('/home');
      return;
    }
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile to get name for preview
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setUserProfile(profile);

      // Fetch class associations to get class-specific rewards
      const { data: classStudents } = await supabase.from("class_students").select("class_id").eq("student_id", user.id);
      const classIds = classStudents?.map(cs => cs.class_id) || [];

      // Fetch rewards, grades, attendance, and purchases
      // We merge all rewards into one query to be safer
      const [
        { data: allRwData, error: rwError },
        { data: pData },
        { data: sData },
        { data: gData },
        { data: aData }
      ] = await Promise.all([
        supabase.from("rewards").select("*, classes(name)"),
        supabase.from("student_purchases").select("*, rewards(cost_coins, category)").eq("student_id", user.id).neq("status", "cancelled"),
        classIds.length > 0 ? supabase.from("sessions").select("id, date, session_criteria(id, name, max_score)").in("class_id", classIds) : Promise.resolve({ data: [] }),
        supabase.from("grades").select("criteria_id, score").eq("student_id", user.id),
        supabase.from("attendance").select("session_id, is_present").eq("student_id", user.id)
      ]);

      if (rwError) console.error("Error fetching rewards:", rwError);

      // Filter rewards: global cosmetics OR rewards in my classes
      const filteredRewards = (allRwData || []).filter(r => 
        r.category === 'cosmetic' || (r.class_id && classIds.includes(r.class_id))
      );

      setRewards(filteredRewards);
      setMyPurchases(pData || []);

      const gradesMap = gData?.reduce((acc, curr) => { acc[curr.criteria_id] = curr.score; return acc; }, {}) || {};
      const attMap = aData?.reduce((acc, curr) => { acc[curr.session_id] = curr.is_present; return acc; }, {}) || {};
      const spentCoins = pData?.reduce((acc, curr) => acc + (curr.rewards?.cost_coins || 0), 0) || 0;

      const gami = calculateGamification(sData?.map(s => ({...s, criteria: s.session_criteria || []})) || [], gradesMap, attMap, spentCoins);
      setNotyxCoins(gami.notyxCoins);

      setLoading(false);
    } catch (err) {
      console.error("GlobalMarketplace fetchData error:", err);
      setLoading(false);
    }
  };

  const handleBuy = async (reward) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (notyxCoins < reward.cost_coins) {
       alert("No tienes suficientes Notyx Coins.");
       return;
    }
    
    if (myPurchases.some(p => p.reward_id === reward.id)) {
       alert("Ya compraste este artículo.");
       return;
    }

    const initialStatus = reward.category === 'cosmetic' ? 'equipped' : 'pending';

    // If cosmetic, unequip others first
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
         alert("¡Skin desbloqueada y equipada con éxito!");
       } else {
         alert("¡Compra exitosa! El profesor te lo entregará pronto.");
       }
       fetchData();
    }
  };

  const handleEquip = async (reward) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Unequip others
    const cosmeticIds = rewards.filter(r => r.category === 'cosmetic').map(r => r.id);
    if (cosmeticIds.length > 0) {
      await supabase.from("student_purchases")
        .update({ status: 'purchased' })
        .eq('student_id', user.id)
        .in('reward_id', cosmeticIds);
    }

    // Equip selected
    await supabase.from("student_purchases")
      .update({ status: 'equipped' })
      .eq('student_id', user.id)
      .eq('reward_id', reward.id);

    fetchData();
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="font-black text-slate-800 animate-pulse uppercase tracking-widest text-sm">Cargando el Mercado Notyx...</p>
    </div>
  );

  const classRewards = rewards.filter(r => r.category !== 'cosmetic');
  const cosmetics = rewards.filter(r => r.category === 'cosmetic');

  return (
    <div className="space-y-16 animate-in fade-in duration-1000 pb-20 relative">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-fuchsia-400/5 rounded-full blur-[100px]" />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
        <div className="text-center lg:text-left">
           <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
             <div className="bg-yellow-400 p-2 rounded-xl shadow-lg shadow-yellow-400/20">
               <ShoppingBag className="w-6 h-6 text-yellow-900" />
             </div>
             <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">Bazar Notyx</h1>
           </div>
           <p className="text-slate-500 font-medium text-base md:text-lg">Personaliza tu leyenda con skins exclusivas.</p>
        </div>
        
        <div className="flex items-center justify-center lg:justify-end gap-4 w-full lg:w-auto">
          <div className="bg-white border-2 border-slate-100 p-5 md:p-6 rounded-[28px] md:rounded-[32px] flex items-center gap-4 shadow-xl shadow-slate-200/40 w-full md:min-w-[240px]">
             <div className="bg-yellow-100 p-3 rounded-2xl flex items-center justify-center shrink-0">
                <Coins className="w-6 h-6 md:w-8 md:h-8 text-yellow-600 animate-bounce" />
             </div>
             <div className="min-w-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Saldo Notyx</span>
                <span className="text-3xl md:text-4xl font-black text-slate-900 leading-none">
                   {notyxCoins}
                </span>
             </div>
          </div>
        </div>
      </div>

      {/* --- PREVIEW SECTION --- */}
      {previewSkin && (
        <div className="bg-slate-900 rounded-[32px] md:rounded-[48px] p-6 md:p-12 text-white flex flex-col md:flex-row items-center gap-10 md:gap-12 animate-in zoom-in-95 duration-500 shadow-2xl shadow-slate-900/40 border border-slate-800 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-fuchsia-600/10 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="w-[240px] md:w-[280px] shrink-0 transform hover:scale-105 transition-transform duration-500">
            <StudentCard 
              student={{
                name: userProfile?.full_name || "Tu Nombre",
                pct: 0.85, // Show as Full Art in preview
                gami: { currentLevel: 10, streak: 5, hp: 100, MAX_HP: 100, currentLevelXP: 450, nextLevelXP: 1000, rank: { name: "Oro" } },
                equipped_skin: previewSkin.name
              }}
              isPinned={false}
              isTop3={false}
            />
          </div>

          <div className="flex-1 space-y-6 relative z-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-fuchsia-500/20 text-fuchsia-300 px-4 py-2 rounded-full border border-fuchsia-500/30 text-xs font-black uppercase tracking-widest mb-2">
              <Sparkles className="w-4 h-4" /> Vista Previa de Skin
            </div>
             <h2 className="text-3xl md:text-5xl font-black tracking-tight">{previewSkin.name}</h2>
            <p className="text-slate-400 text-base md:text-lg leading-relaxed max-w-xl">{previewSkin.description}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <Button 
                onClick={() => handleBuy(previewSkin)}
                className="h-16 px-10 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black uppercase tracking-widest shadow-xl shadow-yellow-400/20 flex items-center gap-3"
              >
                <ShoppingCart className="w-6 h-6" /> Comprar por {previewSkin.cost_coins}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setPreviewSkin(null)}
                className="h-16 px-10 rounded-2xl border-2 border-white/10 hover:bg-white/5 text-white font-black uppercase tracking-widest"
              >
                Cerrar Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Seccion: Cosméticos Globales */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-fuchsia-100 p-3 rounded-2xl">
              <Star className="w-6 h-6 text-fuchsia-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Skins Legendarias</h2>
          </div>
          <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">{cosmetics.length} Disponibles</span>
        </div>
        
        {cosmetics.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-100 shadow-inner">
             <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Próximamente...</h3>
             <p className="text-slate-400 mt-2 font-medium">Estamos forjando nuevas skins épicas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {cosmetics.map(reward => {
                const purchase = myPurchases.find(p => p.reward_id === reward.id);
                const isBought = !!purchase;
                const isEquipped = purchase?.status === 'equipped';
                const canAfford = notyxCoins >= reward.cost_coins;

                return (
                  <div key={reward.id} className={`bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 border shadow-xl hover:shadow-2xl transition-all group flex flex-col h-full relative overflow-hidden ${isEquipped ? 'border-fuchsia-400 ring-4 ring-fuchsia-100' : 'border-slate-100'}`}>
                    {isEquipped && <div className="absolute top-0 right-0 bg-fuchsia-500 text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-bl-2xl z-10">Equipada</div>}
                    
                    <div className="relative mb-6">
                      <div className="bg-slate-900 w-16 h-16 rounded-[28px] flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                          {reward.icon || '✨'}
                      </div>
                      <button 
                        onClick={() => setPreviewSkin(reward)}
                        className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-blue-600 p-2 rounded-full border border-slate-100 shadow-md transition-all hover:scale-110 active:scale-95"
                        title="Ver Vista Previa"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>

                    <h3 className="font-black text-2xl text-slate-900 leading-tight mb-2 truncate">{reward.name}</h3>
                    <p className="text-[10px] font-black text-fuchsia-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-1">
                        Cosmético Global
                    </p>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 flex-1">{reward.description}</p>
                    
                    <div className="space-y-4">
                        {!isBought && (
                          <div className="flex items-center justify-between px-2 mb-2">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Coste</span>
                            <span className="text-xl font-black text-slate-900 flex items-center gap-1">
                                <Coins className="w-4 h-4 text-yellow-500" /> {reward.cost_coins}
                            </span>
                          </div>
                        )}
                        
                        {isEquipped ? (
                          <Button disabled className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-fuchsia-100 text-fuchsia-700 border-none">
                            Equipada
                          </Button>
                        ) : isBought ? (
                          <Button 
                            onClick={() => handleEquip(reward)}
                            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20"
                          >
                            Equipar Skin
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => handleBuy(reward)}
                            disabled={!canAfford}
                            className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all ${
                              canAfford 
                              ? 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-yellow-950 shadow-yellow-400/20' 
                              : 'bg-slate-100 text-slate-400 border-none'
                            }`}
                          >
                            <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Comprar Skin</span>
                          </Button>
                        )}
                    </div>
                  </div>
                );
            })}
          </div>
        )}
      </div>

      {/* Seccion: Premios de Clase */}
      <div className="space-y-8 pt-8 border-t-4 border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-2xl">
            <ShoppingBag className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Botín de Clase</h2>
        </div>

        {classRewards.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[48px] border-4 border-dashed border-slate-50 flex flex-col items-center">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
               <Shield className="w-10 h-10 text-slate-200" />
             </div>
             <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tighter">Sin premios locales</h3>
             <p className="text-slate-400 mt-2 font-medium max-w-xs mx-auto">Espera a que tus profesores activen el botín exclusivo para esta clase.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             {classRewards.map(reward => {
                const purchase = myPurchases.find(p => p.reward_id === reward.id);
                const isBought = !!purchase;
                const isPending = purchase?.status === 'pending';
                const canAfford = notyxCoins >= reward.cost_coins;

                return (
                  <div key={reward.id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl hover:shadow-2xl transition-all group flex flex-col h-full border-b-8 border-b-blue-100 hover:border-b-blue-200">
                     <div className="bg-blue-50/50 w-16 h-16 rounded-[28px] flex items-center justify-center text-4xl mb-6 shadow-inner group-hover:bg-blue-50 group-hover:scale-110 transition-all duration-500">
                        {reward.icon || '🎁'}
                     </div>
                     <h3 className="font-black text-2xl text-slate-900 leading-tight mb-2 truncate">{reward.name}</h3>
                     <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {reward.classes?.name || "Clase"}
                     </p>
                     <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 flex-1">{reward.description}</p>
                     
                     <div className="space-y-4">
                        <div className="flex items-center justify-between px-2 mb-2">
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Precio</span>
                           <span className="text-xl font-black text-slate-900 flex items-center gap-1">
                              <Coins className="w-4 h-4 text-yellow-500" /> {reward.cost_coins}
                           </span>
                        </div>
                        
                        <Button 
                          onClick={() => handleBuy(reward)}
                          disabled={isBought || !canAfford}
                          className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all ${
                            isBought 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none' 
                            : canAfford 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20' 
                            : 'bg-slate-100 text-slate-400 border-none'
                          }`}
                        >
                          {isPending ? (
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Pendiente</span>
                          ) : isBought ? (
                            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Comprado</span>
                          ) : (
                            <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Canjear</span>
                          )}
                        </Button>
                     </div>
                  </div>
                );
             })}
          </div>
        )}
      </div>
    </div>
  );
}
