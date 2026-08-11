import React, { useState, useEffect } from 'react';
import { Binary, RotateCcw, Trophy, ArrowLeft, Star, Calculator, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

const LEVELS = {
  easy: { size: 3, label: 'Principiante', xp: 40 },
  medium: { size: 4, label: 'Caballero', xp: 80 },
  hard: { size: 5, label: 'Leyenda', xp: 150 }
};

export default function PyramidGame({ studentId, onExit, onWin }) {
  const [rows, setRows] = useState([]);
  const [difficulty, setDifficulty] = useState('easy');
  const [status, setStatus] = useState('playing'); // playing, won

  useEffect(() => {
    generateGame();
  }, [difficulty]);

  const generateGame = () => {
    const size = LEVELS[difficulty].size;
    const pyramid = [];
    
    // Generate bottom row
    const bottomRow = Array.from({ length: size }, () => Math.floor(Math.random() * 10) + 1);
    pyramid.push(bottomRow.map(v => ({ val: v, fixed: true, current: v })));

    // Generate upper rows
    for (let i = 1; i < size; i++) {
      const prevRow = pyramid[i - 1];
      const nextRow = [];
      for (let j = 0; j < prevRow.length - 1; j++) {
        const sum = prevRow[j].val + prevRow[j+1].val;
        nextRow.push({ val: sum, fixed: true, current: sum });
      }
      pyramid.push(nextRow);
    }

    // Hide some cells
    pyramid.forEach((row, rIdx) => {
      row.forEach((cell, cIdx) => {
        if (Math.random() > 0.5) {
          cell.fixed = false;
          cell.current = '';
        }
      });
    });

    // Ensure at least one cell in each row is hidden, and some fixed
    // (Simpler logic for now: just randomizing)
    
    setRows(pyramid.reverse()); // Show top down
    setStatus('playing');
  };

  const handleInputChange = (rIdx, cIdx, val) => {
    if (status === 'won') return;
    const newRows = [...rows];
    newRows[rIdx][cIdx].current = parseInt(val) || '';
    setRows(newRows);
    checkWin(newRows);
  };

  const checkWin = (currentRows) => {
    const isFull = currentRows.every(row => row.every(cell => cell.current !== ''));
    if (!isFull) return;

    const isCorrect = currentRows.every(row => row.every(cell => cell.current === cell.val));
    if (isCorrect) {
      setStatus('won');
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      saveProgress();
      if (onWin) onWin(LEVELS[difficulty].xp);
    }
  };

  const saveProgress = async () => {
    const score = LEVELS[difficulty].xp * 10;
    const { data: existing } = await supabase
      .from('student_game_progress')
      .select('*')
      .eq('class_student_id', studentId)
      .eq('game_name', 'Pyramid')
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
          game_name: 'Pyramid',
          difficulty: difficulty,
          high_score: score,
          total_games_played: 1
        }]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-10 animate-in zoom-in duration-500">
      <div className="w-full flex items-center justify-between">
        <button onClick={onExit} className="flex items-center gap-2 text-slate-400 font-black uppercase text-[10px] hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a la Arena
        </button>
        <select 
          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-black text-[10px] uppercase outline-none focus:border-emerald-400"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          disabled={status === 'won'}
        >
          {Object.keys(LEVELS).map(l => <option key={l} value={l}>{LEVELS[l].label}</option>)}
        </select>
      </div>

      <div className="relative">
        <div className="flex flex-col items-center gap-4">
          {rows.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-4">
              {row.map((cell, cIdx) => (
                <div key={cIdx} className="relative group">
                   <input
                     type="text"
                     value={cell.current}
                     readOnly={cell.fixed}
                     onChange={(e) => handleInputChange(rIdx, cIdx, e.target.value)}
                     className={`
                       w-14 h-14 md:w-16 md:h-16 rounded-2xl text-center font-black text-xl transition-all outline-none
                       ${cell.fixed ? 'bg-slate-100 text-slate-400 border-2 border-slate-200' : 'bg-white text-emerald-600 border-4 border-emerald-100 focus:border-emerald-500 shadow-xl'}
                       ${status === 'won' && !cell.fixed ? 'bg-emerald-50 border-emerald-400' : ''}
                     `}
                   />
                </div>
              ))}
            </div>
          ))}
        </div>

        {status === 'won' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-[3rem] animate-in fade-in zoom-in">
             <div className="bg-emerald-100 p-6 rounded-full mb-4 text-emerald-600 shadow-xl"><Trophy className="w-12 h-12" /></div>
             <h3 className="text-3xl font-black text-slate-800 tracking-tight">¡Pirámide Completada!</h3>
             <div className="flex items-center gap-3 bg-amber-100 px-6 py-3 rounded-2xl border border-amber-200 mt-4">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span className="font-black text-amber-700">+{LEVELS[difficulty].xp} XP</span>
             </div>
             <button onClick={generateGame} className="mt-8 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 transition-all shadow-xl">
               <RotateCcw className="w-4 h-4" /> Nueva Pirámide
             </button>
          </div>
        )}
      </div>

      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] max-w-sm">
         <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-5 h-5 text-emerald-500" />
            <h4 className="font-black text-emerald-800 text-sm uppercase tracking-widest">Reglas de Pyramyx</h4>
         </div>
         <p className="text-[11px] text-emerald-600 font-medium leading-relaxed italic">
            Cada número es la suma de los dos números que están directamente debajo de él. ¡Usa tu lógica para completar la pirámide!
         </p>
      </div>
    </div>
  );
}
