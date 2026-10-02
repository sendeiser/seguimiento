import { useMemo } from "react";
import {
  Gamepad2,
  Trophy,
  Zap,
  Puzzle,
  Brain,
  Binary,
  Swords,
  BarChart3,
} from "lucide-react";

export default function ClassArenaTab({
  students,
  arenaProgress,
  classDuels,
  getStudentName,
}) {
  const {
    mathLeader,
    memoryLeader,
    sudokuLeader,
    pyramidLeader,
    totalAttempts,
    totalCoinsWagered,
  } = useMemo(() => {
    const getGameLeader = (gameName) => {
      const filtered = arenaProgress.filter(
        (p) => p.game_name === gameName && (p.high_score || 0) > 0
      );
      if (!filtered.length) return null;
      const sorted = [...filtered].sort((a, b) => (b.high_score || 0) - (a.high_score || 0));
      const top = sorted[0];
      const student = students.find((s) => s.id === top.class_student_id);
      return {
        studentName: student ? getStudentName(student) : "Estudiante",
        score: top.high_score,
        difficulty: top.difficulty,
      };
    };

    const math = getGameLeader("Math Blitz");
    const memory = getGameLeader("Memory Match");
    const sudoku = getGameLeader("Sudoku");
    const pyramid = getGameLeader("Pyramid");

    const attempts = arenaProgress.reduce((acc, p) => acc + (p.total_games_played || 0), 0);
    const wagered = classDuels.reduce((acc, d) => acc + ((d.wager_coins || 0) * 2), 0);

    return {
      mathLeader: math,
      memoryLeader: memory,
      sudokuLeader: sudoku,
      pyramidLeader: pyramid,
      totalAttempts: attempts,
      totalCoinsWagered: wagered,
    };
  }, [arenaProgress, classDuels, students, getStudentName]);

  return (
    <div className="space-y-8 animate-in slide-up">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-[3rem] p-8 sm:p-10 text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-[24px] shadow-lg shadow-indigo-500/30">
              <Gamepad2 className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-3 py-0.5 rounded-full">
                  Torneo & Arena
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none mb-2">
                Desempeño en la Arena
              </h2>
              <p className="text-indigo-200/80 font-medium text-sm">
                Supervisión en vivo de récords, monarcas de clase y duelos 1v1 con monedas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center min-w-[100px]">
              <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">Partidas</span>
              <span className="text-2xl font-black text-white">{totalAttempts}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center min-w-[100px]">
              <span className="text-xs text-amber-300 font-bold uppercase tracking-wider block">Duelos 1v1</span>
              <span className="text-2xl font-black text-amber-300">{classDuels.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center min-w-[120px]">
              <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider block">En Juego</span>
              <span className="text-2xl font-black text-emerald-400">🪙 {totalCoinsWagered}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 REYES DE LA ARENA (CHAMPIONS BENTO) */}
      <div>
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Monarcas Actuales de la Clase</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Récords más altos registrados</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Math Blitz */}
          <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-xl -translate-y-8 translate-x-8" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                Math Blitz
              </span>
            </div>
            {mathLeader ? (
              <div className="relative z-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rey del Cálculo</p>
                <h4 className="text-lg font-black text-slate-900 truncate">{mathLeader.studentName}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-black text-amber-500">{mathLeader.score}</span>
                  <span className="text-xs font-bold text-slate-400">pts</span>
                </div>
              </div>
            ) : (
              <div className="relative z-10 py-2">
                <p className="text-xs font-bold text-slate-400">Aún sin rey coronado</p>
                <p className="text-xs text-slate-300 italic mt-1">Nadie jugó este minijuego</p>
              </div>
            )}
          </div>

          {/* Memory Match */}
          <div className="bg-white rounded-3xl p-5 border border-indigo-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-xl -translate-y-8 translate-x-8" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                <Puzzle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                Memory
              </span>
            </div>
            {memoryLeader ? (
              <div className="relative z-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mente Fotográfica</p>
                <h4 className="text-lg font-black text-slate-900 truncate">{memoryLeader.studentName}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-black text-indigo-600">{memoryLeader.score}</span>
                  <span className="text-xs font-bold text-slate-400">pts</span>
                </div>
              </div>
            ) : (
              <div className="relative z-10 py-2">
                <p className="text-xs font-bold text-slate-400">Aún sin rey coronado</p>
                <p className="text-xs text-slate-300 italic mt-1">Nadie jugó este minijuego</p>
              </div>
            )}
          </div>

          {/* Sudoku */}
          <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full blur-xl -translate-y-8 translate-x-8" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                Sudoku
              </span>
            </div>
            {sudokuLeader ? (
              <div className="relative z-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gran Estratega</p>
                <h4 className="text-lg font-black text-slate-900 truncate">{sudokuLeader.studentName}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-black text-purple-600">{sudokuLeader.score}</span>
                  <span className="text-xs font-bold text-slate-400">pts</span>
                </div>
              </div>
            ) : (
              <div className="relative z-10 py-2">
                <p className="text-xs font-bold text-slate-400">Aún sin rey coronado</p>
                <p className="text-xs text-slate-300 italic mt-1">Nadie jugó este minijuego</p>
              </div>
            )}
          </div>

          {/* Pyramid */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-xl -translate-y-8 translate-x-8" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Binary className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                Pyramid
              </span>
            </div>
            {pyramidLeader ? (
              <div className="relative z-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cúspide Aritmética</p>
                <h4 className="text-lg font-black text-slate-900 truncate">{pyramidLeader.studentName}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-black text-emerald-600">{pyramidLeader.score}</span>
                  <span className="text-xs font-bold text-slate-400">pts</span>
                </div>
              </div>
            ) : (
              <div className="relative z-10 py-2">
                <p className="text-xs font-bold text-slate-400">Aún sin rey coronado</p>
                <p className="text-xs text-slate-300 italic mt-1">Nadie jugó este minijuego</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1V1 DUELS SECTION */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Duelos 1v1 Disputados en la Clase</h3>
              <p className="text-xs text-slate-400 font-medium">Batallas cara a cara con apuestas de Notyx Coins</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">
            {classDuels.length} {classDuels.length === 1 ? "Duelo" : "Duelos"}
          </span>
        </div>

        {classDuels.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Enfrentamiento</th>
                  <th className="px-6 py-4">Juego & Dificultad</th>
                  <th className="px-6 py-4 text-center">Puntajes</th>
                  <th className="px-6 py-4 text-center">Apuesta</th>
                  <th className="px-6 py-4 text-center">Estado / Ganador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {classDuels.map((duel) => {
                  const challengerSt = students.find((s) => s.id === duel.challenger_cs_id);
                  const challengedSt = students.find((s) => s.id === duel.challenged_cs_id);
                  const challengerName = challengerSt
                    ? getStudentName(challengerSt)
                    : duel.challenger?.student_name || "Retador";
                  const challengedName = challengedSt
                    ? getStudentName(challengedSt)
                    : duel.challenged?.student_name || "Rival";

                  let winnerName = null;
                  if (duel.status === "completed") {
                    if (duel.winner_cs_id === duel.challenger_cs_id) winnerName = challengerName;
                    else if (duel.winner_cs_id === duel.challenged_cs_id) winnerName = challengedName;
                    else winnerName = "Empate";
                  }

                  return (
                    <tr key={duel.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{challengerName}</span>
                          <span className="text-xs font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                            VS
                          </span>
                          <span className="font-bold text-slate-800">{challengedName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">{duel.game_name}</span>
                          <span className="text-[10px] uppercase font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {duel.difficulty}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-2 font-mono font-bold text-xs bg-slate-100 px-3 py-1 rounded-xl">
                          <span
                            className={
                              duel.winner_cs_id === duel.challenger_cs_id
                                ? "text-emerald-600 font-black"
                                : "text-slate-600"
                            }
                          >
                            {duel.challenger_score !== null && duel.challenger_score !== undefined
                              ? duel.challenger_score
                              : "-"}
                          </span>
                          <span className="text-slate-400">:</span>
                          <span
                            className={
                              duel.winner_cs_id === duel.challenged_cs_id
                                ? "text-emerald-600 font-black"
                                : "text-slate-600"
                            }
                          >
                            {duel.challenged_score !== null && duel.challenged_score !== undefined
                              ? duel.challenged_score
                              : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-xl text-xs">
                          🪙 {duel.wager_coins || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {duel.status === "completed" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🏆 {winnerName}
                          </span>
                        ) : duel.status === "pending" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                            ⏳ Esperando rival
                          </span>
                        ) : duel.status === "pending_challenger" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                            ⚔️ Retador jugando
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-500">
                            {duel.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Swords className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
              Aún no se han disputado duelos 1v1 en esta clase
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Los estudiantes pueden retarse entre sí apostando Notyx Coins desde su panel.
            </p>
          </div>
        )}
      </div>

      {/* DETAILED SOLO RECORDS TABLE */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">Registro General de Puntajes</h3>
            <p className="text-xs text-slate-400 font-medium">Historial de récords en modo práctica y clasificatoria</p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">
            {arenaProgress.length} Registros
          </span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Estudiante</th>
              <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Juego</th>
              <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Dificultad</th>
              <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Máximo Récord</th>
              <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Intentos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {arenaProgress.length > 0 ? (
              arenaProgress.map((p) => {
                const student = students.find((s) => s.id === p.class_student_id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <span className="font-black text-slate-800">
                        {student ? getStudentName(student) : "Estudiante Desconocido"}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {p.game_name === "Memory Match" && <Puzzle className="w-4 h-4 text-indigo-500" />}
                        {p.game_name === "Sudoku" && <Brain className="w-4 h-4 text-purple-500" />}
                        {p.game_name === "Pyramid" && <Binary className="w-4 h-4 text-emerald-500" />}
                        {p.game_name === "Math Blitz" && <Zap className="w-4 h-4 text-orange-500" />}
                        <span className="font-bold text-slate-700 text-sm">{p.game_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          p.difficulty === "easy"
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : p.difficulty === "medium"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-red-50 text-red-600 border-red-100"
                        }`}
                      >
                        {p.difficulty === "easy"
                          ? "Principiante"
                          : p.difficulty === "medium"
                          ? "Caballero"
                          : "Leyenda"}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-slate-300" />
                        <span className="font-black text-slate-800">{p.high_score}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-slate-400 font-bold">{p.total_games_played}</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-8 py-20 text-center">
                  <div className="max-w-xs mx-auto">
                    <Gamepad2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                      Aún no hay registros de juegos en esta clase
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
