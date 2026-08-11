import React, { useState, useEffect } from 'react';
import { Brain, RotateCcw, CheckCircle2, Trophy, ArrowLeft, Timer, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

const LEVELS = {
  easy: { empty: 6, label: 'Principiante', xp: 50 },
  medium: { empty: 9, label: 'Caballero', xp: 100 },
  hard: { empty: 11, label: 'Leyenda', xp: 200 }
};

export default function SudokuGame({ studentId, onExit, onWin }) {
  const [grid, setGrid] = useState([]);
  const [initialGrid, setInitialGrid] = useState([]);
  const [selected, setSelected] = useState(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [status, setStatus] = useState('playing'); // playing, won
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
    // 4x4 Sudoku logic
    const base = [1, 2, 3, 4];
    const fullGrid = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 3, 4, 1],
      [4, 1, 2, 3]
    ];
    
    // Shuffle rows and cols within blocks
    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
    const rowIdx = [0, 1, 2, 3];
    const newGrid = rowIdx.map(r => fullGrid[r].slice());
    
    // Remove cells based on difficulty
    const finalGrid = newGrid.map(r => r.map(c => ({ val: c, fixed: true, current: c })));
    let count = LEVELS[difficulty].empty;
    while (count > 0) {
      const r = Math.floor(Math.random() * 4);
      const c = Math.floor(Math.random() * 4);
      if (finalGrid[r][c].fixed) {
        finalGrid[r][c].fixed = false;
        finalGrid[r][c].current = null;
        count--;
      }
    }
    
    setGrid(finalGrid);
    setInitialGrid(JSON.parse(JSON.stringify(finalGrid)));
    setStatus('playing');
    setTime(0);
    setTimerActive(true);
  };

  const handleCellClick = (r, c) => {
    if (grid[r][c].fixed || status === 'won') return;
    setSelected({ r, c });
  };

  const handleNumberInput = (num) => {
    if (!selected || status === 'won') return;
    const newGrid = [...grid];
    newGrid[selected.r][selected.c].current = num;
    setGrid(newGrid);
    checkWin(newGrid);
  };

  const checkWin = (currentGrid) => {
    const isFull = currentGrid.every(r => r.every(c => c.current !== null));
    if (!isFull) return;

    const isCorrect = currentGrid.every(r => r.every(c => c.current === c.val));
    if (isCorrect) {
      setStatus('won');
      setTimerActive(false);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      saveProgress();
      if (onWin) onWin(LEVELS[difficulty].xp);
    }
  };

  const saveProgress = async () => {
    const score = Math.max(1000 - time, 100);
    const { data: existing } = await supabase
      .from('student_game_progress')
      .select('*')
      .eq('class_student_id', studentId)
      .eq('game_name', 'Sudoku')
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
          game_name: 'Sudoku',
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
              <Timer className="w-4 h-4 text-blue-500" />
              <span className="font-black text-slate-700">{formatTime(time)}</span>
           </div>
           <select 
             className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-black text-[10px] uppercase outline-none focus:border-blue-400"
             value={difficulty}
             onChange={(e) => setDifficulty(e.target.value)}
             disabled={status === 'won'}
           >
             {Object.keys(LEVELS).map(l => <option key={l} value={l}>{LEVELS[l].label}</option>)}
           </select>
        </div>
      </div>

      <div className="relative group">
        <div className="grid grid-cols-4 gap-2 bg-slate-200 p-2 rounded-[2rem] shadow-2xl relative z-10">
          {grid.map((row, r) => row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handleCellClick(r, c)}
              className={`
                w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl font-black transition-all
                ${cell.fixed ? 'bg-slate-50 text-slate-400 cursor-default' : 'bg-white text-blue-600 hover:scale-105 active:scale-95 shadow-sm'}
                ${selected?.r === r && selected?.c === c ? 'ring-4 ring-blue-400 ring-offset-2' : ''}
                ${status === 'won' && cell.fixed === false ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' : ''}
              `}
            >
              {cell.current}
            </button>
          )))}
        </div>
        
        {status === 'won' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-[2rem] animate-in fade-in zoom-in">
             <div className="bg-emerald-100 p-6 rounded-full mb-4 text-emerald-600 shadow-xl"><Trophy className="w-12 h-12" /></div>
             <h3 className="text-3xl font-black text-slate-800 tracking-tight">¡Victoria Magistral!</h3>
             <p className="text-slate-500 font-bold mb-6">Completado en {formatTime(time)}</p>
             <div className="flex items-center gap-3 bg-amber-100 px-6 py-3 rounded-2xl border border-amber-200">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span className="font-black text-amber-700">+{LEVELS[difficulty].xp} XP</span>
             </div>
             <button onClick={generateGame} className="mt-8 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 transition-all shadow-xl">
               <RotateCcw className="w-4 h-4" /> Jugar de Nuevo
             </button>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {[1, 2, 3, 4].map(num => (
          <button
            key={num}
            onClick={() => handleNumberInput(num)}
            className="w-16 h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleNumberInput(null)}
          className="w-16 h-16 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-all shadow-sm"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] max-w-sm">
         <div className="flex items-center gap-3 mb-2">
            <Brain className="w-5 h-5 text-blue-500" />
            <h4 className="font-black text-blue-800 text-sm uppercase tracking-widest">Reglas de Sudyx</h4>
         </div>
         <p className="text-[11px] text-blue-600 font-medium leading-relaxed italic">
            Completa la cuadrícula de 4x4 para que cada fila, columna y subcuadrícula de 2x2 contenga los números del 1 al 4 sin repetirse.
         </p>
      </div>
    </div>
  );
}
