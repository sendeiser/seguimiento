import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { ShoppingBag, Coins, ShoppingCart, CheckCircle2, Star, Clock, Shield, Sparkles, Eye, Gem } from "lucide-react";
import { calculateGamification } from "../../lib/gamificationEngine";
import StudentCard from "../../components/gamification/StudentCard";
import { ShopCard } from "../../components/shop/ShopCards";
import { useAuth } from "../../providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../providers/ThemeProvider";

export default function GlobalMarketplace() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setUserProfile(profile);

      const { data: classStudents } = await supabase.from("class_students").select("class_id").eq("student_id", user.id);
      const classIds = classStudents?.map(cs => cs.class_id) || [];

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: isDark ? 'hsl(220 25% 6%)' : 'hsl(220 40% 98%)' }}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: 'hsl(262 83% 60% / 0.4)' }} />
        <div className="w-12 h-12 rounded-full animate-spin" style={{ border: '3px solid hsl(262 83% 60% / 0.2)', borderTopColor: 'hsl(262 83% 60%)' }} />
      </div>
    </div>
  );

  const classRewards = rewards.filter(r => r.category !== 'cosmetic');
  const cosmetics = rewards.filter(r => r.category === 'cosmetic');

  const glassCard = {
    background: isDark 
      ? 'linear-gradient(145deg, hsl(220 20% 15% / 0.8), hsl(220 25% 8% / 0.5))'
      : 'linear-gradient(145deg, hsl(0 0% 100% / 0.8), hsl(0 0% 100% / 0.5))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: isDark ? '1px solid hsl(0 0% 100% / 0.1)' : '1px solid hsl(0 0% 100% / 0.15)',
  };

  const glassButton = {
    background: isDark ? 'hsl(0 0% 100% / 0.08)' : 'hsl(0 0% 100% / 0.5)',
    backdropFilter: 'blur(10px)',
    border: isDark ? '1px solid hsl(0 0% 100% / 0.1)' : '1px solid hsl(0 0% 100% / 0.1)',
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative" style={{ background: isDark ? 'hsl(220 25% 6%)' : 'hsl(220 40% 98%)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-25 animate-pulse" style={{ background: 'radial-gradient(circle, hsl(262 83% 60% / 0.4), transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, hsl(185 85% 60% / 0.3), transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsl(270 70% 65% / 0.3), transparent 70%)' }} />
      </div>

      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl blur-xl animate-pulse" style={{ background: 'hsl(45 90% 50% / 0.4)' }} />
                <div className="relative p-3 rounded-2xl" style={{ 
                  background: 'linear-gradient(135deg, hsl(45 90% 50%), hsl(45 95% 65%))',
                  boxShadow: '0 8px 30px hsl(45 90% 50% / 0.4)'
                }}>
                  <ShoppingBag className="w-7 h-7 text-white" />
                </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-['Outfit'] font-extrabold tracking-tight" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>
                Bazar Notyx
              </h1>
            </div>
            <p className="font-['DM_Sans'] font-medium" style={{ color: isDark ? 'hsl(220 10% 60%)' : 'hsl(220 8% 35%)' }}>
              Personaliza tu leyenda con skins exclusivas.
            </p>
          </div>
          
          {/* Coins Balance */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="p-1 rounded-[1.5rem]" style={{
              background: isDark 
                ? 'linear-gradient(145deg, hsl(220 20% 15% / 0.8), hsl(220 25% 8% / 0.5))'
                : 'linear-gradient(145deg, hsl(0 0% 100% / 0.8), hsl(0 0% 100% / 0.5))',
              backdropFilter: 'blur(20px)',
              border: isDark ? '1px solid hsl(0 0% 100% / 0.1)' : '1px solid hsl(0 0% 100% / 0.15)',
              boxShadow: '0 8px 30px rgb(0 0 0 / 0.15)'
            }}>
              <div className="flex items-center gap-4 px-6 py-4 rounded-[1.25rem]" style={glassButton}>
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl blur-md animate-pulse" style={{ background: 'hsl(45 90% 50% / 0.4)' }} />
                  <div className="relative p-2 rounded-xl" style={{ 
                    background: 'linear-gradient(135deg, hsl(45 90% 50% / 0.3), hsl(45 95% 65% / 0.2))',
                    border: '1px solid hsl(45 90% 50% / 0.3)'
                  }}>
                    <Coins className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 6px hsl(45 90% 50%))' }} />
                  </div>
                </div>
                <div>
                  <span className="font-['DM_Sans'] font-bold text-[10px] uppercase tracking-widest block" style={{ color: isDark ? 'hsl(220 10% 50%)' : 'hsl(220 10% 55%)' }}>Saldo Notyx</span>
                  <span className="text-3xl md:text-4xl font-['Outfit'] font-extrabold" style={{ 
                    color: '#f59e0b',
                    textShadow: '0 0 20px hsl(45 90% 50% / 0.5)'
                  }}>
                    {notyxCoins}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {previewSkin && (
          <div className="p-6 md:p-10 rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:scale-[1.01]" style={{
            background: isDark 
              ? 'linear-gradient(145deg, hsl(220 20% 15% / 0.9), hsl(220 25% 8% / 0.6))'
              : 'linear-gradient(145deg, hsl(0 0% 100% / 0.8), hsl(0 0% 100% / 0.5))',
            backdropFilter: 'blur(25px)',
            border: isDark ? '1px solid hsl(0 0% 100% / 0.12)' : '1px solid hsl(0 0% 100% / 0.15)',
            boxShadow: '0 25px 50px -20px rgb(0 0 0 / 0.3)'
          }}>
            {/* Glow Background */}
            <div className="absolute inset-0 -z-10" style={{
              background: 'radial-gradient(circle at 30% 50%, hsl(262 83% 60% / 0.15), transparent 50%), radial-gradient(circle at 70% 50%, hsl(270 70% 65% / 0.1), transparent 50%)'
            }} />

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
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{
                  background: 'linear-gradient(135deg, hsl(270 70% 60% / 0.2), hsl(270 70% 50% / 0.1))',
                  border: '1px solid hsl(270 70% 60% / 0.2)'
                }}>
                  <Sparkles className="w-4 h-4" style={{ color: 'hsl(270 70% 70%)' }} />
                  <span className="font-['DM_Sans'] font-bold text-xs uppercase tracking-widest" style={{ color: 'hsl(270 70% 70%)' }}>Vista Previa</span>
                </div>
                
                <h2 className="text-3xl md:text-5xl font-['Outfit'] font-extrabold" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>
                  {previewSkin.name}
                </h2>
                <p className="font-['DM_Sans'] font-medium text-base max-w-xl" style={{ color: isDark ? 'hsl(220 10% 60%)' : 'hsl(220 8% 35%)' }}>
                  {previewSkin.description}
                </p>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <Button 
                    onClick={() => handleBuy(previewSkin)}
                    className="h-14 px-8 rounded-2xl font-['DM_Sans'] font-bold uppercase tracking-wider flex items-center gap-3 transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, hsl(45 90% 50%), hsl(45 95% 65%))',
                      color: 'white',
                      boxShadow: '0 8px 30px hsl(45 90% 50% / 0.4)'
                    }}
                  >
                    <ShoppingCart className="w-5 h-5" /> Comprar por {previewSkin.cost_coins}
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setPreviewSkin(null)}
                    className="h-14 px-8 rounded-2xl font-['DM_Sans'] font-bold uppercase tracking-wider transition-all hover:scale-105"
                    style={glassButton}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skins Legendarias Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl blur-md animate-pulse" style={{ background: 'hsl(270 70% 60% / 0.4)' }} />
                <div className="relative p-3 rounded-xl" style={{
                  background: 'linear-gradient(135deg, hsl(270 70% 60% / 0.3), hsl(270 70% 50% / 0.2))',
                  border: '1px solid hsl(270 70% 60% / 0.2)'
                }}>
                  <Star className="w-6 h-6" style={{ color: 'hsl(270 70% 70%)' }} />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-['Outfit'] font-extrabold" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>
                Skins Legendarias
              </h2>
            </div>
            <span className="font-['DM_Sans'] font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full" style={{ 
              background: 'hsl(0 0% 100% / 0.05)', 
              color: isDark ? 'hsl(220 10% 50%)' : 'hsl(220 10% 55%)' 
            }}>
              {cosmetics.length} Disponibles
            </span>
          </div>
          
          {cosmetics.length === 0 ? (
            <div className="py-20 text-center rounded-[2.5rem]" style={glassCard}>
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 rounded-[3rem] blur-xl animate-pulse" style={{ background: 'hsl(270 70% 60% / 0.2)' }} />
                <div className="relative w-20 h-20 rounded-[3rem] flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, hsl(270 70% 60% / 0.2), hsl(270 70% 50% / 0.1))',
                  border: '1px solid hsl(270 70% 60% / 0.15)'
                }}>
                  <Sparkles className="w-10 h-10" style={{ color: 'hsl(270 70% 60%)', opacity: 0.5 }} />
                </div>
              </div>
              <h3 className="font-['Outfit'] font-extrabold text-xl" style={{ color: isDark ? 'hsl(220 20% 70%)' : 'hsl(220 10% 40%)' }}>Próximamente...</h3>
              <p className="font-['DM_Sans'] font-medium mt-2" style={{ color: isDark ? 'hsl(220 10% 50%)' : 'hsl(220 8% 35%)' }}>Estamos forjando nuevas skins épicas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {cosmetics.map(reward => (
                <ShopCard
                  key={reward.id}
                  reward={reward}
                  purchase={myPurchases.find(p => p.reward_id === reward.id)}
                  notyxCoins={notyxCoins}
                  onBuy={() => handleBuy(reward)}
                  onEquip={() => handleEquip(reward)}
                  onPreview={() => setPreviewSkin(reward)}
                  isDark={isDark}
                />
              ))}
            </div>
          )}
        </div>

        {/* Botín de Clase Section */}
        <div className="space-y-8 pt-8" style={{ borderTop: isDark ? '1px solid hsl(0 0% 100% / 0.08)' : '1px solid hsl(0 0% 0% / 0.05)' }}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur-md animate-pulse" style={{ background: 'hsl(195 90% 55% / 0.4)' }} />
              <div className="relative p-3 rounded-xl" style={{
                background: 'linear-gradient(135deg, hsl(195 90% 55% / 0.3), hsl(195 90% 45% / 0.2))',
                border: '1px solid hsl(195 90% 55% / 0.2)'
              }}>
                <ShoppingBag className="w-6 h-6" style={{ color: 'hsl(195 90% 55%)' }} />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-['Outfit'] font-extrabold" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>
              Botín de Clase
            </h2>
          </div>

          {classRewards.length === 0 ? (
            <div className="py-24 text-center rounded-[2.5rem]" style={glassCard}>
               <div className="relative inline-block mb-6">
                <div className="absolute inset-0 rounded-[3rem] blur-xl animate-pulse" style={{ background: 'hsl(195 90% 55% / 0.2)' }} />
                <div className="relative w-20 h-20 rounded-[3rem] flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, hsl(195 90% 55% / 0.2), hsl(195 90% 45% / 0.1))',
                  border: '1px solid hsl(195 90% 55% / 0.15)'
                }}>
                  <Shield className="w-10 h-10" style={{ color: 'hsl(195 90% 55%)', opacity: 0.5 }} />
                </div>
              </div>
              <h3 className="font-['Outfit'] font-extrabold text-2xl" style={{ color: isDark ? 'hsl(220 20% 70%)' : 'hsl(220 10% 40%)' }}>Sin premios locales</h3>
              <p className="font-['DM_Sans'] font-medium mt-2 max-w-xs mx-auto" style={{ color: isDark ? 'hsl(220 10% 50%)' : 'hsl(220 8% 35%)' }}>Espera a que tus profesores activen el botín exclusivo para esta clase.</p>
            </div>
) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {classRewards.map(reward => (
                 <ShopCard
                   key={reward.id}
                   reward={reward}
                   purchase={myPurchases.find(p => p.reward_id === reward.id)}
                   notyxCoins={notyxCoins}
                   onBuy={() => handleBuy(reward)}
                   onEquip={() => {}}
                   onPreview={() => {}}
                   isDark={isDark}
                 />
               ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes gradient-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
      `}</style>
    </div>
  );
}