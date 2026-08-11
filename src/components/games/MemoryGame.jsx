import React, { useState, useEffect } from 'react';
import { Puzzle, RotateCcw, Trophy, ArrowLeft, Star, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

const LEVELS = {
  easy: { pairs: 6, label: 'Principiante', xp: 30 },
  medium: { pairs: 8, label: 'Caballero', xp: 60 },
  hard: { pairs: 12, label: 'Leyenda', xp: 120 }
};

const ICONS = ['🍎', '🍌', '🍇', '🍓', '🍒', '🍍', '🥝', '🥑', '🍔', '🍕', '🌮', '🍦'];

export default function MemoryGame({ studentId, onExit, onWin }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [difficulty, setDifficulty] = useState('easy');
  const [status, setStatus] = useState('playing');
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    generateGame();
  }, [difficulty]);

  useEffect(() => {
    let interval;
    if (timerActive && status === 'playing') {
      interval = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, status]);

  const generateGame = () => {
    const pairsCount = LEVELS[difficulty].pairs;
    const gameIcons = ICONS.slice(0, pairsCount);
    const deck = [...gameIcons, ...gameIcons]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({ id, icon }));
    
    setCards(deck);
    setFlipped([]);
    setSolved([]);
    setStatus('playing');
    setTime(0);
    setTimerActive(true);
  };

  const handleCardClick = (id) => {
    if (flipped.length === 2 || flipped.includes(id) || solved.includes(id) || status === 'won') return;
    
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].icon === cards[second].icon) {
        const newSolved = [...solved, first, second];
        setSolved(newSolved);
        setFlipped([]);
        if (newSolved.length === cards.length) {
          handleWin();
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  const handleWin = () => {
    setStatus('won');
    setTimerActive(false);
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    saveProgress();
    if (onWin) onWin(LEVELS[difficulty].xp);
  };

  const saveProgress = async () => {
    const score = Math.max(500 - time, 50);
    const { data: existing } = await supabase
      .from('student_game_progress')
      .select('*')
      .eq('class_student_id', studentId)
      .eq('game_name', 'Memory Match')
      .eq('difficulty', difficulty)
      .single();

    if (existing) {
      await supabase
        .from('student_game_progress')
        .update({
          high_score: Math.max(existing.high_score, score),
          total_games_played: existing.total_games_played + 1,
          last_played_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('student_game_progress')
        .insert([{
          class_student_id: studentId,
          game_name: 'Memory Match',
          difficulty: difficulty,
          high_score: score,
          total_games_played: 1
        }]);
    }
  };

  const formatTime = (s) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-8 animate-in zoom-in duration-500">
      <div className="w-full flex items-center justify-between">
        <button onClick={onExit} className="flex items-center gap-2 text-slate-400 font-black uppercase text-[10px] hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a la Arena
        </button>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
              <Timer className="w-4 h-4 text-indigo-500" />
              <span className="font-black text-slate-700">{formatTime(time)}</span>
           </div>
           <select 
             className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-black text-[10px] uppercase outline-none focus:border-indigo-400"
             value={difficulty}
             onChange={(e) => setDifficulty(e.target.value)}
             disabled={status === 'won'}
           >
             {Object.keys(LEVELS).map(l => <option key={l} value={l}>{LEVELS[l].label}</option>)}
           </select>
        </div>
      </div>

      <div className={`grid gap-4 ${difficulty === 'hard' ? 'grid-cols-6' : 'grid-cols-4'}`}>
        {cards.map((card) => {
          const isFlipped = flipped.includes(card.id);
          const isSolved = solved.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`
                w-14 h-14 md:w-20 md:h-20 rounded-2xl text-3xl flex items-center justify-center transition-all duration-500 preserve-3d relative
                ${isFlipped || isSolved ? '[transform:rotateY(180deg)]' : ''}
              `}
            >
              <div className={`absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-white shadow-lg flex items-center justify-center`}>
                <Puzzle className="w-8 h-8 text-white/50" />
              </div>
              <div className={`absolute inset-0 backface-hidden [transform:rotateY(180deg)] rounded-2xl bg-white border-4 border-indigo-100 shadow-xl flex items-center justify-center`}>
                {card.icon}
              </div>
            </button>
          );
        })}
      </div>

      {status === 'won' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in zoom-in">
           <div className="bg-emerald-100 p-8 rounded-full mb-6 text-emerald-600 shadow-2xl"><Trophy className="w-16 h-16" /></div>
           <h3 className="text-4xl font-black text-slate-800 tracking-tight">¡Memoria de Elefante!</h3>
           <p className="text-slate-500 font-bold text-lg mb-8">Tiempo: {formatTime(time)}</p>
           <div className="flex items-center gap-4 bg-amber-100 px-8 py-4 rounded-[2rem] border-4 border-amber-200 mb-10">
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
              <span className="font-black text-2xl text-amber-700">+{LEVELS[difficulty].xp} XP</span>
           </div>
           <div className="flex gap-4">
              <button onClick={generateGame} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl">Jugar de Nuevo</button>
              <button onClick={onExit} className="bg-slate-100 text-slate-600 px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-sm">Cerrar</button>
           </div>
        </div>
      )}
      
      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
