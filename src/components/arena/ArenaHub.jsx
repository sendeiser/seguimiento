import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gamepad2, Swords, Trophy, Zap, Puzzle, Brain, Binary, 
  Crown, Medal, Star, Flame, Sparkles, Play, Shield, 
  Clock, ArrowRight, CheckCircle2, User, ChevronRight, AlertCircle, Coins
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MathBlitzGame from '../games/MathBlitzGame';
import MemoryGame from '../games/MemoryGame';
import SudokuGame from '../games/SudokuGame';
import PyramidGame from '../games/PyramidGame';
import CreateChallengeModal from './CreateChallengeModal';
import DuelBattleModal from './DuelBattleModal';

const GAMES_LIST = [
  { 
    id: 'Math Blitz', 
    name: 'Math Blitz', 
    icon: Zap, 
    color: 'text-orange-500', 
    bg: 'from-orange-500/10 to-amber-500/5', 
    border: 'border-orange-200',
    accentColor: '#f97316',
    desc: 'Cálculo mental ultra rápido contrarreloj en 30 segundos.'
  },
  { 
    id: 'Memory Match', 
    name: 'Memory Match', 
    icon: Puzzle, 
    color: 'text-indigo-500', 
    bg: 'from-indigo-500/10 to-purple-500/5', 
    border: 'border-indigo-200',
    accentColor: '#6366f1',
    desc: 'Encuentra las parejas con agilidad visual y memoria de corto plazo.'
  },
  { 
    id: 'Sudoku', 
    name: 'Sudyx (4x4)', 
    icon: Brain, 
    color: 'text-purple-500', 
    bg: 'from-purple-500/10 to-pink-500/5', 
    border: 'border-purple-200',
    accentColor: '#a855f7',
    desc: 'Desafío de deducción lógica y patrones numéricos.'
  },
  { 
    id: 'Pyramid', 
    name: 'Pyramyx', 
    icon: Binary, 
    color: 'text-emerald-500', 
    bg: 'from-emerald-500/10 to-teal-500/5', 
    border: 'border-emerald-200',
    accentColor: '#10b981',
    desc: 'Construye la pirámide calculando la suma de las bases.'
  }
];

export default function ArenaHub({ 
  classStudentId, 
  classId, 
  studentName = 'Estudiante', 
  avatarUrl = null,
  notyxCoins = 0,
  studentsList = [],
  onRewardEarned
}) {
  const [activeSubTab, setActiveSubTab] = useState('games'); // 'games' | 'duels' | 'leaderboard'
  const [activeGame, setActiveGame] = useState(null); // 'Math Blitz' | 'Memory Match' | 'Sudoku' | 'Pyramid'
  const [gameProgress, setGameProgress] = useState([]);
  const [classRecords, setClassRecords] = useState([]);
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeDuel, setActiveDuel] = useState(null);
  const [selectedLeaderboardGame, setSelectedLeaderboardGame] = useState('Math Blitz');

  useEffect(() => {
    if (classStudentId) {
      fetchArenaData();
    }
  }, [classStudentId, classId]);

  const fetchArenaData = async () => {
    try {
      // 1. My personal records
      const { data: myProg } = await supabase
        .from('student_game_progress')
        .select('*')
        .eq('class_student_id', classStudentId);
      setGameProgress(myProg || []);

      // 2. Class wide records for leaderboards
      if (classId) {
        const { data: cProg } = await supabase
          .from('student_game_progress')
          .select('*, class_students!inner(id, student_name, avatar_url, house_id, class_houses(name, icon, color))')
          .eq('class_students.class_id', classId);
        setClassRecords(cProg || []);

        // 3. Duels for this class involving me
        const { data: duelsData } = await supabase
          .from('challenges')
          .select('*, challenger:class_students!challenges_challenger_cs_id_fkey(id, student_name, avatar_url), challenged:class_students!challenges_challenged_cs_id_fkey(id, student_name, avatar_url)')
          .eq('class_id', classId)
          .or(`challenger_cs_id.eq.${classStudentId},challenged_cs_id.eq.${classStudentId}`)
          .order('created_at', { ascending: false });
        setDuels(duelsData || []);
      }
    } catch (err) {
      console.error('Error fetching arena data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Arena Points & League
  const arenaStats = useMemo(() => {
    const totalGames = gameProgress.reduce((sum, g) => sum + (g.total_games_played || 0), 0);
    const totalScore = gameProgress.reduce((sum, g) => sum + (g.high_score || 0), 0);
    const duelsWon = duels.filter(d => d.status === 'completed' && d.winner_cs_id === classStudentId).length;
    const duelsLost = duels.filter(d => d.status === 'completed' && d.winner_cs_id && d.winner_cs_id !== classStudentId).length;
    
    // Formula: (Total Highscores / 10) + (Duels Won * 30) + (Games played * 2)
    const arenaPoints = Math.floor((totalScore / 10) + (duelsWon * 35) + (totalGames * 3));

    let league = { name: 'Aspirante de Arena', icon: '🥉', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300', nextTier: 100, min: 0 };
    if (arenaPoints >= 500) {
      league = { name: 'Campeón Supremo', icon: '👑', color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-300', nextTier: 1000, min: 500 };
    } else if (arenaPoints >= 250) {
      league = { name: 'Maestro de Arena', icon: '🥇', color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-300', nextTier: 500, min: 250 };
    } else if (arenaPoints >= 100) {
      league = { name: 'Gladiador de Clase', icon: '🥈', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300', nextTier: 250, min: 100 };
    }

    const progressPct = Math.min(100, Math.round(((arenaPoints - league.min) / (league.nextTier - league.min)) * 100));

    return { totalGames, arenaPoints, duelsWon, duelsLost, league, progressPct };
  }, [gameProgress, duels, classStudentId]);

  // Pending incoming duels for me
  const pendingIncomingDuels = useMemo(() => {
    return duels.filter(d => d.challenged_cs_id === classStudentId && d.status === 'pending');
  }, [duels, classStudentId]);

  // Leaderboard data for selected game
  const leaderboardForGame = useMemo(() => {
    const list = classRecords
      .filter(r => r.game_name === selectedLeaderboardGame)
      .sort((a, b) => (b.high_score || 0) - (a.high_score || 0));

    // Deduplicate by student, keeping their best score
    const map = new Map();
    list.forEach(item => {
      const sId = item.class_students?.id;
      if (!map.has(sId) || map.get(sId).high_score < item.high_score) {
        map.set(sId, item);
      }
    });

    return Array.from(map.values()).sort((a, b) => (b.high_score || 0) - (a.high_score || 0));
  }, [classRecords, selectedLeaderboardGame]);

  const handleSoloGameWin = (xp, earnedCoins) => {
    fetchArenaData();
    if (onRewardEarned) {
      onRewardEarned(xp, earnedCoins);
    }
  };

  const handleChallengeCreated = (newDuel) => {
    setDuels(prev => [newDuel, ...prev]);
    setActiveDuel(newDuel); // Immediately opens the battle modal for challenger to play!
  };

  const handleDuelUpdated = (updatedDuel) => {
    setDuels(prev => prev.map(d => d.id === updatedDuel.id ? updatedDuel : d));
    fetchArenaData();
  };

  // If a solo game is currently active
  if (activeGame) {
    return (
      <div className="py-6">
        {activeGame === 'Math Blitz' && (
          <MathBlitzGame 
            studentId={classStudentId} 
            onExit={() => setActiveGame(null)} 
            onWin={handleSoloGameWin} 
          />
        )}
        {activeGame === 'Memory Match' && (
          <MemoryGame 
            studentId={classStudentId} 
            onExit={() => setActiveGame(null)} 
            onWin={handleSoloGameWin} 
          />
        )}
        {activeGame === 'Sudoku' && (
          <SudokuGame 
            studentId={classStudentId} 
            onExit={() => setActiveGame(null)} 
            onWin={handleSoloGameWin} 
          />
        )}
        {activeGame === 'Pyramid' && (
          <PyramidGame 
            studentId={classStudentId} 
            onExit={() => setActiveGame(null)} 
            onWin={handleSoloGameWin} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Header Banner & Arena League Card */}
      <div className="relative rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 text-white shadow-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-rose-500/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-[1.8rem] bg-gradient-to-tr from-rose-500 to-indigo-600 p-0.5 shadow-xl flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-900/80 backdrop-blur-md rounded-[1.7rem] flex items-center justify-center">
                <Gamepad2 className="w-10 h-10 text-rose-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Arena Competitiva
                </span>
                <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" /> {notyxCoins} Coins
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-['Outfit'] font-black tracking-tight leading-none text-white">
                Coliseo Notyx
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm font-medium mt-1">
                Reta a tus compañeros en duelos 1v1, rompe récords y domina el Salón de la Fama.
              </p>
            </div>
          </div>

          {/* Action CTA & League Badge */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-3 shadow-inner">
              <span className="text-2xl">{arenaStats.league.icon}</span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block leading-none">
                  Tu Rango
                </span>
                <span className="text-sm font-black text-white leading-tight">
                  {arenaStats.league.name}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex-1 sm:flex-initial h-14 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-['Outfit'] font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2.5 shadow-xl shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              <span>Desafiar Compañero</span>
            </button>
          </div>
        </div>

        {/* Level & Arena XP Bar */}
        <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Puntos de Arena: <strong className="text-white font-black">{arenaStats.arenaPoints} AP</strong>
            </span>
            <span className="text-slate-400">
              Duelos: <strong className="text-emerald-400">{arenaStats.duelsWon}W</strong> - <strong className="text-rose-400">{arenaStats.duelsLost}L</strong>
            </span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 backdrop-blur-sm">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 rounded-full transition-all duration-700" 
              style={{ width: `${arenaStats.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Alert for Pending Incoming Duels */}
      {pendingIncomingDuels.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-xl shadow-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Swords className="w-6 h-6 animate-pulse text-white" />
            </div>
            <div>
              <h4 className="font-black text-lg leading-tight">
                ¡Tienes {pendingIncomingDuels.length} desafío{pendingIncomingDuels.length > 1 ? 's' : ''} pendiente{pendingIncomingDuels.length > 1 ? 's' : ''}!
              </h4>
              <p className="text-xs text-rose-100 font-medium">
                Un compañero te retó a un duelo de habilidad con monedas en juego.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('duels')}
            className="w-full sm:w-auto h-11 px-6 rounded-xl bg-white text-rose-600 font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-all shadow-md shrink-0"
          >
            Ver Desafíos
          </button>
        </div>
      )}

      {/* 3. Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80 max-w-md">
        <button
          type="button"
          onClick={() => setActiveSubTab('games')}
          className={`flex-1 py-3 rounded-xl font-['Outfit'] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'games' 
              ? 'bg-white text-slate-900 shadow-md shadow-slate-200/60' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Gamepad2 className="w-4 h-4 text-rose-500" />
          <span>Minijuegos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('duels')}
          className={`flex-1 py-3 rounded-xl font-['Outfit'] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${
            activeSubTab === 'duels' 
              ? 'bg-white text-slate-900 shadow-md shadow-slate-200/60' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Swords className="w-4 h-4 text-purple-500" />
          <span>Duelos 1v1</span>
          {pendingIncomingDuels.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-200" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('leaderboard')}
          className={`flex-1 py-3 rounded-xl font-['Outfit'] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'leaderboard' 
              ? 'bg-white text-slate-900 shadow-md shadow-slate-200/60' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Ránking</span>
        </button>
      </div>

      {/* 4. Tab: SOLO RANKED MINIGAMES */}
      {activeSubTab === 'games' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {GAMES_LIST.map(game => {
              const Icon = game.icon;
              const myRecord = gameProgress.find(p => p.game_name === game.id);
              const bestInClass = classRecords
                .filter(r => r.game_name === game.id)
                .sort((a, b) => (b.high_score || 0) - (a.high_score || 0))[0];

              return (
                <div 
                  key={game.id}
                  className="group relative bg-white rounded-[2.5rem] p-7 border-2 border-slate-100 hover:border-indigo-200 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 bg-gradient-to-br ${game.bg} opacity-50 group-hover:scale-125 transition-transform duration-500`} />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                        <Icon className={`w-8 h-8 ${game.color}`} />
                      </div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200/60 text-slate-500">
                        Ranked
                      </span>
                    </div>

                    <h3 className="font-['Outfit'] font-black text-2xl text-slate-900 tracking-tight mb-2">
                      {game.name}
                    </h3>
                    <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                      {game.desc}
                    </p>

                    {/* Stats Pill Box */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 mb-6">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                          Tu Récord
                        </span>
                        <span className="text-base font-black text-slate-800">
                          {myRecord ? `${myRecord.high_score} pts` : 'Sin jugar'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                          Rey de Clase
                        </span>
                        <span className="text-base font-black text-amber-600 truncate block" title={bestInClass ? `${bestInClass.class_students?.student_name} (${bestInClass.high_score} pts)` : 'Nadie'}>
                          {bestInClass ? `${bestInClass.high_score} pts` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveGame(game.id)}
                    className="relative z-10 w-full h-14 rounded-2xl font-['Outfit'] font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-indigo-600 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Jugar Ahora</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Tab: 1v1 DUELS */}
      {activeSubTab === 'duels' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Section: Incoming Duels */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-['Outfit'] font-black text-xl text-slate-900 tracking-tight flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500" />
                Desafíos Recibidos
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {pendingIncomingDuels.length} esperando respuesta
              </span>
            </div>

            {pendingIncomingDuels.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-slate-100 text-center text-slate-400 text-xs font-medium shadow-sm">
                No tienes desafíos pendientes por responder. ¡Sé tú quien reta a un compañero!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingIncomingDuels.map(duel => (
                  <div 
                    key={duel.id}
                    className="bg-white rounded-3xl p-6 border-2 border-rose-200 shadow-xl shadow-rose-500/5 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 overflow-hidden flex items-center justify-center font-black text-rose-600">
                          {duel.challenger?.avatar_url ? (
                            <img src={duel.challenger.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            duel.challenger?.student_name?.charAt(0) || 'R'
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">
                            {duel.challenger?.student_name}
                          </span>
                          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
                            Te retó a {duel.game_name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-black text-xs">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span>{(duel.wager_coins || 10) * 2}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span>Dificultad: <strong className="text-slate-800 capitalize">{duel.difficulty}</strong></span>
                      <span>Rival marcó: <strong className="text-rose-600 font-black">{duel.challenger_score} pts</strong></span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveDuel(duel)}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-['Outfit'] font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <Swords className="w-4 h-4" />
                      <span>¡Aceptar y Competir!</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Duel History / Sent Duels */}
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 tracking-tight mb-4 px-1 flex items-center gap-2">
              <Swords className="w-5 h-5 text-indigo-500" />
              Historial de Duelos
            </h3>

            {duels.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-slate-100 text-center text-slate-400 text-xs font-medium">
                No hay duelos registrados en esta clase aún.
              </div>
            ) : (
              <div className="space-y-3">
                {duels.map(d => {
                  const isMeChallenger = d.challenger_cs_id === classStudentId;
                  const opponent = isMeChallenger ? d.challenged : d.challenger;
                  const isFinished = d.status === 'completed';
                  const didIWin = isFinished && d.winner_cs_id === classStudentId;
                  const didILose = isFinished && d.winner_cs_id && d.winner_cs_id !== classStudentId;
                  const isTie = isFinished && !d.winner_cs_id;

                  return (
                    <div 
                      key={d.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-4 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                          didIWin ? 'bg-amber-100 text-amber-700' : didILose ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {didIWin ? '🏆' : didILose ? '💀' : isTie ? '🤝' : '⏳'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-900 text-sm truncate">
                            VS {opponent?.student_name || 'Compañero'}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {d.game_name} • {d.difficulty} • Apuesta: {d.wager_coins} Coins
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isFinished ? (
                          <div className="text-right">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider block ${
                              didIWin ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : didILose ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {didIWin ? '+ Victoria' : didILose ? '- Derrota' : 'Empate'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                              {d.challenger_score} vs {d.challenged_score}
                            </span>
                          </div>
                        ) : d.status === 'pending_challenger' && isMeChallenger ? (
                          <button
                            type="button"
                            onClick={() => setActiveDuel(d)}
                            className="px-4 py-2 rounded-xl bg-rose-500 text-white font-black text-xs uppercase tracking-wider hover:bg-rose-600 transition-all"
                          >
                            Jugar Turno
                          </button>
                        ) : (
                          <span className="px-3 py-1 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            Esperando rival
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Tab: LEADERBOARD / SALON DE LA FAMA */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Game Selector Chips */}
          <div className="flex flex-wrap gap-2">
            {GAMES_LIST.map(game => (
              <button
                key={game.id}
                type="button"
                onClick={() => setSelectedLeaderboardGame(game.id)}
                className={`px-4 py-2.5 rounded-2xl font-['Outfit'] font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-2 ${
                  selectedLeaderboardGame === game.id
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <game.icon className="w-4 h-4" />
                <span>{game.name}</span>
              </button>
            ))}
          </div>

          {/* Podium Top 3 */}
          {leaderboardForGame.length >= 2 && (
            <div className="flex items-end justify-center gap-3 sm:gap-6 pt-10 pb-4">
              {/* 2nd Place */}
              {leaderboardForGame[1] && (
                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-100 border-4 border-slate-300 shadow-lg overflow-hidden mb-2 relative">
                    {leaderboardForGame[1].class_students?.avatar_url ? (
                      <img src={leaderboardForGame[1].class_students.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-xl text-slate-400">
                        {leaderboardForGame[1].class_students?.student_name?.charAt(0)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-slate-300 text-slate-800 text-[10px] font-black flex items-center justify-center shadow">
                      2
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-800 truncate w-full text-center">
                    {leaderboardForGame[1].class_students?.student_name}
                  </span>
                  <span className="text-[10px] font-black text-slate-500">
                    {leaderboardForGame[1].high_score} pts
                  </span>
                  <div className="w-full h-16 bg-slate-200/80 rounded-t-2xl mt-2 flex items-center justify-center font-black text-slate-500">
                    🥈
                  </div>
                </div>
              )}

              {/* 1st Place (Crown) */}
              {leaderboardForGame[0] && (
                <div className="flex flex-col items-center flex-1 max-w-[160px] -mt-6">
                  <div className="text-2xl mb-1 animate-bounce">👑</div>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-50 border-4 border-amber-400 shadow-2xl overflow-hidden mb-2 relative">
                    {leaderboardForGame[0].class_students?.avatar_url ? (
                      <img src={leaderboardForGame[0].class_students.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-2xl text-amber-500">
                        {leaderboardForGame[0].class_students?.student_name?.charAt(0)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-amber-400 text-white text-xs font-black flex items-center justify-center shadow">
                      1
                    </span>
                  </div>
                  <span className="text-sm font-black text-slate-900 truncate w-full text-center">
                    {leaderboardForGame[0].class_students?.student_name}
                  </span>
                  <span className="text-xs font-black text-amber-600">
                    {leaderboardForGame[0].high_score} pts
                  </span>
                  <div className="w-full h-24 bg-gradient-to-t from-amber-300 to-amber-200 rounded-t-2xl mt-2 flex items-center justify-center font-black text-2xl shadow-inner">
                    🥇
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {leaderboardForGame[2] && (
                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-50 border-4 border-amber-700/50 shadow-lg overflow-hidden mb-2 relative">
                    {leaderboardForGame[2].class_students?.avatar_url ? (
                      <img src={leaderboardForGame[2].class_students.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-xl text-amber-700">
                        {leaderboardForGame[2].class_students?.student_name?.charAt(0)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-amber-700 text-white text-[10px] font-black flex items-center justify-center shadow">
                      3
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-800 truncate w-full text-center">
                    {leaderboardForGame[2].class_students?.student_name}
                  </span>
                  <span className="text-[10px] font-black text-slate-500">
                    {leaderboardForGame[2].high_score} pts
                  </span>
                  <div className="w-full h-12 bg-amber-100 rounded-t-2xl mt-2 flex items-center justify-center font-black text-slate-500">
                    🥉
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Table */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">#</th>
                  <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Estudiante</th>
                  <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Dificultad</th>
                  <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Récord</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leaderboardForGame.length > 0 ? (
                  leaderboardForGame.map((rec, idx) => {
                    const isMe = rec.class_students?.id === classStudentId;
                    return (
                      <tr key={rec.id} className={`hover:bg-slate-50/50 transition-colors ${isMe ? 'bg-indigo-50/40' : ''}`}>
                        <td className="px-6 py-4 font-black text-xs text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center font-black text-xs text-slate-600">
                              {rec.class_students?.avatar_url ? (
                                <img src={rec.class_students.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                rec.class_students?.student_name?.charAt(0) || 'E'
                              )}
                            </div>
                            <span className="font-black text-sm text-slate-900">
                              {rec.class_students?.student_name} {isMe && '(Tú)'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 capitalize">
                            {rec.difficulty || 'Normal'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-black text-base text-slate-900">
                            {rec.high_score}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 ml-1">pts</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400 font-bold text-xs italic">
                      Aún no hay puntuaciones registradas para {selectedLeaderboardGame}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Challenge Modal */}
      <CreateChallengeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        classId={classId}
        myCsId={classStudentId}
        myStudentName={studentName}
        myCoins={notyxCoins}
        studentsList={studentsList}
        onChallengeCreated={handleChallengeCreated}
      />

      {/* Duel Battle Modal */}
      <DuelBattleModal
        duel={activeDuel}
        onClose={() => setActiveDuel(null)}
        myCsId={classStudentId}
        onDuelUpdated={handleDuelUpdated}
      />
    </div>
  );
}
