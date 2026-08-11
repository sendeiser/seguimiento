import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent } from "../../components/ui/card";
import { Search, Trophy, Medal, Star } from "lucide-react";
import { calculateGamification } from "../../lib/gamificationEngine";

export default function GlobalRanking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchGlobalRanking();
  }, []);

  const fetchGlobalRanking = async () => {
    setLoading(true);
    try {
      const [
        { data: allClassStudents },
        { data: allSessions },
        { data: allCriteria },
        { data: allGrades },
        { data: allAttendance },
        { data: allPurchases }
      ] = await Promise.all([
        supabase.from("class_students").select("id, student_id, student_name, class_id, profiles(full_name)"),
        supabase.from("sessions").select("id, class_id, date"),
        supabase.from("session_criteria").select("id, session_id, name, max_score"),
        supabase.from("grades").select("class_student_id, criteria_id, score"),
        supabase.from("attendance").select("class_student_id, session_id, is_present"),
        supabase.from("student_purchases").select("class_student_id, student_id, rewards(cost_coins)").neq("status", "cancelled")
      ]);

      if (allClassStudents) {
        // Prepare criteria lookup
        const criteriaBySession = (allCriteria || []).reduce((acc, c) => {
          if (!acc[c.session_id]) acc[c.session_id] = [];
          acc[c.session_id].push(c);
          return acc;
        }, {});

        // Prepare sessions lookup
        const sessionsByClass = (allSessions || []).reduce((acc, s) => {
          if (!acc[s.class_id]) acc[s.class_id] = [];
          acc[s.class_id].push({
            ...s,
            criteria: criteriaBySession[s.id] || []
          });
          return acc;
        }, {});

        // Prepare grades and attendance lookup
        const gradesByStudent = (allGrades || []).reduce((acc, g) => {
          if (!acc[g.class_student_id]) acc[g.class_student_id] = {};
          acc[g.class_student_id][g.criteria_id] = g.score;
          return acc;
        }, {});

        const attByStudent = (allAttendance || []).reduce((acc, a) => {
          if (!acc[a.class_student_id]) acc[a.class_student_id] = {};
          acc[a.class_student_id][a.session_id] = a.is_present;
          return acc;
        }, {});

        const spentByStudent = (allPurchases || []).reduce((acc, p) => {
          const sid = p.class_student_id;
          if (sid) {
            acc[sid] = (acc[sid] || 0) + (p.rewards?.cost_coins || 0);
          }
          return acc;
        }, {});

        const globalStats = allClassStudents.map(cs => {
          const studentSessions = sessionsByClass[cs.class_id] || [];
          const studentGrades = gradesByStudent[cs.id] || {};
          const studentAtt = attByStudent[cs.id] || {};
          const spentCoins = spentByStudent[cs.id] || 0;

          const gami = calculateGamification(studentSessions, studentGrades, studentAtt, spentCoins);

          return {
            id: cs.id,
            name: cs.profiles?.full_name || cs.student_name || "Alumno",
            xp: gami.currentXP,
            level: gami.currentLevel,
            rank: gami.rank,
            coins: gami.notyxCoins
          };
        })
        .filter(st => st.xp > 0)
        .sort((a, b) => b.xp - a.xp);

        setRanking(globalStats);
      }
    } catch (err) {
      console.error("Error en ranking global:", err);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="font-black text-blue-600 animate-pulse uppercase tracking-widest text-xs">Calculando Ranking Mundial...</p>
    </div>
  );

  const filteredRanking = ranking.filter(st => st.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Ranking Global Notyx</h1>
           <p className="text-slate-500 font-medium">Los mejores estudiantes de toda la plataforma.</p>
        </div>
        <div className="relative w-full md:w-80">
           <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
           <input 
             type="text" 
             placeholder="Buscar leyenda..." 
             className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm focus:border-blue-400 outline-none transition-all"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      {/* Top 3 Podium */}
      {filteredRanking.length >= 3 && !searchTerm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pt-10 pb-4">
           {/* 2nd Place */}
           <div className="order-2 md:order-1 bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl flex flex-col items-center text-center relative">
              <div className="absolute -top-6 bg-slate-300 text-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-4 border-white">2</div>
              <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-3xl mb-4">🥈</div>
              <h3 className="font-black text-xl text-slate-800 leading-none">{filteredRanking[1].name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{filteredRanking[1].rank.name}</p>
              <div className="mt-4 bg-slate-50 px-4 py-2 rounded-xl text-lg font-black text-slate-700">{filteredRanking[1].xp} XP</div>
           </div>
           {/* 1st Place */}
           <div className="order-1 md:order-2 bg-slate-900 rounded-[32px] md:rounded-[48px] p-6 md:p-10 shadow-2xl shadow-blue-900/20 flex flex-col items-center text-center relative transform md:scale-110 z-10 border-4 border-blue-500/20 min-w-0">
               <div className="absolute -top-8 bg-yellow-400 text-yellow-900 w-16 h-16 rounded-[24px] flex items-center justify-center font-black text-2xl shadow-2xl border-4 border-white">1</div>
              <div className="w-24 h-24 rounded-[32px] bg-blue-600 flex items-center justify-center text-5xl mb-6 shadow-2xl shadow-blue-500/40">👑</div>
              <h3 className="font-black text-2xl text-white leading-none">{filteredRanking[0].name}</h3>
              <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] mt-3">{filteredRanking[0].rank.name}</p>
              <div className="mt-6 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl text-2xl font-black text-yellow-400 border border-white/10">{filteredRanking[0].xp} XP</div>
           </div>
           {/* 3rd Place */}
           <div className="order-3 bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl flex flex-col items-center text-center relative">
              <div className="absolute -top-6 bg-amber-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-4 border-white">3</div>
              <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center text-3xl mb-4">🥉</div>
              <h3 className="font-black text-xl text-slate-800 leading-none">{filteredRanking[2].name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{filteredRanking[2].rank.name}</p>
              <div className="mt-4 bg-slate-50 px-4 py-2 rounded-xl text-lg font-black text-slate-700">{filteredRanking[2].xp} XP</div>
           </div>
        </div>
      )}

      {/* Full List */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                     <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Posición</th>
                     <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Estudiante</th>
                     <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Rango & Nivel</th>
                     <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Poder Total (XP)</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {filteredRanking.map((st, idx) => (
                     <tr key={st.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6">
                           <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {idx + 1}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                                 {st.name[0]}
                              </div>
                              <span className="font-black text-slate-800 text-base">{st.name}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${st.rank.bg} ${st.rank.color}`}>
                                 {st.rank.name}
                              </span>
                              <span className="text-xs font-bold text-slate-400">Lvl {st.level}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <span className="text-xl font-black text-slate-900 tracking-tighter">{st.xp}</span>
                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">XP</span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {filteredRanking.length === 0 && (
              <div className="p-20 text-center text-slate-400 font-bold italic">No hay suficientes datos para mostrar el ranking aún.</div>
            )}
         </div>
      </div>
    </div>
  );
}
