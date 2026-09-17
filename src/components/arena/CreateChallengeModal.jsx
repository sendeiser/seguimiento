import React, { useState } from 'react';
import { Swords, X, Zap, Puzzle, Brain, Binary, Coins, UserCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const GAMES = [
  { id: 'Math Blitz', name: 'Math Blitz', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', desc: 'Cálculo mental veloz contrarreloj (30s)' },
  { id: 'Memory Match', name: 'Memory Match', icon: Puzzle, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200', desc: 'Encuentra las parejas con agilidad visual' },
  { id: 'Sudoku', name: 'Sudyx (4x4)', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200', desc: 'Resolución lógica contra el tiempo' },
  { id: 'Pyramid', name: 'Pyramyx', icon: Binary, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200', desc: 'Cálculo aritmético de pirámide' }
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Principiante', bonus: 'x1.0' },
  { id: 'medium', label: 'Caballero', bonus: 'x1.5' },
  { id: 'hard', label: 'Leyenda', bonus: 'x2.0' }
];

const WAGERS = [10, 25, 50, 100];

export default function CreateChallengeModal({ 
  isOpen, 
  onClose, 
  classId, 
  myCsId, 
  myStudentName, 
  myCoins = 0, 
  studentsList = [],
  onChallengeCreated
}) {
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [selectedGame, setSelectedGame] = useState('Math Blitz');
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [wagerCoins, setWagerCoins] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Filter out self from opponents list
  const availableOpponents = studentsList.filter(s => s.id !== myCsId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedOpponent) {
      setErrorMsg('Por favor selecciona un compañero para desafiar.');
      return;
    }

    if (wagerCoins > myCoins) {
      setErrorMsg(`No tienes suficientes monedas (${myCoins} disponibles).`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Create duel in challenges table
      const { data, error } = await supabase
        .from('challenges')
        .insert([{
          class_id: classId,
          challenger_cs_id: myCsId,
          challenged_cs_id: selectedOpponent.id,
          game_name: selectedGame,
          difficulty: selectedDifficulty,
          wager_coins: wagerCoins,
          challenger_score: 0,
          status: 'pending_challenger', // Challenger needs to play their turn first!
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      if (onChallengeCreated) {
        onChallengeCreated(data);
      }
      onClose();
    } catch (err) {
      console.error('Error creating challenge:', err);
      setErrorMsg(err.message || 'Error al crear el desafío.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Duelo 1 vs 1</h3>
              <p className="text-xs text-slate-500 font-medium">Reta a un compañero y demuestra tu habilidad</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-xs font-bold">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Select Opponent */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              1. Selecciona a tu Oponente
            </label>
            {availableOpponents.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 font-medium">
                No hay otros compañeros disponibles en esta clase todavía.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto p-1">
                {availableOpponents.map(student => {
                  const isSelected = selectedOpponent?.id === student.id;
                  const name = student.student_name || student.profiles?.full_name || 'Compañero';
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedOpponent(student)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-2.5 ${
                        isSelected 
                          ? 'border-rose-500 bg-rose-50/50 shadow-md shadow-rose-500/10' 
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center font-black text-xs text-slate-600 shrink-0">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-800 truncate leading-tight flex-1">
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Select Minigame */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              2. Minijuego del Combate
            </label>
            <div className="grid grid-cols-2 gap-3">
              {GAMES.map(game => {
                const Icon = game.icon;
                const isSelected = selectedGame === game.id;
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setSelectedGame(game.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      isSelected 
                        ? 'border-rose-500 bg-rose-50/40 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${game.color}`} />
                      <span className="font-black text-xs text-slate-800">{game.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{game.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Difficulty */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              3. Nivel de Dificultad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(diff => (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff.id)}
                  className={`py-2.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider border-2 transition-all text-center ${
                    selectedDifficulty === diff.id
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                      : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
                  }`}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Wager Coins */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400">
                4. Apuesta de Notyx Coins
              </label>
              <span className="text-[10px] font-bold text-amber-600">
                Tienes {myCoins} Coins
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {WAGERS.map(coins => {
                const isAffordable = myCoins >= coins;
                return (
                  <button
                    key={coins}
                    type="button"
                    disabled={!isAffordable}
                    onClick={() => setWagerCoins(coins)}
                    className={`py-2.5 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                      wagerCoins === coins 
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm' 
                        : isAffordable 
                          ? 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                          : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>{coins}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedOpponent}
              className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl transition-all ${
                isSubmitting || !selectedOpponent
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-500 to-red-600 text-white hover:scale-[1.02] active:scale-[0.98] shadow-rose-500/25'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>{isSubmitting ? 'Iniciando Duelo...' : '¡Aceptar y Jugar Mi Turno!'}</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center font-medium mt-2">
              Jugarás tu partida ahora para fijar tu puntaje. Luego tu rival recibirá la alerta para responder.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
