import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ShoppingBag, Coins, ShoppingCart, CheckCircle2, Star, Clock, Shield } from "lucide-react";
import { calculateGamification } from "../../lib/gamificationEngine";

export default function GlobalMarketplace() {
  const [rewards, setRewards] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [notyxCoins, setNotyxCoins] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch class associations to get class-specific rewards
    const { data: classStudents } = await supabase.from("class_students").select("class_id").eq("student_id", user.id);
    const classIds = classStudents?.map(cs => cs.class_id) || [];

    // Fetch rewards, grades, attendance, and purchases
    const [
      { data: rwData },
      { data: pData },
      { data: sData },
      { data: gData },
      { data: aData }
    ] = await Promise.all([
      supabase.from("rewards").select("*, classes(name)").in("class_id", classIds),
      supabase.from("student_purchases").select("*, rewards(cost_coins)").eq("student_id", user.id).neq("status", "cancelled"),
      supabase.from("sessions").select("id, date, session_criteria(id, name, max_score)").in("class_id", classIds),
      supabase.from("grades").select("criteria_id, score").eq("student_id", user.id),
      supabase.from("attendance").select("session_id, is_present").eq("student_id", user.id)
    ]);

    setRewards(rwData || []);
    setMyPurchases(pData || []);

    const gradesMap = gData?.reduce((acc, curr) => { acc[curr.criteria_id] = curr.score; return acc; }, {}) || {};
    const attMap = aData?.reduce((acc, curr) => { acc[curr.session_id] = curr.is_present; return acc; }, {}) || {};
    const spentCoins = pData?.reduce((acc, curr) => acc + (curr.rewards?.cost_coins || 0), 0) || 0;

    const gami = calculateGamification(sData?.map(s => ({...s, criteria: s.session_criteria || []})) || [], gradesMap, attMap, spentCoins);
    setNotyxCoins(gami.notyxCoins);

    setLoading(false);
  };

  const handleBuy = async (reward) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (notyxCoins < reward.cost_coins) {
       alert("No tienes suficientes Notyx Coins.");
       return;
    }
    
    if (myPurchases.some(p => p.reward_id === reward.id && p.status === 'pending')) {
       alert("Este item ya está pendiente de entrega.");
       return;
    }

    const { error } = await supabase.from("student_purchases").insert({
       student_id: user.id,
       reward_id: reward.id,
       status: 'pending'
    });

    if (!error) {
       alert("¡Compra exitosa! El profesor te lo entregará pronto.");
       fetchData();
    }
  };

  if (loading) return <div className="p-10 text-center font-black animate-pulse text-orange-500">Cargando el Mercado Notyx...</div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Tienda Notyx</h1>
           <p className="text-slate-500 font-medium">Intercambia tus monedas por recompensas reales y mejoras.</p>
        </div>
        <div className="bg-slate-900 text-white px-8 py-4 rounded-[32px] flex items-center gap-4 shadow-2xl shadow-slate-900/20 border border-slate-800">
           <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Saldo Disponible</span>
              <span className="text-3xl font-black text-yellow-400 flex items-center gap-3">
                 <Coins className="w-8 h-8 text-yellow-400" /> {notyxCoins}
              </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
         {rewards.map(reward => {
            const isBought = myPurchases.some(p => p.reward_id === reward.id && p.status === 'pending');
            const canAfford = notyxCoins >= reward.cost_coins;

            return (
              <div key={reward.id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl hover:shadow-2xl transition-all group flex flex-col h-full">
                 <div className="bg-slate-50 w-16 h-16 rounded-[28px] flex items-center justify-center text-4xl mb-6 shadow-inner group-hover:bg-orange-50 group-hover:scale-110 transition-all duration-500">
                    {reward.icon || '🎁'}
                 </div>
                 <h3 className="font-black text-2xl text-slate-900 leading-tight mb-2">{reward.name}</h3>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> {reward.classes?.name}
                 </p>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 flex-1">{reward.description}</p>
                 
                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Precio</span>
                       <span className="text-xl font-black text-slate-900 flex items-center gap-1">
                          <Coins className="w-4 h-4 text-yellow-500" /> {reward.cost_coins}
                       </span>
                    </div>
                    
                    <Button 
                      onClick={() => handleBuy(reward)}
                      disabled={isBought || !canAfford}
                      className={`w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg transition-all ${
                        isBought 
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' 
                        : canAfford 
                        ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-yellow-400/20' 
                        : 'bg-slate-100 text-slate-400 shadow-none'
                      }`}
                    >
                      {isBought ? (
                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Comprado</span>
                      ) : (
                        <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Comprar Ahora</span>
                      )}
                    </Button>
                 </div>
              </div>
            );
         })}
      </div>

      {rewards.length === 0 && (
        <div className="py-32 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-100">
           <ShoppingBag className="w-20 h-20 text-slate-100 mx-auto mb-6" />
           <h3 className="text-2xl font-black text-slate-300">Aún no hay premios disponibles</h3>
           <p className="text-slate-400 mt-2 font-medium">Espera a que tus profesores activen la tienda de recompensas.</p>
        </div>
      )}
    </div>
  );
}
