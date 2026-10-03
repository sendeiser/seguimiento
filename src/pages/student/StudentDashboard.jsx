import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  BookOpen,
  TrendingUp,
  Award,
  Flame,
  Coins,
  ShoppingBag,
  Trophy,
  Star,
  Shield,
  ArrowRight,
  Lock,
  CheckCircle2,
  Flag,
  Crown,
  Heart,
  Sparkles
} from "lucide-react";
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
          { data: pData },
          { data: pokemonData }
        ] = await Promise.all([
          supabase.from("sessions").select("id, date, session_criteria(id, name, max_score)").in("class_id", classIds),
          supabase.from("grades").select("criteria_id, score").eq("student_id", user.id),
          supabase.from("attendance").select("session_id, is_present").eq("student_id", user.id),
          supabase.from("student_purchases").select("*, rewards(cost_coins)").eq("student_id", user.id).neq("status", "cancelled"),
          supabase.from("student_pokemon_store").select("cost_coins").eq("student_id", user.id)
        ]);

        const gradesMap = gData?.reduce((acc, curr) => { acc[curr.criteria_id] = curr.score; return acc; }, {}) || {};
        const attMap = aData?.reduce((acc, curr) => { acc[curr.session_id] = curr.is_present; return acc; }, {}) || {};
        const spentOnPokemon = (pokemonData || []).reduce((acc, curr) => acc + (curr.cost_coins || 0), 0);
        const spentCoins = (pData?.reduce((acc, curr) => acc + (curr.rewards?.cost_coins || 0), 0) || 0) + spentOnPokemon;

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
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">Mi Progreso Notyx</h1>
          <p className="text-slate-500 mt-1 font-medium text-base">Tu desempeño escolar y logros en un solo lugar.</p>
        </div>
        <div className="flex items-center gap-3">
           <Link to="/ranking">
             <Button
               variant="outline"
               className="rounded-2xl h-11 px-5 border border-slate-200 gap-2 font-semibold text-xs text-slate-700 hover:bg-slate-50 shadow-sm active:scale-[0.98] transition-all"
             >
               <Trophy className="w-4 h-4 text-amber-500" /> Ranking
             </Button>
           </Link>
           <Link to="/shop">
             <Button className="rounded-2xl h-11 px-5 gap-2 font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all">
               <ShoppingBag className="w-4 h-4" /> Tienda
             </Button>
           </Link>
        </div>
      </div>

      {/* Global Gamification Card - Apple Light Material */}
      {gamificationData && (
         <div className="relative overflow-hidden rounded-3xl bg-white text-slate-900 p-6 sm:p-8 md:p-10 shadow-sm border border-slate-200/90 group min-w-0">
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-[90px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
               <div className="shrink-0 relative">
                  <div className="w-36 h-36 rounded-3xl border border-blue-200/80 flex flex-col items-center justify-center font-bold shadow-sm bg-gradient-to-br from-blue-50/80 to-indigo-50/50 backdrop-blur-md transition-transform duration-500 group-hover:scale-105">
                    <Trophy className="w-14 h-14 mb-2 text-blue-600 group-hover:text-blue-500 transition-colors" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-none">Rango</span>
                    <span className="text-lg font-black tracking-tight mt-1 text-slate-900">{gamificationData.rank.name}</span>
                  </div>
                  <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-lg border-4 border-white shadow-md">
                    {gamificationData.currentLevel}
                  </div>
               </div>
               
               <div className="flex-1 w-full space-y-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-center md:text-left">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-1 text-slate-900">Nivel Global {gamificationData.currentLevel}</h2>
                      <p className="text-slate-600 font-medium text-xs">Poder Total: <span className="font-bold text-blue-700">{gamificationData.currentXP} XP</span> acumulados</p>
                    </div>
                    <div className="bg-amber-50/90 border border-amber-200/90 px-5 py-2.5 rounded-2xl shadow-2xs">
                       <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">Notyx Coins</span>
                       <span className="text-xl font-black text-amber-950 flex items-center justify-center md:justify-start gap-2">
                         <Coins className="w-4 h-4 text-amber-600" /> {gamificationData.notyxCoins}
                       </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                     <div className="flex justify-between text-xs font-semibold text-slate-600">
                       <span>Siguiente Nivel</span>
                       <span className="text-blue-700 font-bold">{gamificationData.currentLevelXP} / {gamificationData.nextLevelXP} XP</span>
                     </div>
                     <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                       <div 
                         className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-full shadow-xs transition-all duration-700" 
                         style={{ width: `${(gamificationData.currentLevelXP / gamificationData.nextLevelXP) * 100}%` }}
                       />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shadow-2xs">
                           <Flame className="w-5 h-5" />
                        </div>
                        <div>
                           <span className="text-lg font-black block leading-none text-slate-900">{gamificationData.maxStreak}</span>
                           <span className="text-xs text-slate-600 font-medium">Racha Máxima</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shadow-2xs">
                           <Award className="w-5 h-5" />
                        </div>
                        <div>
                           <span className="text-lg font-black block leading-none text-slate-900">{gamificationData.unlockedBadges.filter(b => b.unlocked).length}</span>
                           <span className="text-xs text-slate-600 font-medium">Medallas</span>
                        </div>
                     </div>
                     <div className="hidden md:flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-2xs">
                           <Shield className="w-5 h-5" />
                        </div>
                        <div>
                           <span className="text-lg font-black block leading-none text-slate-900">{gamificationData.hp}%</span>
                           <span className="text-xs text-slate-600 font-medium">Vitalidad</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Classes Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Mis Materias</h3>
          <span className="text-slate-400 font-medium text-xs">{classes.length} Clases Activas</span>
        </div>

        {classes.length === 0 ? (
          <div className="apple-card rounded-3xl py-20 text-center border-2 border-dashed border-slate-200">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-600">No estás inscripto en ninguna clase</h3>
            <p className="text-slate-400 text-sm mt-1">Espera a que un docente te agregue para comenzar tu aventura.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Link key={c.id} to={`/student/class/${c.id}`} className="group block">
                <div className="apple-card rounded-3xl p-6 h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] flex flex-col justify-between">
                  <div>
                    <div className="bg-blue-50 border border-blue-100 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 leading-snug mb-1 group-hover:text-blue-600 transition-colors tracking-tight">{c.name}</h3>
                    <p className="text-slate-400 font-medium text-xs mb-6">Docente: {c.profiles?.full_name}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                     <span className="text-xs font-semibold text-blue-600 bg-blue-50/80 border border-blue-200/50 px-2.5 py-1 rounded-full">En Curso</span>
                     <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                     </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Logros Detallados */}
      {gamificationData && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-500" /> Mis Logros
            </h3>
            <span className="text-slate-400 font-medium text-xs">
              {gamificationData.unlockedBadges.filter(b => b.unlocked).length} / {Object.keys(BADGE_DEFS).length} Desbloqueados
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.keys(BADGE_DEFS).map((key) => {
              const badge = BADGE_DEFS[key];
              const isUnlocked = gamificationData.unlockedBadges?.find(b => b.id === key)?.unlocked;
              const BadgeIcon = { Star, Flame, Crown, TrendingUp, Heart, Sparkles, Flag, Shield }[badge.icon] || Star;

              return (
                <div 
                  key={key}
                  className={`apple-card relative p-5 rounded-3xl transition-all duration-300 ${
                    isUnlocked 
                      ? 'bg-gradient-to-br from-amber-50/70 to-yellow-50/50 border-amber-200/80 shadow-sm' 
                      : 'opacity-60 bg-white/60'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 shadow-sm ${
                    isUnlocked ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {isUnlocked ? <BadgeIcon className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <h4 className={`font-semibold text-sm mb-1 leading-snug ${isUnlocked ? 'text-amber-950' : 'text-slate-500'}`}>
                    {badge.label}
                  </h4>
                  <p className={`text-xs font-normal leading-relaxed ${isUnlocked ? 'text-amber-800/80' : 'text-slate-400'}`}>
                    {badge.req}
                  </p>
                  {isUnlocked && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}