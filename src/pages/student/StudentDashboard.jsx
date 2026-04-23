import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { BookOpen, TrendingUp, Award, Flame, Coins, ShoppingBag, Trophy, Star, Shield, ArrowRight } from "lucide-react";
import { calculateGamification, RANKS, BADGE_DEFS } from "../../lib/gamificationEngine";

export default function StudentDashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gamificationData, setGamificationData] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("class_students")
      .select(`
        classes (
          id,
          name,
          profiles!classes_teacher_id_fkey (full_name)
        )
      `)
      .eq("student_id", user.id);

    if (data) {
      const userClasses = data.map(item => item.classes);
      setClasses(userClasses);
      
      if (userClasses.length > 0) {
        const classIds = userClasses.map(c => c.id);
        
        // Fetch sessions, grades, attendance, AND purchases
        const [
          { data: sData },
          { data: gData },
          { data: aData },
          { data: pData }
        ] = await Promise.all([
          supabase.from("sessions").select("id, date, session_criteria(id, name, max_score)").in("class_id", classIds),
          supabase.from("grades").select("criteria_id, score").eq("student_id", user.id),
          supabase.from("attendance").select("session_id, is_present").eq("student_id", user.id),
          supabase.from("student_purchases").select("*, rewards(cost_coins)").eq("student_id", user.id).neq("status", "cancelled")
        ]);

        const gradesMap = gData?.reduce((acc, curr) => { acc[curr.criteria_id] = curr.score; return acc; }, {}) || {};
        const attMap = aData?.reduce((acc, curr) => { acc[curr.session_id] = curr.is_present; return acc; }, {}) || {};
        const spentCoins = pData?.reduce((acc, curr) => acc + (curr.rewards?.cost_coins || 0), 0) || 0;

        const enhancedSessions = sData?.map(sess => ({
          ...sess,
          criteria: sess.session_criteria || []
        })) || [];

        const globalGami = calculateGamification(enhancedSessions, gradesMap, attMap, spentCoins);
        setGamificationData(globalGami);
      }
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">Mi Progreso Notyx</h1>
          <p className="text-slate-500 mt-3 font-medium text-lg">Tu viaje educativo convertido en una aventura épica.</p>
        </div>
        <div className="flex gap-3">
           <Link to="/ranking">
             <Button variant="outline" className="rounded-2xl h-12 px-6 border-2 gap-2 font-black text-xs uppercase tracking-widest shadow-sm">
               <Trophy className="w-4 h-4" /> Ver Ranking
             </Button>
           </Link>
           <Link to="/shop">
             <Button className="rounded-2xl h-12 px-6 gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20">
               <ShoppingBag className="w-4 h-4" /> Tienda
             </Button>
           </Link>
        </div>
      </div>

      {/* Global Gamification Card */}
      {gamificationData && (
         <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none group-hover:bg-blue-600/30 transition-colors duration-1000" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
               <div className="shrink-0 relative">
                  <div className={`w-40 h-40 rounded-[48px] border-4 border-white/10 flex flex-col items-center justify-center font-black text-white shadow-2xl bg-white/5 backdrop-blur-2xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2`}>
                    <Trophy className="w-16 h-16 mb-2 text-blue-400 group-hover:text-blue-300" />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-blue-200/60 leading-none">Rango Actual</span>
                    <span className="text-xl tracking-tight mt-1">{gamificationData.rank.name}</span>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center font-black text-2xl border-4 border-slate-900 shadow-2xl">
                    {gamificationData.currentLevel}
                  </div>
               </div>
               
               <div className="flex-1 w-full space-y-8">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-center md:text-left">
                    <div>
                      <h2 className="text-3xl font-black tracking-tight mb-1">Nivel Global {gamificationData.currentLevel}</h2>
                      <p className="text-blue-200/60 font-black uppercase tracking-widest text-[10px]">Poder Total: {gamificationData.currentXP} XP acumulados</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl">
                       <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-1">Notyx Coins</span>
                       <span className="text-2xl font-black text-yellow-400 flex items-center justify-center md:justify-start gap-2">
                         <Coins className="w-5 h-5" /> {gamificationData.notyxCoins}
                       </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                     <div className="flex justify-between text-[11px] font-black text-blue-200/60 uppercase tracking-widest">
                       <span>Siguiente Nivel</span>
                       <span>{gamificationData.currentLevelXP} / {gamificationData.nextLevelXP} XP</span>
                     </div>
                     <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                       <div 
                         className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-1000" 
                         style={{ width: `${(gamificationData.currentLevelXP / gamificationData.nextLevelXP) * 100}%` }}
                       />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                           <Flame className="w-5 h-5" />
                        </div>
                        <div>
                           <span className="text-xl font-black block leading-none">{gamificationData.maxStreak}</span>
                           <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Racha Máxima</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                           <Award className="w-5 h-5" />
                        </div>
                        <div>
                           <span className="text-xl font-black block leading-none">{gamificationData.unlockedBadges.filter(b => b.unlocked).length}</span>
                           <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Medallas</span>
                        </div>
                     </div>
                     <div className="hidden md:flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                           <Shield className="w-5 h-5" />
                        </div>
                        <div>
                           <span className="text-xl font-black block leading-none">{gamificationData.hp}%</span>
                           <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Vitalidad</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Classes Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Mis Materias</h3>
          <span className="text-slate-400 font-bold text-sm uppercase tracking-widest">{classes.length} Clases Activas</span>
        </div>

        {classes.length === 0 ? (
          <div className="bg-white rounded-[48px] py-24 text-center border-2 border-dashed border-slate-100">
            <BookOpen className="w-16 h-16 mx-auto mb-6 text-slate-200" />
            <h3 className="text-xl font-black text-slate-400">No estás inscripto en ninguna clase</h3>
            <p className="text-slate-500 mt-2">Espera a que un docente te agregue para comenzar tu aventura.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Link key={c.id} to={`/student/class/${c.id}`} className="group">
                <div className="bg-white rounded-[40px] border border-slate-100 p-8 h-full transition-all duration-300 hover:shadow-2xl hover:shadow-slate-900/5 hover:-translate-y-1 relative overflow-hidden">
                  <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{c.name}</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">Docente: {c.profiles?.full_name}</p>
                  <div className="mt-auto flex items-center justify-between">
                     <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-widest">En Curso</span>
                     <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                        <ArrowRight className="w-5 h-5" />
                     </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}