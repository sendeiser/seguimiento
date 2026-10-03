import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, Trophy, Medal, ShoppingBag, ShoppingCart, Swords, Heart, Sparkles, Flame, Crown, Flag, ShieldCheck, Star, Gamepad2, Loader2, List, FileSpreadsheet, Layers } from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { calculateGamification } from "../../lib/gamificationEngine";
import { RewardIcon } from "../../lib/skinThemes";
import {
  getCriteriaType,
  getCriteriaCleanName,
  getCriteriaTypeMeta,
} from "../../lib/pedagogicalReportEngine";

// Vercel bundle-dynamic-imports: Lazy load heavy components (recharts & arena)
const SkillsRadar = lazy(() => import("../../components/ui/SkillsRadar").then(m => ({ default: m.SkillsRadar })));
const ArenaHub = lazy(() => import("../../components/arena/ArenaHub"));

export default function StudentClassView() {
  const { id } = useParams(); // class id
  const { user } = useAuth();
  const { toast } = useToast();
  const [classData, setClassData] = useState(null);
  const [sessionsData, setSessionsData] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [notyxCoins, setNotyxCoins] = useState(0);
  const [myGami, setMyGami] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState("academic"); // "academic" | "arena"
  const [myCsId, setMyCsId] = useState(null);
  const [classmates, setClassmates] = useState([]);

  // Icon mapping for dynamic badge rendering
  const IconMap = { Flag, Flame, Star, Crown, TrendingUp: ShieldCheck };

  useEffect(() => {
    fetchData();

    if (!user) return;

    // Listen to MY grades dynamically to update the UI specifically for this student
    const subscription = supabase
      .channel('public:my_grades')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'grades',
        filter: `student_id=eq.${user.id}`
      }, payload => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id, user]);

  const fetchData = async () => {
    if (!user) return;

    // Vercel async-parallel: Fetch core class data in a single unified Promise.all (zero waterfalls)
    const [
      { data: c },
      { data: sData },
      { data: stData },
      { data: housesData },
      { data: allPurchases },
      { data: rwData }
    ] = await Promise.all([
      supabase.from("classes").select("*").eq("id", id).single(),
      supabase.from("sessions").select("id, date, cuatrimestre, session_criteria(id, name, max_score)").eq("class_id", id).order("date", { ascending: false }),
      supabase.from("class_students").select("id, house_id, student_id, student_name, avatar_url, profiles(id, full_name)").eq("class_id", id),
      supabase.from("class_houses").select("*").eq("class_id", id),
      supabase.from("student_purchases").select("*, rewards(cost_coins)").eq("student_id", user.id).neq("status", "cancelled"),
      supabase.from("rewards").select("*").eq("class_id", id)
    ]);
    if (c) setClassData(c);

    // Get criteria IDs for fetching grades
    const criteriaIds = [];
    sData?.forEach(s => s.session_criteria?.forEach(crit => criteriaIds.push(crit.id)));

    // Fetch all grades and attendance for the class in parallel
    const [
      { data: allGData },
      { data: attData }
    ] = await Promise.all([
      supabase.from("grades").select("student_id, criteria_id, score").in("criteria_id", criteriaIds.length > 0 ? criteriaIds : [0]),
      supabase.from("attendance").select("student_id, session_id, is_present").in("session_id", sData && sData.length > 0 ? sData.map(s => s.id) : [0])
    ]);

    const mySpentCoins = allPurchases?.reduce((acc, curr) => acc + (curr.rewards?.cost_coins || 0), 0) || 0;

    let minigameBonus = 0;
    if (stData) {
      const myCs = stData.find(s => s.student_id === user.id);
      if (myCs) {
        setMyCsId(myCs.id);
        const { data: logs } = await supabase
          .from("student_minigame_logs")
          .select("reward_coins")
          .eq("class_student_id", myCs.id);
        minigameBonus = (logs || []).reduce((sum, l) => sum + (l.reward_coins || 0), 0);
      }
      setClassmates(stData);

      // Vercel js-index-maps: Build O(1) lookup dictionaries for instant access instead of nested O(N*M) filters
      const gradesByStudent = {};
      (allGData || []).forEach(g => {
        if (!gradesByStudent[g.student_id]) gradesByStudent[g.student_id] = {};
        gradesByStudent[g.student_id][g.criteria_id] = g.score;
      });

      const attByStudent = {};
      (attData || []).forEach(a => {
        if (!attByStudent[a.student_id]) attByStudent[a.student_id] = {};
        attByStudent[a.student_id][a.session_id] = a.is_present;
      });

      const housesMap = new Map((housesData || []).map(h => [h.id, h]));

      const lb = stData.map(st => {
          const p = st.profiles;
          if (!p) return null;
          const userGrades = gradesByStudent[p.id] || {};
          const userAtt = attByStudent[p.id] || {};
          
          // Rebuild sessions array for gamification engine
          const baseSessions = sData.map(s => ({
            ...s,
            criteria: s.session_criteria || []
          }));

          const gami = calculateGamification(baseSessions, userGrades, userAtt, p.id === user.id ? mySpentCoins : 0);
          
          if (p.id === user.id) {
             setNotyxCoins(Math.max(0, gami.notyxCoins + minigameBonus));
             setMyGami(gami);
          }
          
          const house = housesMap.get(st.house_id) || null;
          
          return { id: p.id, name: p.full_name, xp: gami.currentXP, level: gami.currentLevel, rank: gami.rank, house };
      }).filter(Boolean).sort((a, b) => b.xp - a.xp);
      
      setLeaderboard(lb);
    }

    // Update sessions data with my grades for UI using O(1) lookup map
    const myGradesMap = (allGData || []).filter(g => g.student_id === user.id).reduce((acc, curr) => { acc[curr.criteria_id] = curr.score; return acc; }, {});
    const enhancedSessions = (sData || []).map(sess => {
      const sCuatrimestre = sess.cuatrimestre || (new Date(sess.date).getMonth() >= 6 ? 2 : 1);
      return {
        ...sess,
        cuatrimestre: sCuatrimestre,
        criteriaWithGrades: (sess.session_criteria || []).map(crit => {
          const type = getCriteriaType(crit.name);
          const cleanName = getCriteriaCleanName(crit.name) || crit.name;
          const meta = getCriteriaTypeMeta(type);
          return {
            ...crit,
            session_id: sess.id,
            sessionDate: sess.date,
            cuatrimestre: sCuatrimestre,
            type,
            cleanName,
            meta,
            score: myGradesMap[crit.id] !== undefined ? myGradesMap[crit.id] : null
          };
        })
      };
    });
    setSessionsData(enhancedSessions);
    setRewards(rwData || []);
    setMyPurchases(allPurchases || []);
    setLoading(false);
  };

  const handleBuy = async (reward) => {
    if (notyxCoins < reward.cost_coins) {
       toast("No tienes suficientes Notyx Coins.", "warning");
       return;
    }
    if (myPurchases.some(p => p.reward_id === reward.id && p.status === 'pending')) {
       toast("Ya compraste este item y está pendiente de entrega.", "info");
       return;
    }

    const { error } = await supabase.from("student_purchases").insert({
       student_id: user.id,
       reward_id: reward.id,
       status: 'pending'
    });

    if (!error) {
       toast("¡Compra exitosa! Esperando entrega del profesor.", "success");
       fetchData();
    }
  };

  const handleChallenge = async (opponentId) => {
    const { error } = await supabase.from("challenges").insert({
       class_id: id,
       challenger_id: user.id,
       challenged_id: opponentId,
       status: 'pending'
    });
    if (!error) {
       toast("¡Desafío enviado! Prepárate para la próxima clase.", "success");
    }
  };

  const [selectedCuatrimestre, setSelectedCuatrimestre] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all"); // "all" | "exam" | "assignment" | "class"
  const [academicSubView, setAcademicSubView] = useState("sessions"); // "sessions" | "table"

  if (loading) return <div className="p-8">Cargando progreso en vivo...</div>;

  const filteredSessionsData = sessionsData.filter(s => {
    if (selectedCuatrimestre === "all") return true;
    const sCuatrimestre = s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1);
    return sCuatrimestre === Number(selectedCuatrimestre);
  });

  const allCriteria = filteredSessionsData.flatMap(s => s.criteriaWithGrades);

  // Category counts across selected cuatrimestre
  const criteriaCounts = {
    all: allCriteria.length,
    exam: allCriteria.filter(c => c.type === "exam").length,
    assignment: allCriteria.filter(c => c.type === "assignment").length,
    class: allCriteria.filter(c => c.type === "class").length,
  };

  // Separated score sums: Clases vs Exámenes/TPs
  let classScoreSum = 0;
  let classMaxSum = 0;
  let examScoreSum = 0;
  let examMaxSum = 0;

  allCriteria.forEach(crit => {
    if (crit.score !== null) {
      const num = Number(crit.score);
      const max = Number(crit.max_score || 10);
      if (crit.type === "class") {
        classScoreSum += num;
        classMaxSum += max;
      } else {
        examScoreSum += num;
        examMaxSum += max;
      }
    }
  });

  const classAvg = classMaxSum > 0 ? (classScoreSum / classMaxSum) * 10 : null;
  const examAvg = examMaxSum > 0 ? (examScoreSum / examMaxSum) * 10 : null;

  const totalScore = allCriteria.reduce((a, c) => a + (c.score || 0), 0);
  const maxTotal = allCriteria.reduce((a, c) => a + (c.max_score || 0), 0);
  const overallPct = maxTotal > 0 ? (totalScore / maxTotal) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/home">
            <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-white border-transparent">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">{classData?.name}</h1>
            <p className="text-slate-500 mt-0.5 font-medium text-xs sm:text-sm">Progreso en vivo y rendimiento académico.</p>
          </div>
        </div>

        {/* Cuatrimestre Selector */}
        <div className="apple-segmented-control self-start md:self-auto">
          <button
            onClick={() => setSelectedCuatrimestre("all")}
            className={`apple-segmented-item ${selectedCuatrimestre === "all" ? "active" : ""}`}
          >
            Año Completo
          </button>
          <button
            onClick={() => setSelectedCuatrimestre("1")}
            className={`apple-segmented-item ${selectedCuatrimestre === "1" ? "active" : ""}`}
          >
            1º Cuatrimestre
          </button>
          <button
            onClick={() => setSelectedCuatrimestre("2")}
            className={`apple-segmented-item ${selectedCuatrimestre === "2" ? "active" : ""}`}
          >
            2º Cuatrimestre
          </button>
        </div>
      </div>

      {/* Main View Switcher Tabs */}
      <div className="apple-segmented-control self-start">
        <button
          onClick={() => setActiveMainTab("academic")}
          className={`apple-segmented-item flex items-center gap-2 ${activeMainTab === 'academic' ? 'active' : ''}`}
        >
          <Trophy className="w-3.5 h-3.5 text-blue-600" />
          <span>Progreso y Clases</span>
        </button>
        <button
          onClick={() => setActiveMainTab("arena")}
          className={`apple-segmented-item flex items-center gap-2 ${activeMainTab === 'arena' ? 'active text-rose-600 font-bold' : ''}`}
        >
          <Gamepad2 className="w-3.5 h-3.5 text-rose-500" />
          <span>Arena Competitiva</span>
        </button>
      </div>

      {activeMainTab === 'arena' ? (
        <Suspense fallback={
          <div className="min-h-[300px] flex items-center justify-center bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando Arena...</p>
            </div>
          </div>
        }>
          <ArenaHub
            classStudentId={myCsId}
            classId={id}
            studentName={user?.user_metadata?.full_name || 'Estudiante'}
            notyxCoins={notyxCoins}
            studentsList={classmates}
            onRewardEarned={fetchData}
          />
        </Suspense>
      ) : (
        <>
          {/* Main RPG Card */}
          {myGami && (
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-2xl shadow-slate-900/5 overflow-hidden relative">
          <div className={`absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-20 pointer-events-none ${myGami.rank.bg}`} />
          
          <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
            <div className="relative group shrink-0">
              <div className={`w-32 h-32 rounded-[40px] flex flex-col items-center justify-center font-black shadow-lg border-4 ${myGami.rank.bg} ${myGami.rank.border} ${myGami.rank.color}`}>
                <Trophy className="w-12 h-12 mb-1" />
                <span className="text-[10px] uppercase tracking-widest leading-none">Rango</span>
                <span className="text-sm tracking-tight leading-none mt-1">{myGami.rank.name}</span>
              </div>
              <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xl border-4 border-white shadow-xl">
                {myGami.currentLevel}
              </div>
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tu Experiencia</p>
                    <h3 className="text-3xl font-black text-slate-800 leading-none tracking-tighter">{myGami.currentXP} <span className="text-xs text-slate-400 font-bold">XP</span></h3>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-2xs">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">📝 Prom. Clases</p>
                    <p className="text-xl font-black text-slate-800 leading-none">{typeof classAvg === 'number' ? `${classAvg.toFixed(1)}/10` : "—"}</p>
                 </div>
                 <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100 shadow-2xs">
                    <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1">🎯 Prom. Exám/TPs</p>
                    <p className="text-xl font-black text-purple-900 leading-none">{typeof examAvg === 'number' ? `${examAvg.toFixed(1)}/10` : "—"}</p>
                 </div>
                 <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100 shadow-2xs">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest leading-none mb-1">🌟 Rendimiento</p>
                    <p className="text-xl font-black text-blue-800 leading-none">{Math.round(overallPct * 100)}%</p>
                 </div>
              </div>

              <div className="space-y-5">
                 <div className="space-y-2">
                   <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                     <span className="text-blue-600">Nivel {myGami.currentLevel}</span>
                     <span className="text-slate-400">{myGami.currentLevelXP} / {myGami.nextLevelXP} XP</span>
                   </div>
                   <div className="relative h-5 bg-slate-100 rounded-full overflow-hidden border-2 border-white shadow-inner">
                     <div 
                       className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg transition-all duration-1000" 
                       style={{ width: `${(myGami.currentLevelXP / myGami.nextLevelXP) * 100}%` }}
                     />
                   </div>
                 </div>
                 
                 <div className={`space-y-2 p-4 rounded-3xl border ${myGami.hp <= 30 ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-slate-50 border-slate-100'}`}>
                   <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                     <span className="flex items-center gap-2 text-slate-700">
                       <Heart className={`w-4 h-4 ${myGami.hp <= 30 ? 'text-red-500 fill-red-500' : 'text-rose-400 fill-rose-200'}`} /> 
                       Tu Vitalidad (HP)
                     </span>
                     <span className={myGami.hp <= 30 ? 'text-red-600 font-black' : 'text-slate-500 font-black'}>{myGami.hp} / {myGami.MAX_HP} HP</span>
                   </div>
                   <div className="relative h-3.5 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                     <div 
                       className={`absolute top-0 left-0 h-full rounded-full shadow-lg transition-all duration-1000 ${myGami.hp <= 30 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} 
                       style={{ width: `${(myGami.hp / myGami.MAX_HP) * 100}%` }}
                     />
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievements, Leaderboard & Shop - UI is mostly unchanged but logic is now functional */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-900/5">
         <div className="flex items-center gap-3 mb-6">
            <Medal className="w-6 h-6 text-indigo-500" />
           <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Tus Medallas & Logros</h3>
         </div>
         <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {myGami?.unlockedBadges.map((badge) => {
              const Icon = IconMap[badge.icon] || Star;
              return (
                <div key={badge.id} className={`rounded-3xl p-4 flex flex-col items-center justify-center gap-3 border transition-all duration-300 ${badge.unlocked ? `${badge.bg} border-transparent shadow-md` : 'bg-slate-50 border-slate-100 opacity-40 grayscale'}`}>
                   <Icon className={`w-8 h-8 ${badge.color}`} />
                   <div className="text-center">
                     <span className="text-xs font-black uppercase tracking-tight text-slate-700 block leading-tight">{badge.label}</span>
                     <span className="text-[9px] font-bold text-slate-500 leading-tight mt-1 max-w-[120px] text-center mx-auto block">{badge.req}</span>
                   </div>
                </div>
              );
            })}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {leaderboard.length > 0 && (
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-900/5 p-8 h-fit">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Top de la Clase</h3>
            </div>
            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((student, idx) => {
                const isMe = student.id === user?.id;
                return (
                  <div key={student.id} className={`flex items-center justify-between p-4 rounded-2xl border ${isMe ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-white text-slate-400'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <span className="font-black text-slate-800 text-lg flex items-center gap-2">
                          {student.name} {isMe && "(Tú)"}
                          {student.house && <span className="text-xl" title={student.house.name}>{student.house.icon}</span>}
                        </span>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{student.rank.name} • Lvl {student.level}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-2xl font-black text-slate-900 tracking-tighter">{student.xp}</span>
                        <span className="text-xs font-bold text-slate-400 ml-1">XP</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rewards.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-[40px] border border-yellow-100 shadow-xl shadow-yellow-900/5 p-8 h-fit">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-orange-500" />
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tienda Notyx</h3>
              </div>
              <div className="bg-white px-4 py-2 rounded-2xl flex items-center gap-2 border border-yellow-200 shadow-sm">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tus Coins</span>
                 <span className="text-xl font-black text-yellow-600">{notyxCoins}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {rewards.slice(0, 4).map(reward => {
                  const isBought = myPurchases.some(p => p.reward_id === reward.id && p.status === 'pending');
                  const canAfford = notyxCoins >= reward.cost_coins;
                  return (
                     <div key={reward.id} className="bg-white rounded-3xl p-5 border border-yellow-100 shadow-md flex flex-col">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4 text-2xl">
                          <RewardIcon reward={reward} name={reward.name} icon={reward.icon} className="w-6 h-6 text-orange-600" textClassName="text-2xl" />
                        </div>
                        <h4 className="font-black text-slate-800 text-lg mb-1">{reward.name}</h4>
                       <p className="text-xs text-slate-500 font-medium mb-6 flex-1">{reward.description}</p>
                       <Button 
                         onClick={() => handleBuy(reward)}
                         disabled={isBought || !canAfford}
                          className={`w-full rounded-xl font-black uppercase tracking-widest text-[10px] py-6 ${isBought ? 'bg-emerald-100 text-emerald-800' : canAfford ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900' : 'bg-slate-100 text-slate-400'}`}
                       >
                         {isBought ? "Comprado" : `${reward.cost_coins} Coins`}
                       </Button>
                    </div>
                  );
               })}
            </div>
          </div>
        )}
      </div>

      {/* Student Academic View & Category Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="apple-segmented-control w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setAcademicSubView("sessions")}
              className={`apple-segmented-item flex items-center justify-center gap-1.5 text-xs font-['Outfit'] font-black uppercase tracking-wider ${
                academicSubView === "sessions" ? "active" : ""
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Por Sesiones</span>
            </button>
            <button
              type="button"
              onClick={() => setAcademicSubView("table")}
              className={`apple-segmented-item flex items-center justify-center gap-1.5 text-xs font-['Outfit'] font-black uppercase tracking-wider ${
                academicSubView === "table" ? "active text-indigo-700 font-black" : ""
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Planilla Completa</span>
            </button>
          </div>
        </div>

        {/* Category Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1 hidden md:inline">Dividir:</span>
          {[
            { key: "all", label: "Todas", count: criteriaCounts.all, icon: null },
            { key: "exam", label: "Exámenes", count: criteriaCounts.exam, icon: "🎯" },
            { key: "assignment", label: "TPs", count: criteriaCounts.assignment, icon: "📄" },
            { key: "class", label: "Clases", count: criteriaCounts.class, icon: "📝" },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-['Outfit'] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                categoryFilter === cat.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
              }`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${categoryFilter === cat.key ? "bg-white/20 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {filteredSessionsData.length > 0 && (
          <Suspense fallback={
            <div className="h-64 flex items-center justify-center bg-white rounded-[40px] border border-slate-100 p-8 text-slate-400">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-2" /> Cargando estadísticas...
            </div>
          }>
            <SkillsRadar sessions={filteredSessionsData.map(s => ({...s, criteria: s.criteriaWithGrades}))} />
          </Suspense>
        )}

        {academicSubView === "table" ? (
          /* Consolidated Student Grades Matrix Table */
          <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-200/80 shadow-xl shadow-slate-900/5 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-['Outfit'] font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  Sábana de Calificaciones del Alumno
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Desglose exhaustivo de todas tus notas registradas, divididas entre clases y exámenes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200">
                  Total: {allCriteria.filter(c => c.score !== null).length} / {allCriteria.length} evaluados
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                    <th className="text-left px-6 py-4 font-['Outfit'] font-black text-[11px] uppercase tracking-wider text-slate-700">
                      Fecha / Sesión
                    </th>
                    <th className="text-center px-4 py-4 font-['Outfit'] font-black text-[11px] uppercase tracking-wider text-slate-700">
                      Cuatrimestre
                    </th>
                    <th className="text-left px-6 py-4 font-['Outfit'] font-black text-[11px] uppercase tracking-wider text-slate-700">
                      Evaluación
                    </th>
                    <th className="text-center px-6 py-4 font-['Outfit'] font-black text-[11px] uppercase tracking-wider text-slate-700">
                      Nota
                    </th>
                    <th className="text-center px-6 py-4 font-['Outfit'] font-black text-[11px] uppercase tracking-wider text-slate-700">
                      Máximo
                    </th>
                    <th className="text-center px-6 py-4 font-['Outfit'] font-black text-[11px] uppercase tracking-wider text-slate-700">
                      Rendimiento
                    </th>
                    <th className="text-right px-6 py-4 font-['Outfit'] font-black text-[11px] uppercase tracking-wider text-slate-700">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allCriteria
                    .filter(c => categoryFilter === "all" || c.type === categoryFilter)
                    .map(crit => {
                      const numScore = crit.score !== null ? Number(crit.score) : null;
                      const pct = numScore !== null && crit.max_score > 0 ? numScore / crit.max_score : 0;
                      return (
                        <tr key={crit.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">
                            {format(new Date(crit.sessionDate + "T12:00:00"), "d 'de' MMMM", { locale: es })}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                              crit.cuatrimestre === 2 
                                ? "bg-purple-100 text-purple-700 border-purple-200" 
                                : "bg-blue-100 text-blue-700 border-blue-200"
                            }`}>
                              {crit.cuatrimestre}ºC
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${crit.meta.badgeClass}`}>
                                {crit.meta.icon} {crit.meta.shortLabel}
                              </span>
                              <span className="font-['Outfit'] font-extrabold text-slate-900 text-base">
                                {crit.cleanName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {numScore !== null ? (
                              <span className={`font-['Outfit'] font-black text-xl ${
                                pct >= 0.7 ? "text-emerald-700" : pct >= 0.4 ? "text-amber-700" : "text-rose-700"
                              }`}>
                                {crit.score}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold text-sm">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-400">
                            {crit.max_score}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {numScore !== null ? (
                              <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                {Math.round(pct * 100)}%
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-xl ${
                              numScore === null
                                ? "bg-slate-100 text-slate-400"
                                : pct >= 0.7
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : pct >= 0.4
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}>
                              {numScore === null ? "Pendiente" : pct >= 0.7 ? "Excelente" : pct >= 0.4 ? "Regular" : "A Reforzar"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Session by Session Cards with Clean Names & Badges */
          filteredSessionsData.map(session => {
            const sessionGami = myGami?.sessionScores?.find(s => s.id === session.id);
            const visibleCrits = session.criteriaWithGrades.filter(
              crit => categoryFilter === "all" || crit.type === categoryFilter
            );
            if (visibleCrits.length === 0 && categoryFilter !== "all") return null;

            return (
              <div key={session.id} className={`bg-white rounded-[40px] border shadow-xl shadow-slate-900/5 overflow-hidden ${sessionGami?.died ? 'border-red-200' : 'border-slate-100'}`}>
                <div className={`border-b px-6 sm:px-10 py-6 sm:py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${sessionGami?.died ? 'bg-red-50' : 'bg-slate-50/50'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Registro de Sesión</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                        (session.cuatrimestre || (new Date(session.date).getMonth() >= 6 ? 2 : 1)) === 2 
                          ? "bg-purple-50 text-purple-700 border-purple-200" 
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {(session.cuatrimestre || (new Date(session.date).getMonth() >= 6 ? 2 : 1))}º Cuatrimestre
                      </span>
                    </div>
                    <h3 className="capitalize text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {format(new Date(session.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                    </h3>
                  </div>
                  {sessionGami && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border ${sessionGami.hpChange > 0 ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                       <Heart className={`w-4 h-4 ${sessionGami.hpChange > 0 ? 'fill-green-500' : 'fill-red-500'}`} />
                       {sessionGami.hpChange > 0 ? '+' : ''}{sessionGami.hpChange} HP
                    </div>
                  )}
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30 border-b border-slate-50">
                        <th className="text-left px-6 sm:px-10 py-5 font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Criterio / Evaluación</th>
                        <th className="text-center px-6 py-5 font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Nota</th>
                        <th className="text-right px-6 sm:px-10 py-5 font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {visibleCrits.map(crit => (
                        <tr key={crit.id} className="hover:bg-slate-50/50">
                          <td className="px-6 sm:px-10 py-6 font-black text-slate-800">
                            <div className="flex items-center gap-2.5">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${crit.meta.badgeClass}`}>
                                {crit.meta.icon} {crit.meta.shortLabel}
                              </span>
                              <span className="text-slate-900 font-extrabold text-base">{crit.cleanName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center font-black text-2xl">
                            {crit.score !== null ? crit.score : '--'} <span className="text-xs text-slate-300">/ {crit.max_score}</span>
                          </td>
                          <td className="px-6 sm:px-10 py-6 text-right">
                             <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl ${crit.score !== null ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                              {crit.score !== null ? 'Victoria' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      )}
    </div>
  );
}
