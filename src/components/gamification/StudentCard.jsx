import { useState, useRef } from "react";
import { Star, Flame, Award, TrendingUp, Sparkles, CheckCircle2, Shield, Zap, Crown, Heart } from "lucide-react";
import { BADGE_DEFS } from "../../lib/gamificationEngine";
import { getSkinByName, SkinPattern } from "../../lib/skinThemes";
import { useTheme } from "../../providers/ThemeProvider";

const RANK_THEMES = {
  "Hierro": {
    rankLabel: "Hierro",
    frameClass: "bg-gradient-to-br from-slate-600 via-slate-500 to-slate-700 border-slate-800",
    borderClass: "ring-1 ring-slate-400 border-[3px] border-slate-900",
    iconColor: "text-slate-200",
    fontClass: "font-mono tracking-tighter text-slate-100",
    overlay: "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30",
    holo: false
  },
  "Bronce": {
    rankLabel: "Bronce",
    frameClass: "bg-gradient-to-br from-orange-800 via-orange-600 to-amber-900 border-amber-950",
    borderClass: "ring-2 ring-orange-500/30 border-[4px] border-orange-900 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]",
    iconColor: "text-orange-200",
    fontClass: "font-['Bebas_Neue'] tracking-wider text-orange-50",
    overlay: "bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10",
    holo: false
  },
  "Plata": {
    rankLabel: "Plata",
    frameClass: "bg-gradient-to-br from-gray-400 via-gray-200 to-gray-500 border-gray-600",
    borderClass: "ring-2 ring-white/50 border-[4px] border-gray-400 shadow-lg",
    iconColor: "text-gray-700",
    fontClass: "font-['Bebas_Neue'] tracking-widest text-gray-800",
    overlay: "bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-20",
    holo: false
  },
  "Oro": {
    rankLabel: "Oro",
    frameClass: "bg-gradient-to-br from-yellow-500 via-yellow-200 to-amber-600 border-amber-500",
    borderClass: "ring-2 ring-yellow-300 border-[6px] border-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.3)]",
    iconColor: "text-amber-900",
    fontClass: "font-['Cinzel'] font-black uppercase text-amber-950",
    overlay: "bg-[url('https://www.transparenttextures.com/patterns/gold-tips.png')] opacity-30",
    holo: false
  },
  "Platino": {
    rankLabel: "Platino",
    frameClass: "bg-gradient-to-br from-teal-500 via-emerald-100 to-teal-700 border-teal-600",
    borderClass: "ring-2 ring-emerald-300 border-[6px] border-teal-600 shadow-[0_0_25px_rgba(20,184,166,0.4)]",
    iconColor: "text-teal-900",
    fontClass: "font-['Orbitron'] tracking-tighter uppercase text-teal-950",
    overlay: "bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')] opacity-20",
    holo: true
  },
  "Diamante": {
    rankLabel: "Diamante",
    frameClass: "bg-gradient-to-br from-blue-600 via-cyan-100 to-blue-800 border-blue-600",
    borderClass: "ring-4 ring-cyan-300 border-[8px] border-blue-700 shadow-[0_0_40px_rgba(6,182,212,0.5)]",
    iconColor: "text-white",
    fontClass: "font-['Orbitron'] font-black tracking-tight uppercase text-white shadow-sm",
    overlay: "bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40",
    holo: true
  },
  "Maestro": {
    rankLabel: "Maestro",
    frameClass: "bg-gradient-to-br from-purple-800 via-fuchsia-300 to-indigo-900 border-indigo-900",
    borderClass: "ring-[6px] ring-amber-400 border-[10px] border-purple-900 shadow-[0_0_60px_rgba(217,70,239,0.6),inset_0_0_30px_rgba(0,0,0,0.5)]",
    iconColor: "text-yellow-300",
    fontClass: "font-['MedievalSharp'] text-lg md:text-xl normal-case text-amber-200 drop-shadow-md",
    overlay: "bg-[url('https://www.transparenttextures.com/patterns/royal-line.png')] opacity-30",
    holo: true
  }
};

const PERFORMANCE_THEMES = {
  legend: {
    bgClass: "bg-gradient-to-br from-white via-blue-50 to-indigo-50 bg-[url('https://www.transparenttextures.com/patterns/gold-tips.png')]",
    textClass: "text-blue-900",
    typeLabel: "Leyenda",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]"
  },
  elite: {
    bgClass: "bg-gradient-to-br from-emerald-50 via-white to-teal-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]",
    textClass: "text-emerald-900",
    typeLabel: "Élite",
    glow: ""
  },
  pro: {
    bgClass: "bg-gradient-to-br from-white via-slate-50 to-blue-50 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')]",
    textClass: "text-slate-800",
    typeLabel: "Profesional",
    glow: ""
  },
  basic: {
    bgClass: "bg-white/80 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]",
    textClass: "text-slate-700",
    typeLabel: "Estándar",
    glow: ""
  }
};


const ICONS = { Star, Flame, TrendingUp, Sparkles, Award, Shield, Zap, Crown, CheckCircle2, Heart };

export default function StudentCard({ student, isPinned, isTop3, rankIndex, onClick }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glareX, setGlareX] = useState(50);
  const [glareY, setGlareY] = useState(50);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { gami, name, cs_id, pct, equipped_skin } = student;
  const rank = gami?.rank?.name || "Hierro";
  
  const rankTheme = RANK_THEMES[rank] || RANK_THEMES["Hierro"];
  const perfKey = pct >= 0.9 ? 'legend' : pct >= 0.8 ? 'elite' : pct >= 0.6 ? 'pro' : 'basic';
  const perfTheme = PERFORMANCE_THEMES[perfKey];
  
  const skin = getSkinByName(equipped_skin);

  const finalFrameClass = skin?.frameClass || (!skin?.colors ? rankTheme.frameClass : "");
  const finalBgClass = skin?.bgClass || (!skin?.bg ? perfTheme.bgClass : "");
  const finalTextClass = skin?.textClass || perfTheme.textClass;
  const finalHolo = skin?.holo ?? rankTheme.holo;

  const skinColors = skin?.colors;
  const skinBg = skin ? (isDark ? skin.bg.dark : skin.bg.light) : null;
  const skinIcon = skin?.icon;

  const RANK_ICONS = {
    "Hierro": <Shield className="w-4 h-4" />,
    "Bronce": <Star className="w-4 h-4" />,
    "Plata": <Award className="w-4 h-4" />,
    "Oro": <Crown className="w-4 h-4" />,
    "Platino": <Sparkles className="w-4 h-4" />,
    "Diamante": <TrendingUp className="w-4 h-4" />,
    "Maestro": <Crown className="w-5 h-5" />
  };

  const layoutType = pct >= 0.85 ? "full-art" : pct >= 0.6 ? "pro" : "basic";
  const xpPct = Math.min(100, ((gami?.currentLevelXP || 0) / (gami?.nextLevelXP || 1)) * 100);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setRotateX(((e.clientY - rect.top - rect.height/2) / (rect.height/2)) * -15);
    setRotateY(((e.clientX - rect.left - rect.width/2) / (rect.width/2)) * 15);
    setGlareX(((e.clientX - rect.left) / rect.width) * 100);
    setGlareY(((e.clientY - rect.top) / rect.height) * 100);
  };

  const renderLayout = () => {
    const IconComponent = skinIcon;
    return (
      <div 
        className={`w-full h-full rounded-[12px] flex flex-col ${finalBgClass} overflow-hidden relative z-10 p-3 ${layoutType === 'full-art' ? 'bg-opacity-95' : ''}`}
        style={skinBg ? { background: skinBg } : {}}
      >
        <div className={`absolute inset-0 pointer-events-none z-0 ${rankTheme.overlay}`} />
        <SkinPattern pattern={skin?.pattern} colors={skin?.colors} isHovered={isHovered} />
      
      <div className="flex justify-between items-start mb-2 gap-1 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-sm md:text-base truncate tracking-tighter uppercase leading-none" style={{ color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>{name}</h3>
          <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60 text-white shadow-[0_1px_2px_rgba(0,0,0,1)] truncate block">
            {equipped_skin ? "SKIN EQUIPADA" : `${rankTheme.rankLabel} • ${perfTheme.typeLabel}`}
          </span>
        </div>
        <div className="flex items-center gap-1 font-black text-red-500 text-xs shrink-0">
          <span className="opacity-60">HP</span>{gami?.hp || 100}
        </div>
      </div>

      <div className={`relative w-full ${layoutType === 'basic' ? 'aspect-video' : 'flex-1'} rounded-lg overflow-hidden border border-black/5 shadow-inner mb-2 bg-slate-900/05 flex items-center justify-center group-hover:scale-[1.03] transition-transform duration-500`}>
        {student.avatar_url ? (
          <img src={student.avatar_url} alt={name} className="absolute inset-0 w-full h-full object-cover z-0" />
        ) : (
          <div className="text-6xl font-black text-white opacity-20 select-none shadow-[0_2px_6px_rgba(0,0,0,1)]">{name.charAt(0).toUpperCase()}</div>
        )}
        
        <div className={`absolute top-2 left-2 z-30 ${skinColors ? '' : rankTheme.iconColor}`} style={skinColors ? { color: skinColors.frame } : {}}>
          {IconComponent ? <IconComponent className="w-4 h-4" /> : RANK_ICONS[rank]}
        </div>
        
        <div className="absolute bottom-2 left-2 right-2 z-10">
          <div className="flex justify-between items-end text-[8px] font-black opacity-40 uppercase mb-1">
            <span>Nivel {gami?.currentLevel || 1}</span>
            <span>{Math.round(xpPct)}% XP</span>
          </div>
          <div className="h-1 w-full rounded-full overflow-hidden" style={{backgroundColor: 'hsla(220, 25%, 6%, 0.1)'}}>
            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${xpPct}%` }}></div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-auto">
        <div className={`flex justify-between items-center rounded-lg px-2 py-1.5`} style={{backgroundColor: 'hsla(220, 25%, 6%, 0.05)'}}>
          <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Rendimiento</span>
          <span className="text-sm font-black text-white">{pct !== null ? `${Math.round(pct * 100)}%` : '—'}</span>
        </div>
        <div className="flex gap-1.5">
          {(gami?.unlockedBadges || []).filter(b => b.unlocked).slice(0, 4).map((badge, i) => {
             const BIcon = ICONS[badge.icon] || Star;
             return <div key={i} className="w-5 h-5 rounded bg-white/20 shadow-sm flex items-center justify-center border border-black/5" title={badge.label}><BIcon className="w-3 h-3 text-amber-500" /></div>;
          })}
          {gami?.streak >= 3 && <div className="ml-auto flex items-center gap-1 bg-orange-100 text-orange-600 px-1.5 rounded text-[10px] font-black">🔥 {gami.streak}</div>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/60 font-black">
          <span className="uppercase tracking-wider">Logros</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ width: `${((gami?.unlockedBadges || []).filter(b => b.unlocked).length / Object.keys(BADGE_DEFS).length) * 100}%` }}></div>
          </div>
          <span>{(gami?.unlockedBadges || []).filter(b => b.unlocked).length}/{Object.keys(BADGE_DEFS).length}</span>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div 
      style={{ perspective: "1000px" }}
      className={`relative w-full aspect-[63/88] cursor-pointer group rounded-[20px] transition-all duration-300 ease-out ${rankTheme.borderClass} ${isPinned ? 'ring-4 ring-blue-500 shadow-2xl' : ''}`}
      onClick={onClick}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setRotateX(0); setRotateY(0); }}
        className={`w-full h-full rounded-[20px] p-[6px] overflow-hidden ${finalFrameClass} relative transition-transform duration-200 ease-out`}
        style={{
          transform: isHovered ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)` : "rotateX(0) rotateY(0) scale(1)",
          transformStyle: "preserve-3d",
          ...(skinColors ? {
            background: `linear-gradient(135deg, ${skinColors.primary}, ${skinColors.secondary}, ${skinColors.primary})`,
            border: `2px solid ${skinColors.frame}`,
            boxShadow: isHovered ? `0 0 30px ${skinColors.glow}` : 'none'
          } : {})
        }}
      >
        {renderLayout()}
        
        {isHovered && <div className="absolute inset-0 z-40 pointer-events-none rounded-[14px] mix-blend-overlay" style={{ background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 60%)` }} />}
        
        {finalHolo && isHovered && (
          <div 
            className="absolute inset-0 z-50 pointer-events-none rounded-[14px] mix-blend-color-dodge opacity-50"
            style={{
              background: `linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.8) 25%, transparent 30%, transparent 40%, rgba(255,255,255,0.8) 45%, transparent 50%)`,
              backgroundPosition: `${glareX}% ${glareY}%`,
              backgroundSize: '300% 300%',
              animation: 'holo-gradient 4s ease infinite'
            }}
          />
        )}
      </div>
    </div>
  );
}