import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Star, Flame, TrendingUp, Heart, Sparkles, Flag, Crown } from "lucide-react";

const ICONS = { Star, Flame, TrendingUp, Heart, Sparkles, Flag, Crown };

const COLORS = {
  "text-blue-500":    { bg: "bg-blue-900/80",    border: "border-blue-500/50",  ring: "from-blue-500 to-cyan-400" },
  "text-orange-500":  { bg: "bg-orange-900/80",  border: "border-orange-500/50",ring: "from-orange-500 to-amber-400" },
  "text-red-500":     { bg: "bg-red-900/80",     border: "border-red-500/50",   ring: "from-red-500 to-rose-400" },
  "text-yellow-500":  { bg: "bg-yellow-900/80",  border: "border-yellow-400/50",ring: "from-yellow-500 to-amber-300" },
  "text-purple-500":  { bg: "bg-purple-900/80",  border: "border-purple-500/50",ring: "from-purple-500 to-violet-400" },
  "text-emerald-500": { bg: "bg-emerald-900/80", border: "border-emerald-500/50",ring:"from-emerald-500 to-teal-400" },
  "text-rose-500":    { bg: "bg-rose-900/80",    border: "border-rose-500/50",  ring: "from-rose-500 to-pink-400" },
  "text-cyan-500":    { bg: "bg-cyan-900/80",    border: "border-cyan-500/50",  ring: "from-cyan-500 to-sky-400" },
};

function SingleToast({ badge, onDone }) {
  const [exiting, setExiting] = useState(false);
  const Icon = ICONS[badge.icon] || Star;
  const theme = COLORS[badge.color] || COLORS["text-blue-500"];

  useEffect(() => {
    // Confetti burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.85, y: 0.2 },
      colors: ["#facc15", "#f97316", "#a78bfa", "#22d3ee", "#4ade80"],
    });

    const exitTimer = setTimeout(() => setExiting(true), 3500);
    const doneTimer = setTimeout(() => onDone(), 4300);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, []);

  return (
    <div
      className={`
        flex items-center gap-4 pl-4 pr-6 py-4 rounded-[24px] border backdrop-blur-xl shadow-2xl min-w-[300px] max-w-[340px]
        ${theme.bg} ${theme.border}
      `}
      style={{
        animation: exiting
          ? "achievement-out 0.8s cubic-bezier(0.4,0,0.2,1) both"
          : "achievement-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      {/* Animated gradient ring */}
      <div className={`relative w-12 h-12 rounded-2xl flex-shrink-0 bg-gradient-to-br ${theme.ring} p-0.5`}>
        <div className="w-full h-full rounded-[14px] flex items-center justify-center" style={{ backgroundColor: 'hsla(220, 25%, 6%, 0.4)' }}>
          <Icon className={`w-6 h-6 ${badge.color}`} />
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-0.5">
          🏆 Logro Desbloqueado
        </p>
        <p className="font-black text-white text-base leading-tight truncate">
          {badge.label}
        </p>
        <p className="text-[11px] text-white/60 font-medium mt-0.5 truncate">
          {badge.req}
        </p>
      </div>
    </div>
  );
}

/**
 * AchievementToast
 * Props:
 *  - badges: Array of badge objects to display (queued one by one)
 */
export default function AchievementToast({ badges }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (badges?.length) setQueue([...badges]);
  }, [badges]);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const timer = setTimeout(() => {
        setCurrent(queue[0]);
        setQueue(prev => prev.slice(1));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [current, queue]);

  if (!current) return null;

  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 items-end pointer-events-none">
      <SingleToast
        key={current.id}
        badge={current}
        onDone={() => setCurrent(null)}
      />
    </div>
  );
}
