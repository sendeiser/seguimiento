import React, { useState } from 'react';
import { Swords, X, Trophy, Coins, Crown, Sparkles, AlertCircle, ArrowLeft, CheckCircle2, Skull } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';
import MathBlitzGame from '../games/MathBlitzGame';
import MemoryGame from '../games/MemoryGame';
import SudokuGame from '../games/SudokuGame';
import PyramidGame from '../games/PyramidGame';

export default function DuelBattleModal({ 
  duel, 
  onClose, 
  myCsId, 
  onDuelUpdated 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [battleResult, setBattleResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!duel) return null;

  const isChallenger = duel.challenger_cs_id === myCsId;
  const isChallenged = duel.challenged_cs_id === myCsId;

  // Check which turn needs to be played
  const challengerNeedsToPlay = isChallenger && (duel.status === 'pending_challenger' || duel.challenger_score === 0);
  const challengedNeedsToPlay = isChallenged && (duel.status === 'pending' || duel.challenged_score === null);

  const opponentName = isChallenger 
    ? (duel.challenged?.student_name || duel.challenged?.profiles?.full_name || 'Rival')
    : (duel.challenger?.student_name || duel.challenger?.profiles?.full_name || 'Rival');

  const myName = isChallenger 
    ? (duel.challenger?.student_name || duel.challenger?.profiles?.full_name || 'Tú')
    : (duel.challenged?.student_name || duel.challenged?.profiles?.full_name || 'Tú');

  const opponentAvatar = isChallenger ? duel.challenged?.avatar_url : duel.challenger?.avatar_url;
  const myAvatar = isChallenger ? duel.challenger?.avatar_url : duel.challenged?.avatar_url;

  const handleScoreSubmitted = async (score) => {
    setIsProcessing(true);
    try {
      if (isChallenger) {
        // Challenger submitted their initial score -> now moves to 'pending' for the challenged student
        const { data, error } = await supabase
          .from('challenges')
          .update({
            challenger_score: score,
            status: 'pending'
          })
          .eq('id', duel.id)
          .select('*, challenger:class_students!challenges_challenger_cs_id_fkey(*), challenged:class_students!challenges_challenged_cs_id_fkey(*)')
          .single();

        if (error) throw error;

        setIsPlaying(false);
        setBattleResult({
          type: 'turn_completed',
          score,
          message: '¡Puntaje registrado! Tu desafío ahora espera la respuesta de ' + opponentName
        });
        if (onDuelUpdated) onDuelUpdated(data);

      } else if (isChallenged) {
        // Challenged student completed their attempt -> Resolve winner!
        const cScore = duel.challenger_score || 0;
        const myScore = score;
        let winnerId = null;

        if (myScore > cScore) {
          winnerId = duel.challenged_cs_id;
        } else if (cScore > myScore) {
          winnerId = duel.challenger_cs_id;
        } else {
          // Tie -> challenger retains advantage or split
          winnerId = null;
        }

        const { data, error } = await supabase
          .from('challenges')
          .update({
            challenged_score: myScore,
            status: 'completed',
            winner_cs_id: winnerId,
            completed_at: new Date().toISOString()
          })
          .eq('id', duel.id)
          .select('*, challenger:class_students!challenges_challenger_cs_id_fkey(*), challenged:class_students!challenges_challenged_cs_id_fkey(*)')
          .single();

        if (error) throw error;

        // Give reward coins to the winner
        if (winnerId) {
          await supabase.from('student_minigame_logs').insert([{
            class_student_id: winnerId,
            game_name: `Duelo 1v1 (${duel.game_name})`,
            reward_coins: (duel.wager_coins || 10) * 2,
            completed_at: new Date().toISOString()
          }]);
        }

        setIsPlaying(false);
        const didIWin = winnerId === myCsId;
        const isTie = winnerId === null;

        if (didIWin) {
          confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 } });
        }

        setBattleResult({
          type: 'battle_finished',
          myScore,
          opponentScore: cScore,
          didIWin,
          isTie,
          pot: (duel.wager_coins || 10) * 2
        });
        if (onDuelUpdated) onDuelUpdated(data);
      }
    } catch (err) {
      console.error('Error submitting duel score:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // If in active minigame screen
  if (isPlaying) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[150] flex flex-col p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto my-auto py-6">
          <div className="flex items-center justify-between mb-6 bg-white/10 px-6 py-3 rounded-2xl border border-white/10 text-white">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-400">
              <Swords className="w-4 h-4" /> Duelo 1 vs 1: {duel.game_name}
            </div>
            <div className="flex items-center gap-2 font-black text-xs text-amber-400">
              <Coins className="w-4 h-4" /> Bote: {(duel.wager_coins || 10) * 2} Coins
            </div>
          </div>

          {duel.game_name === 'Math Blitz' && (
            <MathBlitzGame 
              studentId={myCsId} 
              isDuel={true}
              initialDifficulty={duel.difficulty || 'easy'}
              onExit={() => setIsPlaying(false)}
              onDuelScore={handleScoreSubmitted}
            />
          )}

          {duel.game_name === 'Memory Match' && (
            <MemoryGame 
              studentId={myCsId} 
              isDuel={true}
              initialDifficulty={duel.difficulty || 'easy'}
              onExit={() => setIsPlaying(false)}
              onDuelScore={handleScoreSubmitted}
            />
          )}

          {duel.game_name === 'Sudoku' && (
            <SudokuGame 
              studentId={myCsId} 
              isDuel={true}
              initialDifficulty={duel.difficulty || 'easy'}
              onExit={() => setIsPlaying(false)}
              onDuelScore={handleScoreSubmitted}
            />
          )}

          {duel.game_name === 'Pyramid' && (
            <PyramidGame 
              studentId={myCsId} 
              isDuel={true}
              initialDifficulty={duel.difficulty || 'easy'}
              onExit={() => setIsPlaying(false)}
              onDuelScore={handleScoreSubmitted}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-lg p-6 sm:p-10 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95">
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Finished / Result Screen */}
        {battleResult ? (
          <div className="text-center py-6 animate-in zoom-in">
            {battleResult.type === 'turn_completed' ? (
              <div>
                <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-2">¡Puntaje Registrado!</h3>
                <p className="text-slate-500 text-sm font-medium mb-6">
                  Marcaste un récord de <span className="font-black text-amber-600 text-xl">{battleResult.score} pts</span>.
                </p>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-500 font-medium mb-8">
                  {battleResult.message}
                </div>
                <button 
                  onClick={onClose}
                  className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-lg hover:scale-105 transition-all"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div>
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl ${
                  battleResult.didIWin 
                    ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-amber-500/30' 
                    : battleResult.isTie
                      ? 'bg-blue-500 text-white shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-200'
                }`}>
                  {battleResult.didIWin ? <Trophy className="w-12 h-12" /> : battleResult.isTie ? <Swords className="w-12 h-12" /> : <Skull className="w-12 h-12" />}
                </div>

                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight">
                  {battleResult.didIWin ? '¡Victoria Épica!' : battleResult.isTie ? '¡Empate Técnico!' : 'Derrota en el Duelo'}
                </h3>
                
                <p className="text-slate-500 text-sm font-medium mb-6">
                  {battleResult.didIWin 
                    ? `Venciste a ${opponentName} y te llevas el bote total.` 
                    : battleResult.isTie
                      ? `Ambos empataron con un gran desempeño.`
                      : `${opponentName} superó tu puntaje en esta batalla.`}
                </p>

                {/* Score Comparison Box */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 mb-6">
                  <div className="text-center p-3 rounded-2xl bg-white border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Tu Puntaje</span>
                    <span className="text-2xl font-black text-slate-900">{battleResult.myScore}</span>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-white border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">{opponentName}</span>
                    <span className="text-2xl font-black text-slate-900">{battleResult.opponentScore}</span>
                  </div>
                </div>

                {battleResult.didIWin && (
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 font-black text-base mb-8 shadow-sm">
                    <Coins className="w-5 h-5 text-amber-500" />
                    <span>+{battleResult.pot} Notyx Coins</span>
                  </div>
                )}

                <button 
                  onClick={onClose}
                  className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 transition-all"
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Matchup / VS Card */
          <div>
            <div className="text-center mb-6">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                Arena 1 vs 1 • {duel.game_name}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                Duelo de Habilidad
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Dificultad: <span className="font-bold text-slate-700 capitalize">{duel.difficulty}</span>
              </p>
            </div>

            {/* Avatars Confrontation */}
            <div className="flex items-center justify-between gap-4 my-8 relative">
              {/* Player 1 (Me) */}
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-indigo-50 border-4 border-indigo-200 overflow-hidden flex items-center justify-center font-black text-xl text-indigo-700 shadow-lg">
                  {myAvatar ? (
                    <img src={myAvatar} alt={myName} className="w-full h-full object-cover" />
                  ) : (
                    myName.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="font-black text-sm text-slate-900 mt-2 truncate max-w-[110px]">{myName} (Tú)</span>
                {duel.challenger_score > 0 && isChallenged && (
                  <span className="text-[10px] font-bold text-slate-400">Rival puso: {duel.challenger_score} pts</span>
                )}
              </div>

              {/* VS Emblem */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center font-black text-sm shadow-xl shadow-rose-500/30 shrink-0">
                VS
              </div>

              {/* Player 2 (Opponent) */}
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-rose-50 border-4 border-rose-200 overflow-hidden flex items-center justify-center font-black text-xl text-rose-700 shadow-lg">
                  {opponentAvatar ? (
                    <img src={opponentAvatar} alt={opponentName} className="w-full h-full object-cover" />
                  ) : (
                    opponentName.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="font-black text-sm text-slate-900 mt-2 truncate max-w-[110px]">{opponentName}</span>
                {duel.challenger_score > 0 && isChallenger && (
                  <span className="text-[10px] font-bold text-emerald-600">Marcaste: {duel.challenger_score} pts</span>
                )}
              </div>
            </div>

            {/* Wager Pot */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200/80 mb-8">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-white flex items-center justify-center shadow-md">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block">Bote en Juego</span>
                  <span className="text-xs font-bold text-amber-900">{(duel.wager_coins || 10) * 2} Notyx Coins ({duel.wager_coins || 10} c/u)</span>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-white rounded-xl text-amber-700 shadow-sm border border-amber-100">
                Ganador se lleva todo
              </span>
            </div>

            {/* Action Buttons */}
            {challengerNeedsToPlay ? (
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-rose-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Swords className="w-4 h-4" />
                <span>¡Jugar Mi Turno Ahora!</span>
              </button>
            ) : challengedNeedsToPlay ? (
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Swords className="w-4 h-4" />
                <span>¡Aceptar Desafío y Competir!</span>
              </button>
            ) : duel.status === 'pending' ? (
              <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-500">
                ⏳ Esperando que <span className="text-slate-800 font-black">{opponentName}</span> juegue su intento.
              </div>
            ) : (
              <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-500">
                Este duelo ya ha concluido.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
