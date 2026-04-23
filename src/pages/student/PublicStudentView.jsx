import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  GraduationCap, CheckCircle2, Clock, Award, TrendingUp, Star, 
  ShieldCheck, Trophy, Target, Sparkles, Flame, Crown, Flag, 
  Medal, Heart, ChevronLeft, XCircle, ShoppingBag, Coins as CoinsIcon, 
  Check, AlertCircle, ShoppingCart, Gamepad2, Play, RotateCcw, 
  Brain, Puzzle, Sparkle, Binary, Hash, Zap, Timer, BarChart3, Lock 
} from "lucide-react";
import confetti from "canvas-confetti";
import { calculateGamification } from "../../lib/gamificationEngine";
import { SkillsRadar } from "../../components/ui/SkillsRadar";

export default function PublicStudentView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("progress"); 
  const [purchasing, setPurchasing] = useState(null);
  const [showDniModal, setShowDniModal] = useState(false);
  const [dniInput, setDniInput] = useState("");
  const [selectedReward, setSelectedReward] = useState(null);
  const [dniError, setDniError] = useState("");

  // Arena Games State
  const [activeGame, setActiveGame] = useState(null); // null | 'memory' | 'sudoku'
  
  // Memory Game State
  const [gameCards, setGameCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [canClaimReward, setCanClaimReward] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const GAME_ICONS = ["🐉", "⚔️", "🛡️", "💎", "🏆", "🗝️", "📜", "🔮"];

  // Sudoku State
  const [sudokuGrid, setSudokuGrid] = useState([]);
  const [sudokuInitial, setSudokuInitial] = useState([]);
  const [sudokuSolved, setSudokuSolved] = useState(false);
  const [sudokuError, setSudokuError] = useState("");

  // Pyramid State
  const [pyramidGrid, setPyramidGrid] = useState([]); // [row][col]
  const [pyramidInitial, setPyramidInitial] = useState([]);
  const [pyramidSolved, setPyramidSolved] = useState(false);
  const [pyramidError, setPyramidError] = useState("");

  // Difficulty & Progress
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' | 'medium' | 'hard'
  const [gameProgress, setGameProgress] = useState([]);
  
  // Math Blitz State
  const [blitzProblem, setBlitzProblem] = useState(null);
  const [blitzAnswer, setBlitzAnswer] = useState("");
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzTime, setBlitzTime] = useState(30);
  const [blitzActive, setBlitzActive] = useState(false);
  const [blitzHighScore, setBlitzHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activeUnlocks, setActiveUnlocks] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const spentCoins = data?.purchases?.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + (p.cost_coins || 0), 0) || 0;
  const gami = data?.sessions ? calculateGamification(data.sessions, null, null, spentCoins) : null;

  useEffect(() => {
    if (gami && gami.currentLevel > 1) {
      const storedLvl = localStorage.getItem(`level_${token}`);
      if (!storedLvl || parseInt(storedLvl) < gami.currentLevel) {
        localStorage.setItem(`level_${token}`, gami.currentLevel);
        if (storedLvl) {
           confetti({
             particleCount: 150,
             spread: 80,
             origin: { y: 0.6 }
           });
        }
      }
    }
  }, [gami?.currentLevel, token]);

  const fetchData = async () => {
    const { data: result, error: rpcError } = await supabase.rpc("get_student_live_data", {
      p_token: token,
    });

    if (rpcError || result?.error) {
      setError(rpcError?.message || result?.error || "Link inválido o expirado.");
      setLoading(false);
      return;
    }

    setData(result);
    setLoading(false);

    // Fetch Progress
    const { data: progData } = await supabase
      .from("student_game_progress")
      .select("*")
      .eq("class_student_id", result.cs_id);
    
    setGameProgress(progData || []);

    // Fetch Active Unlocks
    const { data: unlocks } = await supabase
      .from("student_temporary_unlocks")
      .select("*")
      .eq("class_student_id", result.cs_id)
      .gt("expires_at", new Date().toISOString());
    
    setActiveUnlocks(unlocks || []);

    // Fetch Leaderboard (Top 10 overall high scores in the class)
    setLeaderboardLoading(true);
    const { data: csInfo } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("id", result.cs_id)
      .single();

    if (csInfo) {
      const { data: lbData } = await supabase
        .from("student_game_progress")
        .select(`
          class_student_id,
          high_score,
          game_name,
          difficulty,
          class_students!inner(
            student_name,
            profiles(full_name),
            class_id
          )
        `)
        .eq("class_students.class_id", csInfo.class_id)
        .order("high_score", { ascending: false })
        .limit(10);
      
      setLeaderboard(lbData || []);
    }
    setLeaderboardLoading(false);

    // Confetti for high performance
    const totalPossibleScore = result?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.max_score ?? 0), 0), 0) || 1;
    const totalAchievedScore = result?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.score ?? 0), 0), 0) || 0;
    const overallPercentage = (totalAchievedScore / totalPossibleScore) * 100;

    if (overallPercentage >= 90) {
      const lastConfetti = localStorage.getItem(`confetti_${token}`);
      if (!lastConfetti || Date.now() - parseInt(lastConfetti) > 3600000) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#6366f1', '#d4af37']
        });
        localStorage.setItem(`confetti_${token}`, Date.now().toString());
      }
    }
  };

  const checkDailyGameReward = async (studentId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data: logs } = await supabase
      .from("student_minigame_logs")
      .select("id")
      .eq("class_student_id", studentId)
      .gte("completed_at", today + "T00:00:00Z");
    
    setCanClaimReward(!(logs && logs.length > 0));
  };

  useEffect(() => {
    if (data?.cs_id) checkDailyGameReward(data.cs_id);
  }, [data?.cs_id, activeTab]);

  const initGame = () => {
    const pairs = [...GAME_ICONS, ...GAME_ICONS];
    const shuffled = pairs.sort(() => Math.random() - 0.5).map((icon, id) => ({ id, icon, flipped: false, matched: false }));
    setGameCards(shuffled);
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setGameWon(false);
    setActiveGame('memory');
  };

  const handleCardClick = (id) => {
    if (flippedCards.length === 2 || gameCards[id].flipped || gameCards[id].matched) return;
    
    const newCards = [...gameCards];
    newCards[id].flipped = true;
    setGameCards(newCards);
    setFlippedCards([...flippedCards, id]);

    if (flippedCards.length === 1) {
      setMoves(moves + 1);
      const firstId = flippedCards[0];
      if (newCards[firstId].icon === newCards[id].icon) {
        newCards[firstId].matched = true;
        newCards[id].matched = true;
        setMatchedCards([...matchedCards, firstId, id]);
        setFlippedCards([]);
        if (matchedCards.length + 2 === GAME_ICONS.length * 2) {
          setGameWon(true);
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          saveGameProgress('Memory Match', 100);
        }
      } else {
        setTimeout(() => {
          newCards[firstId].flipped = false;
          newCards[id].flipped = false;
          setGameCards(newCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const claimGameReward = async () => {
    if (!canClaimReward || isClaiming) return;
    setIsClaiming(true);
    try {
      await supabase.from("student_minigame_logs").insert([{
        class_student_id: data.cs_id,
        game_name: "Memory Match",
        reward_coins: 50
      }]);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      setCanClaimReward(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
    setIsClaiming(false);
  };

  // Sudoku Logic
  const initSudoku = () => {
    // Simple predefined 4x4 Sudoku for mobile/quick play (9x9 is too big for a quick game)
    const puzzles = [
      {
        initial: [
          [1, null, 3, null],
          [null, 2, null, 4],
          [3, null, 1, null],
          [null, 4, null, 2]
        ],
        solution: [
          [1, 4, 3, 2],
          [3, 2, 1, 4],
          [3, 2, 1, 4], // wait this is wrong
          [2, 4, 3, 1]
        ]
      }
    ];
    // Real 4x4 Sudoku:
    // 1 2 | 3 4
    // 3 4 | 1 2
    // ---------
    // 2 1 | 4 3
    // 4 3 | 2 1
    const p1 = {
      initial: [
        [1, null, null, 4],
        [null, null, 1, null],
        [null, 1, null, null],
        [4, null, null, 1]
      ],
      solution: [
        [1, 2, 3, 4],
        [3, 4, 1, 2],
        [2, 1, 4, 3],
        [4, 3, 2, 1]
      ]
    };

    setSudokuGrid(p1.initial.map(row => [...row]));
    setSudokuInitial(p1.initial.map(row => [...row]));
    setSudokuSolved(false);
    setSudokuError("");
    setActiveGame('sudoku');
  };

  const handleSudokuInput = (r, c, val) => {
    if (sudokuInitial[r][c] !== null) return;
    const num = parseInt(val);
    if (isNaN(num) || num < 1 || num > 4) {
      const newGrid = [...sudokuGrid];
      newGrid[r][c] = null;
      setSudokuGrid(newGrid);
      return;
    }
    const newGrid = [...sudokuGrid];
    newGrid[r][c] = num;
    setSudokuGrid(newGrid);

    // Check if full and correct
    if (newGrid.every(row => row.every(cell => cell !== null))) {
      const sol = [
        [1, 2, 3, 4],
        [3, 4, 1, 2],
        [2, 1, 4, 3],
        [4, 3, 2, 1]
      ];
      const isCorrect = newGrid.every((row, ri) => row.every((cell, ci) => cell === sol[ri][ci]));
      if (isCorrect) {
        setSudokuSolved(true);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        saveGameProgress('Sudoku', 100);
      } else {
        setSudokuError("Algo no cuadra... ¡Sigue intentando!");
      }
    }
  };

  const claimSudokuReward = async () => {
    if (!canClaimReward || isClaiming) return;
    setIsClaiming(true);
    try {
      await supabase.from("student_minigame_logs").insert([{
        class_student_id: data.cs_id,
        game_name: "Sudoku",
        reward_coins: 100
      }]);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      setCanClaimReward(false);
      await fetchData();
    } catch (err) {
       console.error(err);
    }
    setIsClaiming(false);
  };

  // Pyramid Logic
  const initPyramid = () => {
    // 3 rows pyramid:
    //    [A]
    //   [B][C]
    //  [D][E][F]
    // B = D+E, C = E+F, A = B+C
    const base = [Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 10) + 1];
    const mid = [base[0] + base[1], base[1] + base[2]];
    const top = [mid[0] + mid[1]];
    
    const full = [top, mid, base];
    const initial = [
      [null],
      [mid[0], null],
      [null, base[1], null]
    ];

    setPyramidGrid(initial.map(row => [...row]));
    setPyramidInitial(initial.map(row => [...row]));
    setPyramidSolved(false);
    setPyramidError("");
    setActiveGame('pyramid');
  };

  const handlePyramidInput = (r, c, val) => {
    if (pyramidInitial[r][c] !== null) return;
    const num = parseInt(val);
    const newGrid = [...pyramidGrid];
    newGrid[r][c] = isNaN(num) ? null : num;
    setPyramidGrid(newGrid);

    // Check solution
    if (newGrid.every(row => row.every(cell => cell !== null))) {
      // Logic: bottom to top
      const [t, m, b] = newGrid;
      const okBase = (b[0] + b[1] === m[0]) && (b[1] + b[2] === m[1]);
      const okMid = (m[0] + m[1] === t[0]);
      
      if (okBase && okMid) {
        setPyramidSolved(true);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        saveGameProgress('Pyramid', 100);
      } else {
        setPyramidError("Los números no suman correctamente...");
      }
    }
  };

  const claimPyramidReward = async () => {
    if (!canClaimReward || isClaiming) return;
    setIsClaiming(true);
    try {
      await supabase.from("student_minigame_logs").insert([{
        class_student_id: data.cs_id,
        game_name: "Pyramid",
        reward_coins: 75
      }]);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      setCanClaimReward(false);
      await fetchData();
    } catch (err) {
       console.error(err);
    }
    setIsClaiming(false);
  };

  // Math Blitz Logic
  const generateBlitzProblem = () => {
    let a, b, op, ans;
    const ops = difficulty === 'easy' ? ['+', '-'] : difficulty === 'medium' ? ['+', '-', '*'] : ['+', '-', '*', '/'];
    op = ops[Math.floor(Math.random() * ops.length)];
    
    if (difficulty === 'easy') {
      a = Math.floor(Math.random() * 15) + 1;
      b = Math.floor(Math.random() * 10) + 1;
    } else if (difficulty === 'medium') {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 20) + 1;
    } else {
      a = Math.floor(Math.random() * 100) + 1;
      b = Math.floor(Math.random() * 50) + 1;
    }

    if (op === '-') { if (a < b) [a, b] = [b, a]; ans = a - b; }
    else if (op === '*') { a = Math.min(a, 12); b = Math.min(b, 10); ans = a * b; }
    else if (op === '/') { b = Math.floor(Math.random() * 9) + 2; a = b * (Math.floor(Math.random() * 10) + 1); ans = a / b; }
    else { ans = a + b; }

    setBlitzProblem({ a, b, op, ans });
    setBlitzAnswer("");
  };

  const startBlitz = () => {
    setBlitzScore(0);
    setBlitzTime(30);
    setBlitzActive(true);
    generateBlitzProblem();
  };

  useEffect(() => {
    let timer;
    if (blitzActive && blitzTime > 0) {
      timer = setInterval(() => setBlitzTime(t => t - 1), 1000);
    } else if (blitzTime === 0 && blitzActive) {
      setBlitzActive(false);
      saveGameProgress('Math Blitz', blitzScore);
    }
    return () => clearInterval(timer);
  }, [blitzActive, blitzTime]);

  const handleBlitzSubmit = (e) => {
    e.preventDefault();
    if (parseInt(blitzAnswer) === blitzProblem?.ans) {
      setBlitzScore(s => s + 1);
      generateBlitzProblem();
    } else {
      setBlitzAnswer("");
    }
  };

  const saveGameProgress = async (game, score) => {
    try {
      const existing = gameProgress.find(p => p.game_name === game && p.difficulty === difficulty);
      if (existing) {
        if (score > existing.high_score) {
          await supabase.from("student_game_progress")
            .update({ high_score: score, total_games_played: existing.total_games_played + 1 })
            .eq("id", existing.id);
        } else {
          await supabase.from("student_game_progress")
            .update({ total_games_played: existing.total_games_played + 1 })
            .eq("id", existing.id);
        }
      } else {
        await supabase.from("student_game_progress").insert([{
          class_student_id: data.cs_id,
          game_name: game,
          difficulty: difficulty,
          high_score: score,
          total_games_played: 1
        }]);
      }
      fetchData();
    } catch (err) { console.error(err); }
  };

  const claimBlitzReward = async () => {
    if (!canClaimReward || isClaiming || blitzScore < 5) return;
    setIsClaiming(true);
    const amount = difficulty === 'easy' ? 40 : difficulty === 'medium' ? 80 : 150;
    try {
      await supabase.from("student_minigame_logs").insert([{
        class_student_id: data.cs_id,
        game_name: "Math Blitz",
        reward_coins: amount
      }]);
      setCanClaimReward(false);
      await fetchData();
    } catch (err) { console.error(err); }
    setIsClaiming(false);
  };

  const handlePurchase = (reward) => {
    if (gami.notyxCoins < reward.cost_coins) return;
    setSelectedReward(reward);
    setDniInput("");
    setDniError("");
    setShowDniModal(true);
  };

  const confirmPurchase = async () => {
    if (!dniInput.trim()) {
      setDniError("Debes ingresar tu DNI.");
      return;
    }
    
    setPurchasing(selectedReward.id);
    setDniError("");
    
    try {
      // Validate DNI securely via RPC
      const { data: isValid, error: checkError } = await supabase
        .rpc("validate_student_dni", {
          p_cs_id: data.cs_id,
          p_dni: dniInput
        });

      if (checkError || !isValid) {
        setDniError("DNI incorrecto. Verifica tus datos.");
        setPurchasing(null);
        return;
      }

      const { error: pError } = await supabase.from("student_purchases").insert([{
        class_student_id: data.cs_id,
        reward_id: selectedReward.id,
        status: 'pending'
      }]);

      if (pError) throw pError;

      // IF IT'S A GAME PASS, UNLOCK IT
      if (selectedReward.category === 'game_pass' && selectedReward.metadata?.game_name) {
        const duration = selectedReward.metadata?.duration_minutes || 60;
        const expiresAt = new Date(Date.now() + duration * 60000).toISOString();
        
        await supabase.from("student_temporary_unlocks").insert([{
          class_student_id: data.cs_id,
          game_name: selectedReward.metadata.game_name,
          expires_at: expiresAt
        }]);
      }

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
      setShowDniModal(false);
      await fetchData();
    } catch (err) {
      console.error("Error en compra:", err);
      setDniError("Error al procesar la compra.");
    }
    setPurchasing(null);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="text-center relative z-10 flex flex-col items-center">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
          <GraduationCap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600" />
        </div>
        <p className="text-slate-800 font-black text-2xl tracking-tight">Cargando tu Perfil...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center bg-white p-12 rounded-[40px] shadow-2xl border border-slate-200 max-w-sm">
        <div className="text-6xl mb-6">🔗</div>
        <h2 className="text-2xl font-black mb-2 text-slate-800 tracking-tight">Link inválido</h2>
        <p className="text-slate-500 font-medium mb-8">{error}</p>
        <button onClick={() => navigate('/')} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest">Ir al inicio</button>
      </div>
    </div>
  );

  const totalScore = data?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.score ?? 0), 0), 0);
  const maxTotal = data?.sessions?.reduce((acc, session) => acc + (session.criteria || []).reduce((a, c) => a + (c.max_score ?? 0), 0), 0);

  const IconMap = { Flag, Flame, Star, Crown, TrendingUp: ShieldCheck };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF] pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-4 w-full flex-1">
             <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-all border border-slate-200"><ChevronLeft className="w-6 h-6" /></button>
             <div className="flex-1 min-w-0">
                <h1 className="font-black text-xl md:text-2xl tracking-tight text-slate-800 truncate leading-none mb-1">{data.class_name}</h1>
                <div className="flex items-center gap-2">
                   <p className="text-sm font-bold text-slate-500 truncate opacity-80">{data.student_name}</p>
                   {data.house && (
                     <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ backgroundColor: data.house.color + '15', color: data.house.color, borderColor: data.house.color + '30' }}>
                        {data.house.icon} {data.house.name}
                     </span>
                   )}
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             {/* Coins Display */}
             <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 px-5 py-2.5 rounded-2xl shadow-sm">
                <CoinsIcon className="w-5 h-5 text-orange-500" />
                <span className="text-xl font-black text-orange-700 leading-none">{gami?.notyxCoins || 0}</span>
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Coins</span>
             </div>

             <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button onClick={() => setActiveTab("progress")} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'progress' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Progreso</button>
                <button onClick={() => setActiveTab("shop")} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'shop' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tienda</button>
                <button onClick={() => setActiveTab("games")} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'games' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Aventuras</button>
             </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-[800px] space-y-8 animate-in fade-in duration-500">
        
        {activeTab === "progress" ? (
          <>
            {/* Gamification Main Card */}
            {gami && (
              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-2xl shadow-slate-900/5 overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-20 pointer-events-none ${gami.rank.bg.replace('bg-', 'bg-')}`} />
                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                  <div className="relative group shrink-0">
                    <div className={`w-32 h-32 rounded-[40px] flex flex-col items-center justify-center font-black shadow-lg border-4 ${gami.rank.bg} ${gami.rank.border} ${gami.rank.color}`}>
                      <Trophy className="w-12 h-12 mb-1" />
                      <span className="text-[10px] uppercase tracking-widest leading-none">Rango</span>
                      <span className="text-sm tracking-tight leading-none mt-1">{gami.rank.name}</span>
                    </div>
                    <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xl border-4 border-white shadow-xl">
                      {gami.currentLevel}
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-6">
                    <div className="flex justify-between items-end">
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">XP TOTAL</p>
                         <h3 className="text-4xl font-black text-slate-800 leading-none tracking-tighter">{gami.currentXP}</h3>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nota Promedio</p>
                         <p className="text-2xl font-black text-slate-600 leading-none tracking-tighter">{maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0}%</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                         <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                           <span className="text-blue-600">Nivel {gami.currentLevel}</span>
                           <span className="text-slate-400">{gami.currentLevelXP} / {gami.nextLevelXP} XP</span>
                         </div>
                         <div className="h-4 bg-slate-100 rounded-full overflow-hidden border-2 border-white shadow-inner">
                           <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${(gami.currentLevelXP / gami.nextLevelXP) * 100}%` }} />
                         </div>
                       </div>
                       <div className={`p-4 rounded-3xl border transition-all ${gami.hp <= 30 ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-slate-50 border-slate-100'}`}>
                         <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest mb-2">
                           <span className="flex items-center gap-2 text-slate-700"><Heart className={`w-4 h-4 ${gami.hp <= 30 ? 'text-red-500 fill-red-500' : 'text-rose-400 fill-rose-200'}`} /> Vitalidad (HP)</span>
                           <span className={gami.hp <= 30 ? 'text-red-600 font-black' : 'text-slate-500 font-black'}>{gami.hp} / {gami.MAX_HP} HP</span>
                         </div>
                         <div className="h-3 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                           <div className={`h-full rounded-full transition-all duration-1000 ${gami.hp <= 30 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} style={{ width: `${(gami.hp / gami.MAX_HP) * 100}%` }} />
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Achievements Grid */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl">
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3"><Medal className="w-6 h-6 text-indigo-500" /> Tus Logros</h3>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {gami?.unlockedBadges.map((badge) => {
                    const Icon = IconMap[badge.icon] || Star;
                    return (
                      <div key={badge.id} className={`rounded-3xl p-4 flex flex-col items-center justify-center gap-3 border transition-all ${badge.unlocked ? `${badge.bg} border-transparent shadow-md` : 'bg-slate-50 border-slate-100 opacity-30 grayscale scale-95'}`}>
                         <Icon className={`w-8 h-8 ${badge.color}`} />
                         <div className="text-center">
                           <span className="text-[10px] font-black uppercase tracking-tight text-slate-700 block leading-tight">{badge.label}</span>
                           <span className="text-[8px] font-bold text-slate-500 mt-1 block">{badge.req}</span>
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>

            {/* Missions Register */}
            <div className="space-y-8">
               <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Flag className="w-8 h-8 text-indigo-500" /> Historial de Misiones</h3>
               <div className="space-y-6">
                  {[...data.sessions].map((session) => {
                    const sessionGami = gami?.sessionScores?.find(s => s.id === session.id);
                    const isAbsent = session.attendance === false;
                    return (
                      <div key={session.id} className={`bg-white rounded-[40px] border overflow-hidden shadow-lg ${sessionGami?.died ? 'border-red-200' : 'border-slate-100'}`}>
                        <div className={`px-8 py-6 border-b flex items-center justify-between ${isAbsent ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isAbsent ? 'bg-red-100 text-red-600' : 'bg-white border border-slate-200'}`}>
                                {isAbsent ? <XCircle className="w-6 h-6" /> : <Clock className="w-6 h-6 text-slate-400" />}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-800 capitalize leading-none mb-1">{format(new Date(session.date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}</h4>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isAbsent ? 'text-red-500' : 'text-slate-400'}`}>{isAbsent ? 'Derrota por Falta' : 'Misión Completada'}</p>
                              </div>
                           </div>
                           {sessionGami && (
                             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${sessionGami.hpChange >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                               <Heart className={`w-3 h-3 ${sessionGami.hpChange >= 0 ? 'fill-emerald-500' : 'fill-red-500'}`} /> {sessionGami.hpChange >= 0 ? '+' : ''}{sessionGami.hpChange} HP
                             </div>
                           )}
                        </div>
                        <div className="p-0">
                           <table className="w-full text-left">
                              <tbody className="divide-y divide-slate-50">
                                 {(session.criteria || []).map(crit => (
                                   <tr key={crit.id} className="group hover:bg-slate-50/50 transition-all">
                                      <td className="px-8 py-5 font-bold text-slate-700 text-sm">{crit.name}</td>
                                      <td className="px-8 py-5 text-center">
                                         <div className="inline-flex flex-col items-center">
                                            <span className="text-2xl font-black text-slate-900 leading-none">{crit.score ?? '—'}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase mt-1">/ {crit.max_score}</span>
                                         </div>
                                      </td>
                                      <td className="px-8 py-5 text-right">
                                         <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${crit.score != null ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>{crit.score != null ? 'Logrado' : 'Pendiente'}</span>
                                      </td>
                                   </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                      </div>
                    )
                  })}
               </div>
            </div>
          </>
        ) : activeTab === "shop" ? (
          /* SHOP TAB */
          <div className="space-y-10 animate-in slide-up">
             <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-orange-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                   <div className="flex items-center gap-6">
                      <div className="bg-white/20 p-5 rounded-[24px] backdrop-blur-xl border border-white/20"><ShoppingBag className="w-10 h-10" /></div>
                      <div>
                         <h2 className="text-3xl font-black tracking-tight leading-none mb-2">Tienda de Premios</h2>
                         <p className="text-orange-100/80 font-medium italic">Canjea tus Notyx Coins por ventajas en clase</p>
                      </div>
                   </div>
                   <div className="bg-white text-orange-600 px-8 py-4 rounded-3xl flex flex-col items-center shadow-xl">
                      <span className="text-[10px] font-black uppercase tracking-widest mb-1">Tu Saldo Actual</span>
                      <div className="flex items-center gap-2">
                         <CoinsIcon className="w-6 h-6" />
                         <span className="text-4xl font-black leading-none">{gami?.notyxCoins || 0}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(data.rewards || []).map(reward => {
                  const alreadyBought = data.purchases?.some(p => p.reward_id === reward.id && p.status === 'pending');
                  const canAfford = (gami?.notyxCoins || 0) >= reward.cost_coins;

                  return (
                    <div key={reward.id} className={`bg-white rounded-[40px] p-8 border-2 transition-all flex flex-col justify-between group ${alreadyBought ? 'border-emerald-200 shadow-emerald-500/5' : 'border-slate-100 hover:border-orange-200 hover:shadow-2xl shadow-slate-200/50'}`}>
                       <div>
                          <div className="flex items-start justify-between mb-6">
                             <div className="text-5xl w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">{reward.icon}</div>
                             <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Costo</span>
                                <div className="flex items-center gap-1.5 justify-end">
                                   <CoinsIcon className="w-4 h-4 text-orange-500" />
                                   <span className="text-2xl font-black text-slate-800">{reward.cost_coins}</span>
                                </div>
                             </div>
                          </div>
                          <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-3">{reward.name}</h4>
                          <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">{reward.description || 'Sin descripción'}</p>
                       </div>

                       {alreadyBought ? (
                         <div className="bg-emerald-50 text-emerald-600 py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest border border-emerald-200"><Check className="w-5 h-5" /> Canje Pendiente</div>
                       ) : (
                         <Button 
                            disabled={!canAfford || purchasing === reward.id}
                            onClick={() => handlePurchase(reward)}
                            className={`w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${
                              canAfford 
                                ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20" 
                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                            }`}
                         >
                            {purchasing === reward.id ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : (canAfford ? 'Canjear Premio' : 'Faltan Coins')}
                         </Button>
                       )}
                    </div>
                  );
                })}
             </div>

             {/* Recent Purchases List */}
             {(data.purchases?.length || 0) > 0 && (
                <div className="pt-10 space-y-6">
                   <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3"><ShoppingCart className="w-6 h-6 text-blue-500" /> Mis Últimos Canjes</h3>
                   <div className="grid gap-3">
                      {data.purchases.slice(0, 5).map(p => (
                        <div key={p.id} className="bg-white border border-slate-100 p-5 rounded-3xl flex items-center justify-between shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className="text-2xl w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-50">🎁</div>
                              <div>
                                 <h5 className="font-black text-slate-800 text-sm leading-none mb-1">Premio #{(p.id || '').slice(0, 4)}</h5>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado: <span className={p.status === 'delivered' ? 'text-emerald-500' : p.status === 'cancelled' ? 'text-red-500' : 'text-amber-500'}>{p.status === 'delivered' ? 'Entregado' : p.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}</span></p>
                              </div>
                           </div>
                           <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                              <CoinsIcon className="w-3.5 h-3.5 text-orange-400" />
                              <span className="text-sm font-black text-slate-600">{p.cost_coins}</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             )}
          </div>
        ) : (
          /* GAMES TAB */
          <div className="space-y-10 animate-in zoom-in duration-500">
             <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                   <div className="space-y-4">
                      <div className="flex items-center gap-4">
                         <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md"><Gamepad2 className="w-8 h-8" /></div>
                         <h2 className="text-4xl font-black tracking-tight">Arena de Juegos</h2>
                      </div>
                      <p className="text-indigo-100/80 font-medium text-lg max-w-md">Supera los desafíos en tu tiempo libre y gana Notyx Coins extra cada día.</p>
                   </div>
                   <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[32px] text-center min-w-[200px]">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Tu Recompensa Diaria</span>
                      <div className="text-3xl font-black mt-1 text-yellow-400">50 Coins</div>
                      <div className={`mt-3 text-[10px] font-black uppercase py-2 px-4 rounded-full border ${canClaimReward ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}>
                         {canClaimReward ? 'Disponible hoy' : 'Ya reclamada'}
                      </div>
                   </div>
                </div>
             </div>

             {!activeGame ? (
               <div className="space-y-8">
                  {/* Difficulty Selector with Unlock Logic */}
                  <div className="flex justify-center p-2 bg-slate-100 rounded-2xl w-fit mx-auto mb-10 border-2 border-white shadow-inner">
                     {['easy', 'medium', 'hard'].map(d => {
                       const isUnlocked = d === 'easy' || gameProgress.some(p => {
                         if (d === 'medium') return p.difficulty === 'easy' && p.total_games_played >= 3;
                         if (d === 'hard') return p.difficulty === 'medium' && p.total_games_played >= 5;
                         return false;
                       });

                       return (
                         <div key={d} className="relative group">
                           <button 
                             onClick={() => isUnlocked && setDifficulty(d)}
                             disabled={!isUnlocked}
                             className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${
                               difficulty === d 
                                 ? 'bg-white text-indigo-600 shadow-md scale-105' 
                                 : isUnlocked ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300 cursor-not-allowed'
                             }`}
                           >
                             {!isUnlocked && <Lock className="w-3 h-3" />}
                             {d === 'easy' ? 'Principiante' : d === 'medium' ? 'Caballero' : 'Leyenda'}
                           </button>
                           {!isUnlocked && (
                             <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] font-bold py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                               Gana {d === 'medium' ? '3 veces en Principiante' : '5 veces en Caballero'} para desbloquear
                             </div>
                           )}
                         </div>
                       );
                     })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Memory Match - Always Free */}
                     <div 
                       onClick={() => { initGame(); setActiveGame('memory'); }}
                       className="bg-white rounded-[40px] p-8 border-2 border-slate-100 hover:border-indigo-200 shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
                     >
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                           <Puzzle className="w-10 h-10 text-indigo-500" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Duelo de Memoria</h3>
                        <p className="text-slate-500 font-medium leading-relaxed">Entrena tu mente encontrando los pares mágicos.</p>
                        <div className="mt-8 flex items-center justify-between">
                           <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-bold">Siempre Gratis</span>
                           <div className="p-3 rounded-xl bg-indigo-600 text-white"><Play className="w-5 h-5" /></div>
                        </div>
                     </div>

                     {/* Sudoku - Premium */}
                     {(() => {
                       const unlock = activeUnlocks.find(u => u.game_name === 'Sudoku');
                       const isUnlocked = !!unlock;
                       const timeLeft = isUnlocked ? Math.max(0, Math.floor((new Date(unlock.expires_at) - new Date()) / 60000)) : 0;
                       
                       return (
                         <div 
                           onClick={() => isUnlocked ? initSudoku() : null}
                           className={`bg-white rounded-[40px] p-8 border-2 transition-all group relative overflow-hidden ${
                             isUnlocked 
                               ? 'border-slate-100 hover:border-purple-200 shadow-xl hover:shadow-2xl cursor-pointer' 
                               : 'border-slate-50 bg-slate-50/50 cursor-not-allowed grayscale'
                           }`}
                         >
                            {!isUnlocked && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/5 backdrop-blur-[2px] z-20">
                                 <div className="bg-white p-4 rounded-3xl shadow-xl mb-4"><Lock className="w-8 h-8 text-slate-400" /></div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Desbloquéalo en la tienda</p>
                              </div>
                            )}
                            <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                               <Brain className="w-10 h-10 text-purple-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Desafío Sudoku</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">Completa el tablero sin repetir números.</p>
                            <div className="mt-8 flex items-center justify-between">
                               {isUnlocked ? (
                                 <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">Expira en: {timeLeft}m</span>
                               ) : (
                                 <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Pase Requerido</span>
                               )}
                               <div className={`p-3 rounded-xl ${isUnlocked ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-400'}`}><Play className="w-5 h-5" /></div>
                            </div>
                         </div>
                       );
                     })()}

                     {/* Pyramid - Premium */}
                     {(() => {
                       const unlock = activeUnlocks.find(u => u.game_name === 'Pyramid');
                       const isUnlocked = !!unlock;
                       const timeLeft = isUnlocked ? Math.max(0, Math.floor((new Date(unlock.expires_at) - new Date()) / 60000)) : 0;

                       return (
                         <div 
                           onClick={() => isUnlocked ? initPyramid() : null}
                           className={`bg-white rounded-[40px] p-8 border-2 transition-all group relative overflow-hidden ${
                             isUnlocked 
                               ? 'border-slate-100 hover:border-emerald-200 shadow-xl hover:shadow-2xl cursor-pointer' 
                               : 'border-slate-50 bg-slate-50/50 cursor-not-allowed grayscale'
                           }`}
                         >
                            {!isUnlocked && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/5 backdrop-blur-[2px] z-20">
                                 <div className="bg-white p-4 rounded-3xl shadow-xl mb-4"><Lock className="w-8 h-8 text-slate-400" /></div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Desbloquéalo en la tienda</p>
                              </div>
                            )}
                            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                               <Binary className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Pirámide Numérica</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">Cálculo mental sumando bloques inferiores.</p>
                            <div className="mt-8 flex items-center justify-between">
                               {isUnlocked ? (
                                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">Expira en: {timeLeft}m</span>
                               ) : (
                                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Pase Requerido</span>
                               )}
                               <div className={`p-3 rounded-xl ${isUnlocked ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}><Play className="w-5 h-5" /></div>
                            </div>
                         </div>
                       );
                     })()}

                     {/* Math Blitz - Always Free */}
                     <div 
                       onClick={() => { generateBlitzProblem(); setActiveGame('blitz'); }}
                       className="bg-white rounded-[40px] p-8 border-2 border-slate-100 hover:border-orange-200 shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
                     >
                        <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                           <Zap className="w-10 h-10 text-orange-500" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Math Blitz</h3>
                        <p className="text-slate-500 font-medium leading-relaxed">Resuelve tantas ecuaciones como puedas en 30 segundos.</p>
                        <div className="mt-8 flex items-center justify-between">
                           <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 font-bold">Entrenamiento Libre</span>
                           <div className="p-3 rounded-xl bg-orange-600 text-white"><Play className="w-5 h-5" /></div>
                        </div>
                     </div>
                  </div>

                  {/* LEADERBOARD SECTION */}
                  <div className="pt-10 animate-in slide-up duration-700">
                     <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                           <div className="flex items-center gap-4">
                              <div className="bg-yellow-100 p-3 rounded-2xl"><Trophy className="w-6 h-6 text-yellow-600" /></div>
                              <div>
                                 <h3 className="text-xl font-black text-slate-800 tracking-tight">Salón de la Fama</h3>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Los mejores puntajes de tu clase</p>
                              </div>
                           </div>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="bg-white border-b border-slate-50">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Rango</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Aventurero</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Juego</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Nivel</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Récord</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {leaderboard.length > 0 ? leaderboard.map((entry, idx) => {
                                   const isMe = entry.class_student_id === data?.cs_id;
                                   return (
                                     <tr key={idx} className={`${isMe ? 'bg-blue-50/50' : 'hover:bg-slate-50/30'} transition-colors`}>
                                        <td className="px-8 py-5">
                                           {idx === 0 ? <Crown className="w-6 h-6 text-yellow-500" /> : 
                                            idx === 1 ? <Medal className="w-6 h-6 text-slate-400" /> : 
                                            idx === 2 ? <Medal className="w-6 h-6 text-amber-600" /> : 
                                            <span className="font-black text-slate-300 text-lg">#{idx + 1}</span>}
                                        </td>
                                        <td className="px-8 py-5">
                                           <div className="flex items-center gap-3">
                                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isMe ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                 {(entry.class_students?.profiles?.full_name || entry.class_students?.student_name || "?")[0]}
                                              </div>
                                              <span className={`font-black text-sm ${isMe ? 'text-blue-600' : 'text-slate-700'}`}>
                                                 {entry.class_students?.profiles?.full_name || entry.class_students?.student_name}
                                                 {isMe && <span className="ml-2 text-[8px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">TÚ</span>}
                                              </span>
                                           </div>
                                        </td>
                                        <td className="px-8 py-5">
                                           <div className="flex items-center gap-2">
                                              {entry.game_name === 'Memory Match' && <Puzzle className="w-3 h-3 text-indigo-500" />}
                                              {entry.game_name === 'Sudoku' && <Brain className="w-3 h-3 text-purple-500" />}
                                              {entry.game_name === 'Pyramid' && <Binary className="w-3 h-3 text-emerald-500" />}
                                              {entry.game_name === 'Math Blitz' && <Zap className="w-3 h-3 text-orange-500" />}
                                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{entry.game_name}</span>
                                           </div>
                                        </td>
                                        <td className="px-8 py-5">
                                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${
                                             entry.difficulty === 'easy' ? 'bg-blue-50 text-blue-500 border-blue-100' : 
                                             entry.difficulty === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                             'bg-red-50 text-red-600 border-red-100'
                                           }`}>
                                              {entry.difficulty === 'easy' ? 'Principiante' : entry.difficulty === 'medium' ? 'Caballero' : 'Leyenda'}
                                           </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                           <span className="font-black text-slate-800 text-lg">{entry.high_score}</span>
                                        </td>
                                     </tr>
                                   );
                                 }) : (
                                   <tr>
                                      <td colSpan="5" className="px-8 py-20 text-center">
                                         <div className="max-w-xs mx-auto">
                                            <Trophy className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Aún no hay récords para mostrar</p>
                                         </div>
                                      </td>
                                   </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               </div>

             ) : activeGame === 'memory' ? (
               <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-10">
                     <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Volver a la Arena
                     </button>
                     <div className="text-right">
                        <h3 className="text-2xl font-black text-slate-800 leading-none">Duelo de Memoria</h3>
                        <p className="text-slate-400 font-bold text-sm mt-2">{moves} movimientos</p>
                     </div>
                     <Button onClick={initGame} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all border border-slate-100">
                        <RotateCcw className="w-6 h-6" />
                     </Button>
                  </div>

                  {gameWon ? (
                    <div className="py-20 text-center animate-in zoom-in duration-500">
                       <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                          <Trophy className="w-16 h-16 text-indigo-600" />
                          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
                       </div>
                       <h4 className="text-3xl font-black text-slate-800 mb-2">¡Victoria Legendaria!</h4>
                       <p className="text-slate-500 font-medium mb-10">Completaste el desafío en <span className="font-black text-indigo-600">{moves}</span> movimientos.</p>
                       
                       {canClaimReward ? (
                          <Button 
                            onClick={claimGameReward} 
                            disabled={isClaiming}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 h-16 rounded-[24px] font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-500/40 flex items-center gap-3 mx-auto"
                          >
                             {isClaiming ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <><CoinsIcon className="w-5 h-5" /> Reclamar 50 Coins</>}
                          </Button>
                       ) : (
                          <div className="bg-slate-100 text-slate-400 px-8 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest inline-block">
                             Recompensa ya obtenida hoy
                          </div>
                       )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
                       {gameCards.map((card, idx) => {
                          const isFlipped = flippedCards.includes(idx) || matchedCards.includes(idx);
                          return (
                            <div 
                               key={idx}
                               onClick={() => handleCardClick(idx)}
                               className={`aspect-square rounded-2xl cursor-pointer transition-all duration-500 transform-gpu preserve-3d relative ${isFlipped ? 'rotate-y-180' : 'hover:scale-105 active:scale-95 shadow-lg'}`}
                            >
                               <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white border-2 border-white/20 backface-hidden ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
                                  <Star className="w-6 h-6 opacity-40 fill-white" />
                               </div>
                               <div className={`absolute inset-0 bg-white rounded-2xl flex items-center justify-center text-4xl border-2 transition-colors backface-hidden rotate-y-180 ${matchedCards.includes(idx) ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 shadow-inner'}`}>
                                  {card.icon}
                               </div>
                            </div>
                          );
                       })}
                    </div>
                  )}
               </div>
             ) : activeGame === 'blitz' ? (
               /* MATH BLITZ GAME */
               <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-10">
                     <button onClick={() => { setBlitzActive(false); setActiveGame(null); }} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Volver a la Arena
                     </button>
                     <div className="text-right">
                        <h3 className="text-2xl font-black text-slate-800 leading-none">Math Blitz</h3>
                        <p className="text-slate-400 font-bold text-sm mt-2">{difficulty.toUpperCase()} • 30 Segundos</p>
                     </div>
                  </div>

                  {!blitzActive && blitzTime === 30 ? (
                    <div className="py-20 text-center animate-in zoom-in duration-500">
                       <div className="w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8">
                          <Zap className="w-16 h-16 text-orange-500" />
                       </div>
                       <h4 className="text-3xl font-black text-slate-800 mb-2">¿Estás Listo?</h4>
                       <p className="text-slate-500 font-medium mb-10">Resuelve el máximo de problemas posibles antes de que se acabe el tiempo.</p>
                       <Button 
                         onClick={startBlitz} 
                         className="bg-orange-500 hover:bg-orange-600 text-white px-12 h-16 rounded-[24px] font-black uppercase text-sm tracking-widest shadow-2xl shadow-orange-500/40"
                       >
                          Comenzar Duelo
                       </Button>
                    </div>
                  ) : !blitzActive && blitzTime === 0 ? (
                    <div className="py-20 text-center animate-in zoom-in duration-500">
                       <div className="text-6xl font-black text-slate-800 mb-4">{blitzScore}</div>
                       <h4 className="text-2xl font-black text-slate-600 mb-2">¡Tiempo Agotado!</h4>
                       <p className="text-slate-400 font-medium mb-10">Has logrado {blitzScore} aciertos en {difficulty}.</p>
                       
                       <div className="flex flex-col gap-4 max-w-xs mx-auto">
                          {blitzScore >= 5 && canClaimReward ? (
                            <Button 
                              onClick={claimBlitzReward} 
                              disabled={isClaiming}
                              className="bg-orange-500 hover:bg-orange-600 text-white h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg"
                            >
                               {isClaiming ? 'Cargando...' : `Reclamar Coins`}
                            </Button>
                          ) : blitzScore < 5 ? (
                            <p className="text-red-500 font-black text-[10px] uppercase tracking-widest">Necesitas al menos 5 puntos para el premio</p>
                          ) : (
                            <div className="bg-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Premio ya reclamado hoy</div>
                          )}
                          <Button onClick={startBlitz} variant="ghost" className="h-14 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-[10px]">Reintentar</Button>
                       </div>
                    </div>
                  ) : (
                    <div className="max-w-sm mx-auto text-center space-y-10">
                       <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                          <div className="flex flex-col items-center gap-1">
                             <Timer className="w-5 h-5 text-slate-400" />
                             <span className={`text-2xl font-black ${blitzTime <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>{blitzTime}s</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                             <BarChart3 className="w-5 h-5 text-slate-400" />
                             <span className="text-2xl font-black text-slate-800">{blitzScore}</span>
                          </div>
                       </div>

                       <div className="py-10">
                          <div className="text-6xl font-black text-slate-800 tracking-tighter mb-10 flex items-center justify-center gap-4">
                             <span>{blitzProblem.a}</span>
                             <span className="text-orange-500">{blitzProblem.op === '*' ? '×' : blitzProblem.op === '/' ? '÷' : blitzProblem.op}</span>
                             <span>{blitzProblem.b}</span>
                             <span className="text-slate-300">=</span>
                          </div>
                          <form onSubmit={handleBlitzSubmit}>
                             <input 
                                type="text"
                                inputMode="numeric"
                                autoFocus
                                value={blitzAnswer}
                                onChange={e => setBlitzAnswer(e.target.value)}
                                className="w-full bg-slate-50 border-4 border-transparent focus:border-orange-500 rounded-[32px] h-24 text-center text-5xl font-black outline-none transition-all shadow-inner"
                                placeholder="?"
                             />
                          </form>
                       </div>
                    </div>
                  )}
               </div>
             ) : activeGame === 'pyramid' ? (
               /* PYRAMID GAME */
               <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-10">
                     <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Volver a la Arena
                     </button>
                     <div className="text-right">
                        <h3 className="text-2xl font-black text-slate-800 leading-none">Pirámide Numérica</h3>
                        <p className="text-slate-400 font-bold text-sm mt-2">Cálculo Mental Rápido</p>
                     </div>
                     <Button onClick={initPyramid} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all border border-slate-100">
                        <RotateCcw className="w-6 h-6" />
                     </Button>
                  </div>

                  {pyramidSolved ? (
                    <div className="py-20 text-center animate-in zoom-in duration-500">
                       <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                          <Binary className="w-16 h-16 text-emerald-600" />
                          <Sparkle className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
                       </div>
                       <h4 className="text-3xl font-black text-slate-800 mb-2">¡Arquitecto de Números!</h4>
                       <p className="text-slate-500 font-medium mb-10">Has construido la pirámide con precisión absoluta.</p>
                       
                       {canClaimReward ? (
                          <Button 
                            onClick={claimPyramidReward} 
                            disabled={isClaiming}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-16 rounded-[24px] font-black uppercase text-sm tracking-widest shadow-2xl shadow-emerald-500/40 flex items-center gap-3 mx-auto"
                          >
                             {isClaiming ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <><CoinsIcon className="w-5 h-5" /> Reclamar 75 Coins</>}
                          </Button>
                       ) : (
                          <div className="bg-slate-100 text-slate-400 px-8 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest inline-block">
                             Recompensa ya obtenida hoy
                          </div>
                       )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                       {pyramidGrid.map((row, ri) => (
                          <div key={ri} className="flex gap-4">
                             {row.map((cell, ci) => (
                                <input 
                                   key={`${ri}-${ci}`}
                                   type="text"
                                   inputMode="numeric"
                                   value={cell === null ? '' : cell}
                                   readOnly={pyramidInitial[ri][ci] !== null}
                                   onChange={(e) => handlePyramidInput(ri, ci, e.target.value)}
                                   className={`w-20 h-20 text-center text-2xl font-black rounded-2xl border-4 transition-all outline-none ${
                                     pyramidInitial[ri][ci] !== null 
                                       ? 'bg-slate-50 text-slate-400 border-slate-100' 
                                       : 'bg-white text-emerald-600 border-emerald-100 focus:border-emerald-500 shadow-lg'
                                   }`}
                                />
                             ))}
                          </div>
                       ))}
                       <div className="mt-10 text-center space-y-2">
                          {pyramidError && <p className="text-red-500 font-black text-[10px] uppercase tracking-widest animate-bounce">{pyramidError}</p>}
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Pista: Cada bloque es la suma de los dos de abajo</p>
                       </div>
                    </div>
                  )}
               </div>
             ) : (
               /* SUDOKU GAME */
               <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-10">
                     <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Volver a la Arena
                     </button>
                     <div className="text-right">
                        <h3 className="text-2xl font-black text-slate-800 leading-none">Desafío Sudoku</h3>
                        <p className="text-slate-400 font-bold text-sm mt-2">Mente de Acero (4x4)</p>
                     </div>
                     <Button onClick={initSudoku} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all border border-slate-100">
                        <RotateCcw className="w-6 h-6" />
                     </Button>
                  </div>

                  {sudokuSolved ? (
                    <div className="py-20 text-center animate-in zoom-in duration-500">
                       <div className="w-32 h-32 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                          <Brain className="w-16 h-16 text-purple-600" />
                          <Sparkle className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
                       </div>
                       <h4 className="text-3xl font-black text-slate-800 mb-2">¡Mente Brillante!</h4>
                       <p className="text-slate-500 font-medium mb-10">Has resuelto el acertijo con perfección matemática.</p>
                       
                       {canClaimReward ? (
                          <Button 
                            onClick={claimSudokuReward} 
                            disabled={isClaiming}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-10 h-16 rounded-[24px] font-black uppercase text-sm tracking-widest shadow-2xl shadow-purple-500/40 flex items-center gap-3 mx-auto"
                          >
                             {isClaiming ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <><CoinsIcon className="w-5 h-5" /> Reclamar 100 Coins</>}
                          </Button>
                       ) : (
                          <div className="bg-slate-100 text-slate-400 px-8 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest inline-block">
                             Recompensa ya obtenida hoy
                          </div>
                       )}
                    </div>
                  ) : (
                    <div className="max-w-xs mx-auto space-y-6">
                       <div className="grid grid-cols-4 gap-2 bg-slate-100 p-2 rounded-2xl">
                          {sudokuGrid.map((row, ri) => row.map((cell, ci) => (
                             <input 
                                key={`${ri}-${ci}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={cell || ''}
                                readOnly={sudokuInitial[ri][ci] !== null}
                                onChange={(e) => handleSudokuInput(ri, ci, e.target.value)}
                                className={`w-full aspect-square text-center text-2xl font-black rounded-xl transition-all outline-none border-2 ${
                                  sudokuInitial[ri][ci] !== null 
                                    ? 'bg-slate-50 text-slate-400 border-transparent' 
                                    : 'bg-white text-purple-600 border-white focus:border-purple-500 shadow-sm'
                                }`}
                             />
                          )))}
                       </div>
                       {sudokuError && <p className="text-center text-red-500 font-black text-[10px] uppercase tracking-widest animate-bounce">{sudokuError}</p>}
                       <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">Completa el tablero para ganar</p>
                    </div>
                  )}
               </div>
             )}

             <style>{`
                .rotate-y-180 { transform: rotateY(180deg); }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
             `}</style>
          </div>
        )}
      </div>

      {/* DNI Validation Modal */}
      {showDniModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-orange-500" />
              <div className="text-center">
                 <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="w-10 h-10" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Validar Identidad</h3>
                 <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                    Para confirmar el canje de <span className="font-black text-orange-600">{selectedReward?.name}</span>, ingresa tu DNI registrado por el profesor.
                 </p>
                 
                 <div className="space-y-4">
                    <div className="relative">
                       <input 
                          type="password"
                          placeholder="Ingresa tu DNI..."
                          autoFocus
                          className={`w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 font-bold text-center text-xl outline-none transition-all ${dniError ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-orange-500'}`}
                          value={dniInput}
                          onChange={e => setDniInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && confirmPurchase()}
                       />
                       {dniError && (
                         <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center justify-center gap-1">
                           <AlertCircle className="w-3 h-3" /> {dniError}
                         </p>
                       )}
                    </div>

                    <div className="flex gap-3 pt-4">
                       <Button 
                          onClick={confirmPurchase}
                          disabled={purchasing === selectedReward?.id}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-500/20"
                       >
                          {purchasing === selectedReward?.id ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : 'Confirmar'}
                       </Button>
                       <Button 
                          variant="ghost" 
                          onClick={() => setShowDniModal(false)}
                          className="flex-1 h-14 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-[10px]"
                       >
                          Cancelar
                       </Button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// Reuse existing Button component if possible, or define simple one
function Button({ children, className, onClick, disabled, type = "button" }) {
  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}
