import { useState } from "react";
import { Sparkles, Star, Zap, Snowflake, Trees, Eye, Shield, Flame, CloudRain, Rainbow, Hexagon, Crown, Heart, Anchor, Sun, Moon, Skull, Cpu, Gem, Battery } from "lucide-react";

import { SKIN_THEMES, getSkinByName, SkinPattern } from "../../lib/skinThemes";


export function ShopCard({ reward, purchase, notyxCoins, onBuy, onEquip, onPreview, isDark }) {
  const [isHovered, setIsHovered] = useState(false);
  const isBought = !!purchase;
  const isEquipped = purchase?.status === 'equipped';
  const canAfford = notyxCoins >= reward.cost_coins;

  const skin = getSkinByName(reward.name);
  const colors = skin?.colors || { primary: "262 83% 60%", secondary: "270 70% 55%", accent: "280 90% 70%", frame: "#9333ea", glow: "rgba(147,51,234,0.6)" };
  const bgColor = skin ? (isDark ? skin.bg.dark : skin.bg.light) : (isDark ? '#1e293b' : '#f8fafc');
  const IconComponent = skin?.icon || Sparkles;
  const pattern = skin?.pattern;

  return (
    <div 
      className="group relative p-6 rounded-[2rem] transition-all duration-300 hover:scale-[1.02] hover:-translate-y-2 flex flex-col h-full min-w-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: bgColor,
        backdropFilter: 'blur(20px)',
        border: isEquipped 
          ? `2px solid ${colors.frame}` 
          : isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        boxShadow: isEquipped 
          ? `0 20px 40px -15px ${colors.glow}, 0 0 30px -10px ${colors.glow}`
          : isHovered 
            ? `0 20px 40px -15px ${colors.glow}`
            : '0 10px 40px rgba(0,0,0,0.1)',
      }}
    >
      <SkinPattern pattern={pattern} colors={colors} isHovered={isHovered} />

      {isEquipped && (
        <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl z-10" style={{
          background: `linear-gradient(135deg, ${colors.frame}, ${colors.accent})`,
          boxShadow: `0 4px 15px ${colors.glow}`
        }}>
          <span className="font-['DM_Sans'] font-bold text-[10px] uppercase tracking-widest text-white">Equipada</span>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[2rem]" style={{
        background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.primary})`
      }} />

      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" style={{
          background: `linear-gradient(135deg, ${colors.frame}30, ${colors.frame}10)`,
          border: `2px solid ${colors.frame}`,
          boxShadow: isHovered ? `0 8px 25px ${colors.glow}` : 'none'
        }}>
          <IconComponent className="w-8 h-8" style={{ color: colors.frame }} />
        </div>
        <button 
          onClick={() => onPreview(reward)}
          className="absolute -top-2 -right-2 p-2 rounded-full transition-all hover:scale-110"
          style={{
            background: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
            border: `1px solid ${colors.frame}30`,
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}
        >
          <Eye className="w-4 h-4" style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
        </button>
      </div>

      <h3 className="font-['Outfit'] font-extrabold text-xl mb-1 truncate flex items-center gap-2" style={{ 
        color: isDark ? '#f1f5f9' : '#1e293b',
        textShadow: isHovered ? `0 0 20px ${colors.glow}` : 'none'
      }}>
        <IconComponent className="w-5 h-5 shrink-0" style={{ color: colors.frame }} />
        {reward.name}
      </h3>

      <p className="font-['DM_Sans'] font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-1" style={{ color: colors.frame }}>
        <Gem className="w-3 h-3" /> Leyenda
      </p>

      <div className="relative flex-1 mb-6 p-4 rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)', border: `1px solid ${colors.frame}20` }}>
        <IconComponent className="absolute -bottom-6 -right-4 w-32 h-32 opacity-[0.03] rotate-12 pointer-events-none transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[25deg]" style={{ color: colors.frame }} />
        <p className="font-['DM_Sans'] font-medium text-sm leading-relaxed relative z-10" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
          {skin?.description || reward.description}
        </p>
      </div>
      
      <div className="space-y-4 mt-auto">
          {!isBought && (
            <div className="flex items-center justify-between">
              <span className="font-['DM_Sans'] font-bold text-xs uppercase tracking-widest" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Precio</span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4" fill="#f59e0b" style={{ color: '#f59e0b' }} />
                <span className="font-['Outfit'] font-extrabold text-xl" style={{ color: '#f59e0b' }}>{reward.cost_coins}</span>
              </div>
            </div>
          )}
          
          {isEquipped ? (
            <button disabled className="w-full h-12 rounded-xl font-['DM_Sans'] font-bold uppercase tracking-widest text-[10px]"
              style={{ 
                background: `${colors.frame}20`,
                color: colors.frame,
                border: `1px solid ${colors.frame}40`
              }}>
              Equipada
            </button>
          ) : isBought ? (
            <button 
              onClick={() => onEquip(reward)}
              className="w-full h-12 rounded-xl font-['DM_Sans'] font-bold uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${colors.frame}, ${colors.secondary})`,
                color: 'white',
                boxShadow: `0 8px 25px ${colors.glow}`
              }}
            >
              Equipar Skin
            </button>
          ) : (
            <button 
              onClick={() => onBuy(reward)}
              disabled={!canAfford}
              className="w-full h-12 rounded-xl font-['DM_Sans'] font-bold uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02]"
              style={{
                background: canAfford 
                  ? `linear-gradient(135deg, ${colors.frame}, ${colors.secondary})`
                  : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                color: canAfford ? 'white' : isDark ? '#64748b' : '#94a3b8',
                boxShadow: canAfford ? `0 8px 25px ${colors.glow}` : 'none',
                border: canAfford ? 'none' : isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
              }}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> {canAfford ? 'COMPRAR' : 'SIN FONDOS'}
              </span>
            </button>
          )}
      </div>

      {isHovered && (
        <div className="absolute inset-0 rounded-[2rem] pointer-events-none" style={{
          background: `linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)`,
          animation: 'shine 1.5s ease-in-out infinite'
        }} />
      )}
      <style>{`
        @keyframes shine { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes electric-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  );
}

export function ShopCardSkeleton({ isDark }) {
  return (
    <div className="p-6 rounded-[2rem] animate-pulse" style={{ background: isDark ? '#1e293b' : '#f8fafc' }}>
      <div className="w-16 h-16 rounded-[1.5rem] mb-5" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
      <div className="h-6 w-3/4 rounded mb-2" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
      <div className="h-4 w-1/2 rounded mb-4" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
      <div className="h-20 w-full rounded-lg mb-4" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
      <div className="h-12 w-full rounded-xl" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
    </div>
  );
}