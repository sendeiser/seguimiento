import React, { useState, useEffect, useRef } from 'react';
import { Zap, RotateCcw, Trophy, ArrowLeft, Star, Timer, Check, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

const LEVELS = {
  easy: { max: 10, time: 30, xp: 40, label: 'Principiante' },
  medium: { max: 50, time: 30, xp: 80, label: 'Caballero' },
  hard: { max: 100, time: 30, xp: 150, label: 'Leyenda' }
};

export default function MathBlitzGame({ studentId, onExit, onWin }) {
  const [problem, setProblem] = useState({ a: 0, b: 0, op: '+', res: 0 });
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState('easy');
  const [timeLeft, setTimeLeft] = useState(30);
  const [status, setStatus] = useState('playing'); // playing, finished
  const inputRef = useRef(null);

  useEffect(() => {
    startNewGame();
  }, [difficulty]);

  useEffect(() => {
    let interval;
    if (status === 'playing' && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && status === 'playing') {
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [timeLeft, status]);

  const startNewGame = () => {
    setScore(0);
    setTimeLeft(LEVELS[difficulty].time);
    setStatus('playing');
    setInput('');
    generateProblem();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const generateProblem = () => {
    const max = LEVELS[difficulty].max;
    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * max) + 1;
    const ops = ['+', '-'];
    if (difficulty !== 'easy') ops.push('*');
    const op = ops[Math.floor(Math.random() * ops.length)];
    
    let res;
    if (op === '+') res = a + b;
    else if (op === '-') res = a - b;
    else res = a * b;

    setProblem({ a, b, op, res });
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setInput(val);
    
    if (parseInt(val) === problem.res) {
      setScore(s => s + 1);
      setInput('');
      generateProblem();
    }
  };

  const handleFinish = () => {
    setStatus('finished');
    if (score >= 5) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      const xp = Math.min(score * 10, LEVELS[difficulty].xp);
      saveProgress();
      if (onWin) onWin(xp);
    }
  };

  const saveProgress = async () => {
    const { data: existing } = await supabase
      .from('student_game_progress')
      .select('*')
      .eq('class_student_id', studentId)
      .eq('game_name', 'Math Blitz')
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
          game_name: 'Math Blitz',
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
        <div className="flex items-center gap-4">
           <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border shadow-sm transition-colors ${timeLeft < 10 ? 'bg-red-50 border-red-100 text-red-600 animate-pulse' : 'bg-white border-slate-100 text-orange-500'}`}>
              <Timer className="w-4 h-4" />
              <span className="font-black">{timeLeft}s</span>
           </div>
           <select 
             className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-black text-[10px] uppercase outline-none focus:border-orange-400"
             value={difficulty}
             onChange={(e) => setDifficulty(e.target.value)}
             disabled={status === 'finished'}
           >
             {Object.keys(LEVELS).map(l => <option key={l} value={l}>{LEVELS[l].label}</option>)}
           </select>
        </div>
      </div>

      <div className="relative flex flex-col items-center">
        <div className="bg-white rounded-[3rem] p-12 border-4 border-slate-100 shadow-2xl flex flex-col items-center min-w-[300px]">
           <div className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4">Aciertos: {score}</div>
           <div className="text-6xl font-black text-slate-800 mb-10 flex gap-4">
             <span>{problem.a}</span>
             <span className="text-orange-500">{problem.op === '*' ? '×' : problem.op}</span>
             <span>{problem.b}</span>
             <span className="text-slate-300">=</span>
           </div>
           <input
             ref={inputRef}
             type="number"
             value={input}
             onChange={handleInput}
             disabled={status === 'finished'}
             placeholder="?"
             className="w-full bg-slate-50 border-4 border-transparent focus:border-orange-500 rounded-3xl py-6 text-center text-4xl font-black outline-none transition-all placeholder:text-slate-200"
           />
        </div>

        {status === 'finished' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md rounded-[3rem] animate-in fade-in zoom-in">
             <div className="bg-orange-100 p-8 rounded-full mb-6 text-orange-600 shadow-xl"><Zap className="w-16 h-16 fill-orange-600" /></div>
             <h3 className="text-4xl font-black text-slate-800 tracking-tight">¡Blitz Terminado!</h3>
             <p className="text-slate-500 font-bold text-xl mt-2 mb-8">{score} respuestas correctas</p>
             
             {score >= 5 ? (
                <div className="flex items-center gap-3 bg-amber-100 px-8 py-4 rounded-2xl border-2 border-amber-200 animate-bounce">
                   <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                   <span className="font-black text-xl text-amber-700">+{Math.min(score * 10, LEVELS[difficulty].xp)} XP</span>
                </div>
             ) : (
                <p className="text-slate-400 font-bold italic">¡Necesitas al menos 5 para ganar XP!</p>
             )}

             <button onClick={startNewGame} className="mt-10 bg-slate-900 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl flex items-center gap-2">
               <RotateCcw className="w-4 h-4" /> Intentar de Nuevo
             </button>
          </div>
        )}
      </div>

      <div className="bg-orange-50 border border-orange-100 p-6 rounded-[2rem] max-w-sm">
         <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <h4 className="font-black text-orange-800 text-sm uppercase tracking-widest">Reglas de Math Blitz</h4>
         </div>
         <p className="text-[11px] text-orange-600 font-medium leading-relaxed italic">
            Responde tantas operaciones como puedas antes de que se acabe el tiempo. ¡La velocidad es la clave!
         </p>
      </div>
    </div>
  );
}
