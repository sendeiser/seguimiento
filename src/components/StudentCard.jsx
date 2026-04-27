import { GraduationCap, Heart, Flame, Star, Crown, Shield, Zap, Info } from "lucide-react";

export default function StudentCard({ student, idx, isPinned, onClick, className = "" }) {
  const { gami } = student;
  const rank = gami?.rank || { name: "Hierro", color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-300" };
  const hpPct = gami ? Math.max(0, Math.min(100, (gami.hp / gami.MAX_HP) * 100)) : 100;
  
  // Calculate specific rank classes for styling
  const rankNameLower = rank.name.toLowerCase();
  const isHolo = rankNameLower === "diamante" || rankNameLower === "maestro";
  const isMetallic = rankNameLower === "oro" || rankNameLower === "platino";
  
  // Mapping ranks to some visual types
  const rankBackgrounds = {
    hierro: "from-slate-200 to-slate-400",
    bronce: "from-amber-200 to-amber-500",
    plata: "from-gray-200 to-gray-400",
    oro: "from-yellow-200 to-yellow-500",
    platino: "from-teal-200 to-teal-500",
    diamante: "from-cyan-300 to-blue-500",
    maestro: "from-fuchsia-400 to-purple-600"
  };
  const bgGradient = rankBackgrounds[rankNameLower] || rankBackgrounds.hierro;

  const pct = student.max > 0 ? Math.round((student.total / student.max) * 100) : 0;

  // 3D Tilt Effect Handler
  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Rotate values
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    
    // Glare effect update if holo
    if (isHolo) {
      const glare = card.querySelector('.glare-effect');
      if (glare) {
        glare.style.transform = `translate(${x - rect.width}px, ${y - rect.height}px)`;
        glare.style.opacity = '0.5';
      }
    }
  };

  const handleMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    if (isHolo) {
      const glare = card.querySelector('.glare-effect');
      if (glare) {
        glare.style.opacity = '0';
      }
    }
  };

  return (
    <div 
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative cursor-pointer transition-transform duration-300 ease-out flex flex-col rounded-[20px] overflow-hidden group shadow-xl bg-white ${className}`}
      style={{
        transformStyle: "preserve-3d",
        aspectRatio: "63/88", // Pokemon card ratio
        border: `8px solid ${isMetallic || isHolo ? 'transparent' : 'var(--border)'}`,
        backgroundClip: "padding-box",
      }}
    >
      {/* Dynamic Border for Metallic/Holo */}
      {(isMetallic || isHolo) && (
        <div className={`absolute inset-0 z-[-1] bg-gradient-to-br ${bgGradient} opacity-80`} style={{ margin: "-8px" }} />
      )}

      {/* Main Card Content */}
      <div className="flex-1 flex flex-col p-3 bg-slate-50 dark:bg-[var(--bg-elevated)] relative z-10 h-full overflow-hidden">
        
        {/* Header: Name and HP */}
        <div className="flex justify-between items-start mb-2">
          <div className="font-black text-[14px] md:text-lg text-[var(--text-primary)] leading-tight tracking-tight flex-1 pr-2 break-words">
            {student.name}
          </div>
          <div className="flex items-center gap-1 shrink-0 text-red-500 font-black">
            <span className="text-[10px] md:text-xs">HP</span>
            <span className="text-sm md:text-base">{Math.floor(gami?.hp || 100)}</span>
            <Heart className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* Art Window */}
        <div className={`relative w-full aspect-[4/3] rounded-lg bg-gradient-to-br ${bgGradient} border-2 border-white/50 shadow-inner flex items-center justify-center overflow-hidden mb-3`}>
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          
          <div className="text-white text-5xl font-black drop-shadow-md z-10">
            {student.name.charAt(0).toUpperCase()}
          </div>

          {/* Type Icon Badge */}
          <div className="absolute bottom-2 right-2 bg-white/30 backdrop-blur-md rounded-full p-1.5 shadow-sm">
             {rankNameLower === 'hierro' ? <Shield className="w-4 h-4 text-slate-700" /> :
              rankNameLower === 'diamante' || rankNameLower === 'maestro' ? <Crown className="w-4 h-4 text-white" /> :
              <Star className="w-4 h-4 text-white" />}
          </div>
        </div>

        {/* Info Bar */}
        <div className="flex justify-between items-center text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3 bg-[var(--bg-tertiary)] py-1 px-2 rounded-md">
          <span>Nv. {gami?.currentLevel || 1}</span>
          <span className={`${rank.color}`}>{rank.name}</span>
        </div>

        {/* Attacks / Stats */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Stat 1: XP Progress */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Zap className="w-3 h-3 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[11px] font-black text-[var(--text-primary)] leading-tight mb-1">
                <span>Rendimiento</span>
                <span className="text-blue-500">{pct}%</span>
              </div>
              <div className="w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* Stat 2: Streak */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <Flame className="w-3 h-3 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[11px] font-black text-[var(--text-primary)] leading-tight">
                <span>Racha</span>
                <span className="text-orange-500">{gami?.streak || 0}x</span>
              </div>
              <div className="text-[9px] text-[var(--text-muted)] font-semibold mt-0.5">Clases consecutivas</div>
            </div>
          </div>
        </div>

        {/* Weakness / Resistance / Badges */}
        <div className="mt-auto pt-2 border-t border-[var(--border)] flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest shrink-0">Logros:</span>
          <div className="flex gap-1 flex-nowrap">
            {gami?.unlockedBadges?.filter(b => b.unlocked).slice(0, 4).map(b => (
               <div key={b.id} className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-white/50 ${b.bg} ${b.color}`} title={b.label}>
                  <Star className="w-3 h-3" /> {/* Simplified icon for badges to avoid dynamic imports for now */}
               </div>
            ))}
            {(!gami?.unlockedBadges || gami.unlockedBadges.filter(b => b.unlocked).length === 0) && (
              <span className="text-[10px] font-bold text-[var(--text-muted)] italic">Ninguno aún</span>
            )}
          </div>
        </div>

        {/* Holo Overlay */}
        {isHolo && (
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-color-dodge z-20"
            style={{
              background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.4) 30%, transparent 40%, rgba(0, 255, 255, 0.2) 60%, transparent 80%)',
              backgroundSize: '200% 200%',
              animation: 'holo-sparkle 6s ease-in-out infinite'
            }}
          />
        )}
        
        {/* Dynamic Glare Effect on Mouse Move */}
        {isHolo && (
          <div className="glare-effect absolute top-0 left-0 w-[200%] h-[200%] pointer-events-none z-30 mix-blend-soft-light opacity-0 transition-opacity duration-300"
               style={{
                 background: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, transparent 50%)'
               }}
          />
        )}

        {/* Pinned Indicator */}
        {isPinned && (
          <div className="absolute top-2 right-2 flex gap-1 z-40">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          </div>
        )}
      </div>
    </div>
  );
}
