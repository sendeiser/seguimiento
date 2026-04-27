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

  const layoutType = equipped_skin ? 'full-art' 
    : (pct !== null && pct >= 0.85) ? 'full-art' 
    : (pct !== null && pct >= 0.6) ? 'pro' 
    : 'basic';

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

  const activeBadges = (gami?.unlockedBadges || []).filter(b => b.unlocked).slice(0, 3);
  const hpPct = Math.max(0, Math.min(100, (gami?.hp / gami?.MAX_HP) * 100)) || 100;
  const hpColor = hpPct > 50 ? "bg-green-500" : hpPct > 20 ? "bg-yellow-500" : "bg-red-500";
  const xpPct = Math.min(100, ((gami?.currentLevelXP || 0) / (gami?.nextLevelXP || 1)) * 100);

  // --- RENDERS POR LAYOUT ---

  const renderBasicLayout = () => (
    <div className={`w-full h-full rounded-[12px] flex flex-col ${theme.bgClass} overflow-hidden shadow-inner relative z-10 p-3`}>
      {/* Header Clásico */}
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-black text-sm sm:text-base md:text-lg truncate tracking-tighter ${theme.textClass} max-w-[65%] leading-tight`}>{name}</h3>
        <div className="flex items-center gap-1 font-black text-red-600 dark:text-red-400">
          <span className="text-[10px] sm:text-xs tracking-tighter">HP</span>
          <span className="text-sm sm:text-base">{gami?.hp || 100}</span>
        </div>
      </div>

      {/* Ilustración Cuadrada */}
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border-2 border-slate-900/10 shadow-inner mb-2 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="text-5xl sm:text-6xl font-black text-white mix-blend-overlay drop-shadow-xl z-20">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2">
          <div className={`px-2 py-0.5 rounded-full ${theme.typeColor} border border-white/30 text-white text-[8px] sm:text-[10px] font-black tracking-widest uppercase shadow-md flex items-center gap-1`}>
            <Shield className="w-2.5 h-2.5" /> {rank}
          </div>
        </div>
      </div>

      <div className={`w-full bg-black/5 py-1 px-2 flex justify-between items-center text-[9px] sm:text-[10px] font-bold ${theme.textClass} rounded mb-3`}>
        <span>Nvl {gami?.currentLevel || 1}</span>
        <span>Racha {gami?.streak || 0} 🔥</span>
      </div>

      {/* Stats Simples */}
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm"><Star className="w-3 h-3 fill-current" /></div>
          <div className="flex-1">
            <div className={`flex justify-between items-center text-[10px] font-black ${theme.textClass} mb-1`}>
              <span>Exp</span><span>{gami?.currentLevelXP}/{gami?.nextLevelXP}</span>
            </div>
            <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${xpPct}%` }}></div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm"><Zap className="w-3 h-3 fill-current" /></div>
          <div className="flex-1 flex justify-between items-center">
            <span className={`text-[10px] font-black ${theme.textClass}`}>Rendimiento</span>
            <span className={`text-sm font-black ${theme.textClass}`}>{pct !== null ? `${Math.round(pct * 100)}%` : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Badges footer */}
      <div className="mt-auto pt-2 border-t border-black/10">
        <div className="flex gap-1">
          {activeBadges.length > 0 ? activeBadges.map((badge, i) => {
            const BIcon = ICONS[badge.icon] || Star;
            return <div key={i} className="w-4 h-4 rounded-full bg-white shadow flex items-center justify-center"><BIcon className="w-2.5 h-2.5 text-amber-500" /></div>;
          }) : <span className={`text-[9px] font-bold ${theme.textClass} opacity-40`}>Sin logros</span>}
        </div>
      </div>
    </div>
  );

  const renderProLayout = () => (
    <div className={`w-full h-full rounded-[12px] flex flex-col ${theme.bgClass} overflow-hidden shadow-inner relative z-10`}>
      {/* Ilustración Superior Ampliada */}
      <div className="relative w-full h-[55%] flex items-center justify-center bg-gradient-to-br from-slate-900 to-black overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        {/* Halo de luz de fondo */}
        <div className={`absolute w-32 h-32 blur-[40px] rounded-full opacity-50 ${theme.typeColor.replace('bg-', 'bg-')}`}></div>
        
        <div className="text-7xl font-black text-white mix-blend-overlay drop-shadow-2xl z-20">
          {name.charAt(0).toUpperCase()}
        </div>
        
        {/* Cabecera Flotante */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-30">
          <div className={`px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[9px] font-black tracking-widest uppercase flex items-center gap-1`}>
            <Shield className="w-3 h-3" /> {rank}
          </div>
          <div className="px-2 py-0.5 rounded-full bg-red-500/80 backdrop-blur-md border border-red-400/50 text-white text-[10px] font-black shadow-lg">
            HP {gami?.hp || 100}
          </div>
        </div>
      </div>

      {/* Contenido Glassmorphism */}
      <div className="flex-1 flex flex-col p-3 relative bg-gradient-to-t from-black/5 to-transparent">
        <h3 className={`font-black text-lg md:text-xl truncate tracking-tighter ${theme.textClass} mb-0.5 leading-none`}>{name}</h3>
        <p className={`text-[10px] font-bold ${theme.textClass} opacity-60 mb-3`}>Nivel {gami?.currentLevel || 1} • Racha {gami?.streak || 0} 🔥</p>
        
        <div className="space-y-3 mt-1">
          <div>
            <div className={`flex justify-between items-end text-[10px] font-black ${theme.textClass} mb-1 uppercase tracking-widest`}>
              <span>Exp</span>
              <span className="text-xs">{gami?.currentLevelXP}/{gami?.nextLevelXP}</span>
            </div>
            <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-500" style={{ width: `${xpPct}%` }}></div>
            </div>
          </div>
          
          <div className="flex justify-between items-center bg-white/40 dark:bg-black/20 p-2 rounded-xl backdrop-blur-sm border border-white/20">
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textClass}`}>Rendimiento</span>
            <span className={`text-lg font-black ${theme.textClass} drop-shadow-sm`}>{pct !== null ? `${Math.round(pct * 100)}%` : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFullArtLayout = () => (
    <div className={`w-full h-full rounded-[12px] flex flex-col overflow-hidden relative z-10 bg-slate-900`}>
      {/* Fondo Ilustración Completo */}
      <div className={`absolute inset-0 ${theme.bgClass} flex items-center justify-center opacity-90`}>
        <div className="text-[120px] font-black text-white mix-blend-overlay drop-shadow-2xl z-20 rotate-[-10deg] scale-110 blur-[1px]">
          {name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Degradados y sombras superpuestas para lectura */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50 z-20"></div>

      {/* Cabecera Legendaria */}
      <div className="relative z-30 p-3 flex justify-between items-start">
        <h3 className="font-black text-xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate max-w-[70%]">{name}</h3>
        <div className="flex items-center gap-1 font-black text-red-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-lg">
          <span className="text-xs">HP</span>{gami?.hp || 100}
        </div>
      </div>

      {/* Rango flotante */}
      <div className="relative z-30 px-3">
         <span className={`inline-block px-2 py-0.5 rounded ${theme.typeColor} border border-white/20 text-white text-[9px] font-black uppercase tracking-widest shadow-xl`}>
           {equipped_skin ? `SKIN: ${equipped_skin}` : rank}
         </span>
      </div>

      <div className="flex-1"></div>

      {/* Caja de Stats (Bottom) */}
      <div className="relative z-30 p-3 space-y-3">
        {/* Barra XP de Neón */}
        <div>
          <div className="flex justify-between items-end text-[9px] font-black text-white/80 mb-1 uppercase tracking-widest">
            <span>Nivel {gami?.currentLevel || 1}</span>
            <span>{gami?.currentLevelXP}/{gami?.nextLevelXP} XP</span>
          </div>
          <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
            <div className={`h-full ${theme.typeColor} transition-all duration-500 shadow-[0_0_10px_currentColor]`} style={{ width: `${xpPct}%` }}></div>
          </div>
        </div>

        {/* Stats Grid Legendaria */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center">
            <span className="text-[8px] text-white/60 font-black uppercase tracking-widest">Racha</span>
            <span className="text-base text-white font-black flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400"/> {gami?.streak || 0}</span>
          </div>
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center">
            <span className="text-[8px] text-white/60 font-black uppercase tracking-widest">Poder</span>
            <span className="text-base text-white font-black">{pct !== null ? `${Math.round(pct * 100)}%` : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );

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
        className={`w-full h-full rounded-[20px] p-[6px] overflow-hidden ${theme.frameClass} relative transition-transform duration-200 ease-out`}
        style={{
          transform: isHovered ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)` : "rotateX(0) rotateY(0) scale(1)",
          transformStyle: "preserve-3d"
        }}
      >
        {layoutType === 'basic' && renderBasicLayout()}
        {layoutType === 'pro' && renderProLayout()}
        {layoutType === 'full-art' && renderFullArtLayout()}

        {/* Glare effect overlay */}
        {isHovered && (
          <div 
            className="absolute inset-0 z-40 pointer-events-none rounded-[14px] mix-blend-overlay transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 60%)`,
            }}
          />
        )}

        {/* Holographic Foil overlay for rare cards */}
        {theme.holo && isHovered && (
          <div 
            className="absolute inset-0 z-50 pointer-events-none rounded-[14px] mix-blend-color-dodge opacity-50"
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
