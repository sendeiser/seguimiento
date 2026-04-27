import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, Flame, Star, Award, TrendingUp, Sparkles, CheckCircle2, Shield, Zap } from "lucide-react";

// Rank configurations for Pokemon-style visuals
const RANK_THEMES = {
  "Hierro": {
    frameClass: "bg-gradient-to-br from-slate-400 to-slate-600 border-slate-500",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-700 dark:text-slate-300",
    typeColor: "bg-slate-500",
    holo: false
  },
  "Bronce": {
    frameClass: "bg-gradient-to-br from-amber-600 via-orange-400 to-amber-700 border-amber-600",
    bgClass: "bg-[#FFF8F0] dark:bg-[#2A1F1A]",
    textClass: "text-amber-900 dark:text-amber-100",
    typeColor: "bg-amber-600",
    holo: false
  },
  "Plata": {
    frameClass: "bg-gradient-to-br from-gray-300 via-gray-100 to-gray-400 border-gray-400",
    bgClass: "bg-[#F8F9FA] dark:bg-[#1E2329]",
    textClass: "text-gray-800 dark:text-gray-200",
    typeColor: "bg-gray-500",
    holo: false
  },
  "Oro": {
    frameClass: "bg-gradient-to-br from-yellow-400 via-yellow-200 to-yellow-600 border-yellow-500",
    bgClass: "bg-[#FFFCF0] dark:bg-[#2E2818]",
    textClass: "text-yellow-900 dark:text-yellow-100",
    typeColor: "bg-yellow-500",
    holo: false
  },
  "Platino": {
    frameClass: "bg-gradient-to-br from-teal-300 via-teal-100 to-teal-500 border-teal-400",
    bgClass: "bg-[#F0FAFA] dark:bg-[#1A2E2E]",
    textClass: "text-teal-900 dark:text-teal-100",
    typeColor: "bg-teal-500",
    holo: true
  },
  "Diamante": {
    frameClass: "bg-gradient-to-br from-cyan-300 via-blue-200 to-cyan-500 border-cyan-400",
    bgClass: "bg-[#F0F8FF] dark:bg-[#1A2633]",
    textClass: "text-cyan-900 dark:text-cyan-100",
    typeColor: "bg-cyan-500",
    holo: true
  },
  "Maestro": {
    frameClass: "bg-gradient-to-br from-fuchsia-500 via-purple-300 to-fuchsia-600 border-fuchsia-500",
    bgClass: "bg-[#FAF0FF] dark:bg-[#2A1A33]",
    textClass: "text-fuchsia-900 dark:text-fuchsia-100",
    typeColor: "bg-fuchsia-500",
    holo: true
  }
};

const SKIN_THEMES = {
  "Cyberpunk Neon": {
    frameClass: "bg-gradient-to-br from-purple-600 via-fuchsia-500 to-cyan-500 border-fuchsia-500",
    bgClass: "bg-[#09090B] dark:bg-[#09090B]",
    textClass: "text-fuchsia-400 dark:text-fuchsia-400",
    typeColor: "bg-fuchsia-600",
    holo: true
  },
  "Oro Holográfico": {
    frameClass: "bg-gradient-to-br from-yellow-300 via-amber-200 to-yellow-500 border-yellow-400",
    bgClass: "bg-gradient-to-b from-[#FFFDF0] to-[#FFF8D0] dark:bg-gradient-to-b dark:from-[#3A3315] dark:to-[#1A1608]",
    textClass: "text-yellow-800 dark:text-yellow-200",
    typeColor: "bg-yellow-500",
    holo: true
  },
  "Galaxia": {
    frameClass: "bg-gradient-to-br from-indigo-900 via-purple-900 to-black border-indigo-500",
    bgClass: "bg-[#0B0C10] dark:bg-[#0B0C10]",
    textClass: "text-indigo-300 dark:text-indigo-300",
    typeColor: "bg-indigo-600",
    holo: true
  },
  "Minimalista Oscuro": {
    frameClass: "bg-gradient-to-br from-zinc-800 to-black border-zinc-700",
    bgClass: "bg-[#18181B] dark:bg-[#18181B]",
    textClass: "text-zinc-300 dark:text-zinc-300",
    typeColor: "bg-zinc-700",
    holo: false
  }
};

const ICONS = { Star, Flame, TrendingUp, Heart, Sparkles, Award, Shield, Zap };

export default function StudentCard({ student, isPinned, isTop3, rankIndex, onClick }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glareX, setGlareX] = useState(50);
  const [glareY, setGlareY] = useState(50);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const { gami, name, cs_id, token, pct, equipped_skin } = student;
  const rank = gami?.rank?.name || "Hierro";
  
  // Decide theme: skin overrides rank
  const theme = equipped_skin && SKIN_THEMES[equipped_skin] 
    ? SKIN_THEMES[equipped_skin] 
    : RANK_THEMES[rank] || RANK_THEMES["Hierro"];
  
  // Streak glow effect based on gamification
  const streakGlow = gami?.streak >= 5 ? "streak-glow-lg" : gami?.streak >= 3 ? "streak-glow-sm" : "";
  
  // Pinned/Top3 styles
  const specialBorder = isPinned 
    ? "ring-4 ring-blue-500 shadow-2xl shadow-blue-500/30" 
    : isTop3 
      ? "ring-2 ring-amber-400 shadow-xl shadow-amber-500/20" 
      : "shadow-xl shadow-slate-200/50 dark:shadow-black/50";

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate rotation (-15 to 15 degrees)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateXVal = ((y - centerY) / centerY) * -15;
    const rotateYVal = ((x - centerX) / centerX) * 15;
    
    setRotateX(rotateXVal);
    setRotateY(rotateYVal);
    
    // Calculate glare position (0 to 100%)
    setGlareX((x / rect.width) * 100);
    setGlareY((y / rect.height) * 100);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlareX(50);
    setGlareY(50);
  };

  // Select up to 3 badges for the footer
  const activeBadges = (gami?.unlockedBadges || []).filter(b => b.unlocked).slice(0, 3);
  
  // Calculate HP percentage
  const hpPct = Math.max(0, Math.min(100, (gami?.hp / gami?.MAX_HP) * 100)) || 100;
  const hpColor = hpPct > 50 ? "bg-green-500" : hpPct > 20 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div 
      style={{ perspective: "1000px" }}
      className={`relative w-full aspect-[63/88] cursor-pointer group ${streakGlow} ${specialBorder} rounded-[20px] transition-all duration-300 ease-out`}
      onClick={onClick}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`w-full h-full rounded-[20px] p-2 sm:p-3 overflow-hidden ${theme.frameClass} relative transition-transform duration-200 ease-out`}
        style={{
          transform: isHovered ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)` : "rotateX(0) rotateY(0) scale(1)",
          transformStyle: "preserve-3d"
        }}
      >
        {/* Inner Card Background */}
        <div className={`w-full h-full rounded-[12px] flex flex-col ${theme.bgClass} overflow-hidden shadow-inner relative z-10 p-3`}>
          
          {/* Header: Name and HP */}
          <div className="flex justify-between items-start mb-2">
            <h3 className={`font-black text-sm sm:text-base md:text-lg truncate tracking-tighter ${theme.textClass} max-w-[65%] leading-tight`}>
              {name}
            </h3>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 font-black text-red-600 dark:text-red-400">
                <span className="text-[10px] sm:text-xs tracking-tighter">HP</span>
                <span className="text-sm sm:text-base">{gami?.hp || 100}</span>
              </div>
            </div>
          </div>

          {/* Illustration Box */}
          <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border-2 border-slate-900/10 dark:border-white/10 shadow-inner mb-2 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            
            {/* Holographic foil inside illustration for rare cards */}
            {theme.holo && isHovered && (
              <div className="absolute inset-0 z-10 mix-blend-color-dodge opacity-60"
                   style={{
                     background: `linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.4) 25%, transparent 30%, transparent 40%, rgba(255,255,255,0.4) 45%, transparent 50%)`,
                     backgroundPosition: `${glareX}% ${glareY}%`,
                     backgroundSize: '200% 200%'
                   }} />
            )}
            
            <div className="text-5xl sm:text-6xl font-black text-white mix-blend-overlay drop-shadow-xl z-20">
              {name.charAt(0).toUpperCase()}
            </div>
            
            {/* Type/Rank Badge inside image */}
            <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2">
              <div className={`px-2 py-0.5 rounded-full ${theme.typeColor} border border-white/30 text-white text-[8px] sm:text-[10px] font-black tracking-widest uppercase shadow-md flex items-center gap-1`}>
                <Shield className="w-2.5 h-2.5" /> {rank}
              </div>
            </div>
          </div>

          {/* Info Bar (Level & Class) */}
          <div className={`w-full bg-black/5 dark:bg-white/5 py-1 px-2 flex justify-between items-center text-[9px] sm:text-[10px] font-bold ${theme.textClass} rounded mb-3`}>
            <span>Nivel {gami?.currentLevel || 1} • Estudiante</span>
            <span>Racha: {gami?.streak || 0} 🔥</span>
          </div>

          {/* Attacks / Stats Section */}
          <div className="flex-1 flex flex-col gap-2 sm:gap-3 justify-center">
            
            {/* Attack 1: XP Progress */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm border border-white/20">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
              </div>
              <div className="flex-1">
                <div className={`flex justify-between items-center text-[10px] sm:text-xs font-black ${theme.textClass} mb-1`}>
                  <span>Experiencia</span>
                  <span>{gami?.currentLevelXP}/{gami?.nextLevelXP}</span>
                </div>
                <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((gami?.currentLevelXP || 0) / (gami?.nextLevelXP || 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Attack 2: Recent Performance */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm border border-white/20">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
              </div>
              <div className="flex-1 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className={`text-[10px] sm:text-xs font-black ${theme.textClass}`}>Rendimiento</span>
                  <span className={`text-[8px] sm:text-[9px] font-bold ${theme.textClass} opacity-70`}>Nota de la clase</span>
                </div>
                <span className={`text-sm sm:text-base font-black ${theme.textClass}`}>
                  {pct !== null ? `${Math.round(pct * 100)}%` : 'N/A'}
                </span>
              </div>
            </div>
            
          </div>

          {/* Footer: Weakness / Resistance (Badges) */}
          <div className="mt-auto pt-2 border-t border-black/10 dark:border-white/10">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${theme.textClass} opacity-60 mb-1`}>Logros</span>
                <div className="flex gap-1">
                  {activeBadges.length > 0 ? activeBadges.map((badge, i) => {
                    const BIcon = ICONS[badge.icon] || Star;
                    return (
                      <div key={i} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white dark:bg-slate-800 shadow flex items-center justify-center" title={badge.label}>
                        <BIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" />
                      </div>
                    );
                  }) : (
                    <span className={`text-[9px] font-bold ${theme.textClass} opacity-40`}>Ninguno aún</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Glare effect overlay */}
        {isHovered && (
          <div 
            className="absolute inset-0 z-20 pointer-events-none rounded-[12px] mix-blend-overlay transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 60%)`,
            }}
          />
        )}

        {/* Holographic Foil overlay for rare cards */}
        {theme.holo && isHovered && (
          <div 
            className="absolute inset-0 z-30 pointer-events-none rounded-[12px] mix-blend-color-dodge opacity-50"
            style={{
              background: `linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.8) 25%, transparent 30%, transparent 40%, rgba(255,255,255,0.8) 45%, transparent 50%)`,
              backgroundPosition: `${glareX}% ${glareY}%`,
              backgroundSize: '300% 300%',
              animation: 'holo-gradient 3s ease infinite'
            }}
          />
        )}
      </div>
    </div>
  );
}
