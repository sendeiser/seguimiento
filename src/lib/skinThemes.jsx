import { Sparkles, Star, Zap, Snowflake, Trees, Eye, Shield, Flame, CloudRain, Rainbow, Hexagon, Crown, Heart, Anchor, Sun, Moon, Skull, Cpu, Gem } from "lucide-react";

export const DragonIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L8 6h3l-2 4-5-5 2-3H4l4 4-4 8 8-4v3l-6-6 6-4v3l-4-4 4-3z"/>
  </svg>
);

export const SkinPattern = ({ pattern, colors, isHovered }) => {
  if (!pattern) return null;

  switch (pattern) {
    case 'dragon-fire':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] opacity-70">
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 120%, ${colors.primary} 0%, transparent 70%)` }} />
          {[...Array(12)].map((_, i) => (
             <div key={i} className="absolute rounded-full mix-blend-screen" style={{
               background: i % 2 === 0 ? colors.accent : colors.secondary,
               width: Math.random() * 6 + 2, height: Math.random() * 20 + 10,
               left: `${5 + i * 8}%`, bottom: `-${Math.random() * 30}%`,
               animation: `fire-flicker ${0.5 + Math.random()}s infinite alternate, float-up-scale ${1.5 + Math.random()}s infinite ${Math.random()}s`,
               filter: 'blur(1px)'
             }} />
          ))}
        </div>
      );
    case 'electric':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at top right, ${colors.primary}20, transparent 60%)` }} />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute h-px w-[150%]" style={{
              top: `${10 + i * 12}%`, left: '-25%',
              background: `linear-gradient(90deg, transparent, ${colors.accent}, ${colors.frame}, ${colors.accent}, transparent)`,
              animation: `electric-pulse ${0.2 + Math.random()*0.3}s infinite ${Math.random()}s`,
              transform: `rotate(${Math.random() * 10 - 5}deg) scaleY(${Math.random() * 2 + 1})`,
              filter: `drop-shadow(0 0 5px ${colors.frame})`
            }} />
          ))}
        </div>
      );
    case 'ice-storm':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] opacity-80">
           <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colors.frame}30, transparent 50%, ${colors.primary}20)` }} />
           {[...Array(25)].map((_, i) => (
             <div key={i} className="absolute bg-white" style={{
               clipPath: i % 2 === 0 ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'circle(50% at 50% 50%)',
               width: Math.random() * 5 + 2, height: Math.random() * 5 + 2,
               left: `${Math.random() * 100}%`, top: `-${Math.random() * 20}%`,
               boxShadow: `0 0 8px ${colors.accent}`,
               animation: `snow-fall ${2 + Math.random() * 3}s linear infinite ${Math.random() * 2}s`
             }} />
           ))}
        </div>
      );
    case 'forest':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
           <div className="absolute inset-0" style={{ background: `linear-gradient(to top right, ${colors.primary}40, transparent 70%)` }} />
           {[...Array(12)].map((_, i) => (
             <div key={i} className="absolute opacity-60" style={{
                background: i % 2 === 0 ? colors.accent : colors.frame,
                width: Math.random() * 10 + 5, height: Math.random() * 20 + 10,
                borderRadius: '50% 0 50% 0',
                left: `${Math.random() * 100}%`, top: `-${Math.random() * 20}%`,
                animation: `leaf-fall ${3 + Math.random() * 2}s linear infinite ${Math.random() * 2}s`,
                filter: `drop-shadow(0 0 5px ${colors.secondary})`
             }} />
           ))}
        </div>
      );
    case 'void-eye':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]" style={{ '--eye-color': colors.frame }}>
           <div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${colors.secondary}60 0%, transparent 60%)` }} />
           <div className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-[100%_0_100%_0] rotate-45 border-4" style={{
             borderColor: colors.accent,
             animation: 'pulse-eye 4s ease-in-out infinite'
           }}>
              <div className="absolute top-1/2 left-1/2 w-8 h-8 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ background: colors.primary, boxShadow: `0 0 20px ${colors.frame}` }} />
           </div>
        </div>
      );
    case 'gold-shield':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] opacity-50">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(30deg, ${colors.frame} 12%, transparent 12.5%, transparent 87%, ${colors.frame} 87.5%, ${colors.frame}), linear-gradient(150deg, ${colors.frame} 12%, transparent 12.5%, transparent 87%, ${colors.frame} 87.5%, ${colors.frame}), linear-gradient(30deg, ${colors.frame} 12%, transparent 12.5%, transparent 87%, ${colors.frame} 87.5%, ${colors.frame}), linear-gradient(150deg, ${colors.frame} 12%, transparent 12.5%, transparent 87%, ${colors.frame} 87.5%, ${colors.frame}), linear-gradient(60deg, ${colors.secondary} 25%, transparent 25.5%, transparent 75%, ${colors.secondary} 75%, ${colors.secondary}), linear-gradient(60deg, ${colors.secondary} 25%, transparent 25.5%, transparent 75%, ${colors.secondary} 75%, ${colors.secondary})`,
            backgroundSize: '30px 52px', backgroundPosition: '0 0, 0 0, 15px 26px, 15px 26px, 0 0, 15px 26px',
            animation: 'pan-bg 15s linear infinite'
          }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      );
    case 'inferno':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.primary}90, ${colors.secondary}50, transparent 80%)` }} />
          {[...Array(15)].map((_, i) => (
             <div key={i} className="absolute rounded-[100%_0_100%_0] mix-blend-color-dodge" style={{
               background: `linear-gradient(45deg, ${colors.accent}, transparent)`,
               width: Math.random() * 30 + 10, height: Math.random() * 30 + 10,
               left: `${Math.random() * 100}%`, bottom: `-${Math.random() * 30}%`,
               animation: `float-up-scale ${1 + Math.random()*1.5}s infinite ${Math.random()}s`,
               transform: 'rotate(-45deg)'
             }} />
          ))}
        </div>
      );
    case 'obsidian-rain':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${colors.secondary}80, transparent)` }} />
          {[...Array(30)].map((_, i) => (
            <div key={i} className="absolute" style={{
              width: 2, height: Math.random() * 30 + 20,
              background: `linear-gradient(to bottom, transparent, ${colors.accent})`,
              left: `${Math.random() * 120 - 10}%`, top: `-${Math.random() * 50}%`,
              animation: `rain-fall ${0.3 + Math.random()*0.4}s linear infinite ${Math.random()}s`,
              transform: 'rotate(15deg)'
            }} />
          ))}
        </div>
      );
    case 'rainbow-prism':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
           <div className="absolute inset-0 opacity-60 mix-blend-color-dodge" style={{
             background: 'linear-gradient(124deg, #ff2400, #e81d1d, #e8b71d, #e3e81d, #1de840, #1ddde8, #2b1de8, #dd00f3, #dd00f3)',
             backgroundSize: '400% 400%',
             animation: 'rainbow-bg 6s ease infinite'
           }} />
           <div className="absolute inset-0" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
           {[...Array(5)].map((_, i) => (
             <div key={i} className="absolute rounded-full mix-blend-overlay" style={{
               background: 'white', width: 100, height: 100,
               left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
               filter: 'blur(20px)', animation: 'pulse-eye 4s infinite alternate'
             }} />
           ))}
        </div>
      );
    case 'fallen-feathers':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] opacity-50">
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at top, ${colors.frame}40, transparent)` }} />
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute" style={{
              width: 15, height: 40, background: `linear-gradient(to bottom, ${colors.primary}, transparent)`,
              borderRadius: '50% 50% 0 50%',
              left: `${Math.random() * 100}%`, top: `-${Math.random() * 20}%`,
              filter: 'drop-shadow(0 0 2px white)', 
              animation: `leaf-fall ${4 + Math.random()*3}s ease-in-out infinite ${Math.random()*2}s`
            }} />
          ))}
        </div>
      );
    case 'crystal-hex':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0" style={{ background: `linear-gradient(45deg, ${colors.primary}40, transparent)` }} />
          {[...Array(10)].map((_, i) => (
             <div key={i} className="absolute" style={{
               width: 0, height: 0,
               borderLeft: `${Math.random()*10+5}px solid transparent`, borderRight: `${Math.random()*10+5}px solid transparent`,
               borderBottom: `${Math.random()*30+15}px solid ${i%2===0 ? colors.accent : colors.frame}`,
               left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
               filter: `drop-shadow(0 0 8px ${colors.secondary})`,
               animation: `crystal-spin ${3 + Math.random()*4}s linear infinite ${Math.random()*2}s`
             }} />
          ))}
        </div>
      );
    case 'cyber-cpu':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
           <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: `linear-gradient(${colors.frame} 1px, transparent 1px), linear-gradient(90deg, ${colors.frame} 1px, transparent 1px)`,
              backgroundSize: '25px 25px', animation: 'pan-bg 8s linear infinite'
           }} />
           {[...Array(5)].map((_, i) => (
             <div key={i} className="absolute bg-cyan-400" style={{
               width: i%2===0 ? '2px' : '30%', height: i%2===0 ? '30%' : '2px',
               left: `${Math.random()*100}%`, top: `${Math.random()*100}%`,
               boxShadow: `0 0 10px ${colors.accent}`,
               animation: `cyber-data ${1 + Math.random()}s steps(5, end) infinite ${Math.random()}s`
             }} />
           ))}
           <div className="absolute top-1/2 left-1/2 w-20 h-20 border-4 -translate-x-1/2 -translate-y-1/2" style={{
             borderColor: colors.accent, boxShadow: `0 0 30px ${colors.primary}, inset 0 0 20px ${colors.primary}`,
             background: `repeating-linear-gradient(45deg, transparent, transparent 5px, ${colors.frame}20 5px, ${colors.frame}20 10px)`
           }} />
        </div>
      );
    case 'royal-crown':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
           <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colors.primary}60, transparent, ${colors.secondary}60)` }} />
           {[...Array(6)].map((_, i) => (
             <div key={i} className="absolute top-0 w-full h-[150%] origin-top opacity-30 mix-blend-overlay" style={{
               background: `linear-gradient(to bottom, ${colors.accent}, transparent)`,
               transform: `rotate(${(i - 2.5) * 15}deg)`, left: `${(i - 2.5) * 10}%`
             }} />
           ))}
        </div>
      );
    case 'void-skull':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at bottom, ${colors.primary}80 0%, transparent 80%)` }} />
          {[...Array(8)].map((_, i) => (
             <div key={i} className="absolute text-4xl" style={{
               color: colors.frame, textShadow: `0 0 15px ${colors.accent}`,
               left: `${10 + i * 12}%`, bottom: '-20%',
               animation: `skull-float ${4 + Math.random()*3}s ease-in-out infinite ${Math.random()*2}s`
             }}>☠</div>
          ))}
        </div>
      );
    case 'eternal-heart':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
           <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)` }} />
           {[...Array(10)].map((_, i) => (
              <div key={i} className="absolute" style={{
                color: i%2===0 ? colors.accent : colors.frame,
                left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                fontSize: `${Math.random()*2 + 1}rem`,
                animation: `pulse-heart ${1.5 + Math.random()}s infinite ${Math.random()}s`
              }}>♥</div>
           ))}
        </div>
      );
    case 'sun-rays':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] mix-blend-screen">
          <div className="absolute inset-0 opacity-50" style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${colors.frame} 15deg, transparent 30deg, ${colors.frame} 45deg, transparent 60deg, ${colors.frame} 75deg, transparent 90deg, ${colors.frame} 105deg, transparent 120deg, ${colors.frame} 135deg, transparent 150deg, ${colors.frame} 165deg, transparent 180deg, ${colors.frame} 195deg, transparent 210deg, ${colors.frame} 225deg, transparent 240deg, ${colors.frame} 255deg, transparent 270deg, ${colors.frame} 285deg, transparent 300deg, ${colors.frame} 315deg, transparent 330deg, ${colors.frame} 345deg, transparent 360deg)`,
            animation: 'spin 30s linear infinite'
          }} />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{
            background: `radial-gradient(circle, ${colors.accent} 0%, transparent 70%)`,
            animation: 'sun-flare 3s ease-in-out infinite'
          }} />
        </div>
      );
    case 'abyssal-anchor':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.primary}90, ${colors.secondary}40, transparent)` }} />
          {[...Array(15)].map((_, i) => (
             <div key={i} className="absolute rounded-full border-2 mix-blend-screen" style={{
               borderColor: colors.accent, boxShadow: `inset 0 0 10px ${colors.frame}`,
               width: Math.random()*15 + 5, height: Math.random()*15 + 5,
               left: `${Math.random()*100}%`, bottom: `-${Math.random()*20}%`,
               animation: `bubble-rise ${2 + Math.random()*3}s ease-in infinite ${Math.random()*2}s`
             }} />
          ))}
          <div className="absolute top-0 w-full h-[200%] opacity-20" style={{
             background: `linear-gradient(90deg, transparent, ${colors.frame}, transparent)`,
             transform: 'skewX(-20deg) translateX(-50%)', animation: 'pan-bg 10s linear infinite'
          }} />
        </div>
      );
    // Legacy skins use old ones
    case 'cosmic':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute rounded-full" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              background: i % 3 === 0 ? colors.frame : colors.accent,
              opacity: isHovered ? 0.8 : 0.3
            }} />
          ))}
        </div>
      );
    case 'dark':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-30" style={{ background: colors.frame, filter: 'blur(40px)' }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-20" style={{ background: colors.accent, filter: 'blur(30px)' }} />
        </div>
      );
    case 'royal':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${colors.frame}, ${colors.accent}, ${colors.frame})` }} />
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${colors.frame}, ${colors.accent}, ${colors.frame})` }} />
        </div>
      );
    default:
      return null;
  }
};

export const SKIN_THEMES = {
  // --- LEGACY SKINS ---
  "Cyberpunk Neon": {
    name: "Cyberpunk Neon",
    frameClass: "bg-gradient-to-br from-purple-600 via-fuchsia-500 to-cyan-500 border-fuchsia-500",
    bgClass: "bg-[#0c0f14] bg-[url('https://www.transparenttextures.com/patterns/microfab.png')]",
    textClass: "text-fuchsia-400",
    colors: { primary: "300 100% 50%", secondary: "320 100% 50%", accent: "180 100% 50%", frame: "#d946ef", glow: "rgba(217,70,239,0.6)" },
    bg: { light: "#000", dark: "#000" },
    holo: true,
    icon: Zap,
    pattern: "electric"
  },
  "Oro Holográfico": {
    name: "Oro Holográfico",
    frameClass: "bg-gradient-to-br from-yellow-300 via-amber-100 to-yellow-500 border-yellow-400",
    bgClass: "bg-gradient-to-b from-[#1a1805] to-[#000000] bg-[url('https://www.transparenttextures.com/patterns/gold-tips.png')]",
    textClass: "text-yellow-400",
    colors: { primary: "45 100% 50%", secondary: "50 100% 50%", accent: "60 100% 50%", frame: "#eab308", glow: "rgba(234,179,8,0.6)" },
    bg: { light: "#1a1805", dark: "#1a1805" },
    holo: true,
    icon: Sparkles,
    pattern: "royal"
  },
  "Galaxia": {
    name: "Galaxia",
    frameClass: "bg-gradient-to-br from-blue-900 via-indigo-600 to-purple-900 border-indigo-500",
    bgClass: "bg-gradient-to-br from-[#0b0e21] via-[#161b44] to-[#0b0e21] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]",
    textClass: "text-indigo-200",
    colors: { primary: "240 100% 30%", secondary: "260 100% 40%", accent: "280 100% 50%", frame: "#6366f1", glow: "rgba(99,102,241,0.6)" },
    bg: { light: "#0b0e21", dark: "#0b0e21" },
    holo: true,
    icon: Star,
    pattern: "cosmic"
  },
  "Minimalista Oscuro": {
    name: "Minimalista Oscuro",
    frameClass: "bg-gradient-to-br from-slate-800 via-slate-900 to-black border-slate-700",
    bgClass: "bg-neutral-900 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]",
    textClass: "text-slate-300",
    colors: { primary: "0 0% 10%", secondary: "0 0% 5%", accent: "0 0% 30%", frame: "#1e293b", glow: "rgba(30,41,59,0.6)" },
    bg: { light: "#171717", dark: "#171717" },
    holo: false,
    icon: Shield,
    pattern: "dark"
  },

  // --- LEGENDARY SKINS (MARKETPLACE) ---
  "Draco Celestial": {
    name: "Draco Celestial",
    colors: { primary: "262 100% 60%", secondary: "280 100% 45%", accent: "30 100% 60%", frame: "#a855f7", glow: "rgba(168,85,247,0.8)" },
    bg: { light: "#faf5ff", dark: "#1e0b2e" },
    icon: DragonIcon,
    description: "El poder ancestral del dragón celestial despierta en ti.",
    pattern: "dragon-fire",
    textClass: "text-purple-300"
  },
  "Tormenta Eléctrica": {
    name: "Tormenta Eléctrica",
    colors: { primary: "50 100% 50%", secondary: "60 100% 40%", accent: "180 100% 60%", frame: "#facc15", glow: "rgba(250,204,21,0.8)" },
    bg: { light: "#fefce8", dark: "#1a1500" },
    icon: Zap,
    description: "Descarga la energía pura de mil tormentas.",
    pattern: "electric",
    textClass: "text-yellow-300"
  },
  "Reino de Hielo": {
    name: "Reino de Hielo",
    colors: { primary: "190 100% 50%", secondary: "210 100% 40%", accent: "160 100% 80%", frame: "#22d3ee", glow: "rgba(34,211,238,0.8)" },
    bg: { light: "#ecfeff", dark: "#031a1f" },
    icon: Snowflake,
    description: "El frío eterno del reino más allá del mundo.",
    pattern: "ice-storm",
    textClass: "text-cyan-300"
  },
  "Naturaleza Salvaje": {
    name: "Naturaleza Salvaje",
    colors: { primary: "140 100% 40%", secondary: "160 100% 30%", accent: "100 100% 60%", frame: "#4ade80", glow: "rgba(74,222,128,0.8)" },
    bg: { light: "#f0fdf4", dark: "#051a0d" },
    icon: Trees,
    description: "Conecta con la esencia primal de la naturaleza.",
    pattern: "forest",
    textClass: "text-green-300"
  },
  "Shadow del Vacío": {
    name: "Shadow del Vacío",
    colors: { primary: "250 100% 20%", secondary: "280 100% 15%", accent: "260 100% 60%", frame: "#818cf8", glow: "rgba(129,140,248,0.8)" },
    bg: { light: "#eef2ff", dark: "#0a0a1a" },
    icon: Eye,
    description: "Las sombras del vacío te abrazan con poder.",
    pattern: "void-eye",
    textClass: "text-indigo-300"
  },
  "Armadura Dorada": {
    name: "Armadura Dorada",
    colors: { primary: "45 100% 50%", secondary: "40 100% 40%", accent: "30 100% 80%", frame: "#eab308", glow: "rgba(234,179,8,0.8)" },
    bg: { light: "#fefce8", dark: "#1a1400" },
    icon: Shield,
    description: "Una armadura legendaria forjada en oro puro.",
    pattern: "gold-shield",
    textClass: "text-amber-400"
  },
  "Alma de Fuego": {
    name: "Alma de Fuego",
    colors: { primary: "15 100% 50%", secondary: "0 100% 40%", accent: "30 100% 60%", frame: "#ef4444", glow: "rgba(239,68,68,0.8)" },
    bg: { light: "#fef2f2", dark: "#1a0505" },
    icon: Flame,
    description: "La pasión ardiente de un guerrero infinito.",
    pattern: "inferno",
    textClass: "text-red-400"
  },
  "Tormenta de Obsidiana": {
    name: "Tormenta de Obsidiana",
    colors: { primary: "0 0% 10%", secondary: "0 0% 5%", accent: "280 100% 60%", frame: "#52525b", glow: "rgba(82,82,91,0.8)" },
    bg: { light: "#fafafa", dark: "#09090b" },
    icon: CloudRain,
    description: "Tormentas de poder absoluto congeladas en el tiempo.",
    pattern: "obsidian-rain",
    textClass: "text-zinc-400"
  },
  "Prisma Arcoíris": {
    name: "Prisma Arcoíris",
    colors: { primary: "300 100% 50%", secondary: "180 100% 50%", accent: "0 0% 100%", frame: "#f472b6", glow: "rgba(244,114,182,0.8)" },
    bg: { light: "#fdf2f8", dark: "#1a0514" },
    icon: Rainbow,
    description: "La luz del espectro completo brilla a través de ti.",
    pattern: "rainbow-prism",
    textClass: "text-pink-300"
  },
  "Ángel Caído": {
    name: "Ángel Caído",
    colors: { primary: "220 100% 40%", secondary: "240 100% 30%", accent: "180 100% 80%", frame: "#60a5fa", glow: "rgba(96,165,250,0.8)" },
    bg: { light: "#eff6ff", dark: "#0a1525" },
    icon: Star,
    description: "Un ángel que eligió su propio destino.",
    pattern: "fallen-feathers",
    textClass: "text-blue-300"
  },
  "Demonio de Cristal": {
    name: "Demonio de Cristal",
    colors: { primary: "320 100% 50%", secondary: "340 100% 40%", accent: "300 100% 70%", frame: "#f43f5e", glow: "rgba(244,63,94,0.8)" },
    bg: { light: "#fdf2f8", dark: "#1a0510" },
    icon: Hexagon,
    description: "Pureza cristalina corrompida por poder oscuro.",
    pattern: "crystal-hex",
    textClass: "text-pink-400"
  },
  "Nexus Tecnológico": {
    name: "Nexus Tecnológico",
    colors: { primary: "170 100% 40%", secondary: "190 100% 30%", accent: "150 100% 50%", frame: "#2dd4bf", glow: "rgba(45,212,191,0.8)" },
    bg: { light: "#ecfeff", dark: "#031a21" },
    icon: Cpu,
    description: "La fusión perfecta de tecnología y magia.",
    pattern: "cyber-cpu",
    textClass: "text-cyan-400"
  },
  "Legado Real": {
    name: "Legado Real",
    colors: { primary: "30 100% 50%", secondary: "15 100% 40%", accent: "45 100% 70%", frame: "#f59e0b", glow: "rgba(245,158,11,0.8)" },
    bg: { light: "#fff7ed", dark: "#1a0f05" },
    icon: Crown,
    description: "El linaje de mil reyes fluye en tus venas.",
    pattern: "royal-crown",
    textClass: "text-amber-500"
  },
  "Espina del Vacío": {
    name: "Espina del Vacío",
    colors: { primary: "280 100% 30%", secondary: "300 100% 20%", accent: "320 100% 60%", frame: "#a855f7", glow: "rgba(168,85,247,0.8)" },
    bg: { light: "#f5f3ff", dark: "#0f0518" },
    icon: Skull,
    description: "Una espina del vacío que atraviesa dimensiones.",
    pattern: "void-skull",
    textClass: "text-violet-400"
  },
  "Amor Eterno": {
    name: "Amor Eterno",
    colors: { primary: "350 100% 50%", secondary: "340 100% 40%", accent: "0 100% 70%", frame: "#fb7185", glow: "rgba(251,113,133,0.8)" },
    bg: { light: "#fff1f2", dark: "#1a050a" },
    icon: Heart,
    description: "El amor eterno que trasciende el tiempo.",
    pattern: "eternal-heart",
    textClass: "text-rose-400"
  },
  "Espíritu de la Luz": {
    name: "Espíritu de la Luz",
    colors: { primary: "55 100% 60%", secondary: "45 100% 50%", accent: "0 100% 100%", frame: "#fef08a", glow: "rgba(254,240,138,0.8)" },
    bg: { light: "#fefce8", dark: "#1a1500" },
    icon: Sun,
    description: "La luz primordial que ilumina la oscuridad.",
    pattern: "sun-rays",
    textClass: "text-yellow-200"
  },
  "Profundidad Abisal": {
    name: "Profundidad Abisal",
    colors: { primary: "200 100% 30%", secondary: "220 100% 20%", accent: "180 100% 60%", frame: "#38bdf8", glow: "rgba(56,189,248,0.8)" },
    bg: { light: "#f0f9ff", dark: "#031017" },
    icon: Anchor,
    description: "Las profundidades abisales guardan secretos antiguos.",
    pattern: "abyssal-anchor",
    textClass: "text-sky-300"
  }
};

export const getSkinByName = (name) => {
  if (!name) return null;
  
  // Try direct match
  if (SKIN_THEMES[name]) return SKIN_THEMES[name];
  
  // Try normalized match (remove accents)
  const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const normalizedName = normalize(name);
  
  return Object.values(SKIN_THEMES).find(skin => 
    normalize(skin.name) === normalizedName
  ) || null;
};
