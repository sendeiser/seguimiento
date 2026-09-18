import { useState } from "react";
import { 
  Sparkles, Star, Zap, Snowflake, Trees, Eye, Shield, Flame, 
  CloudRain, Rainbow, Hexagon, Crown, Heart, Anchor, Sun, 
  Moon, Skull, Cpu, Gem, Coins, CheckCircle2, Check, Lock
} from "lucide-react";
import { getSkinByName, SkinPattern, RewardIcon, DragonIcon } from "../../lib/skinThemes";

export function ShopCard({ 
  reward, 
  purchase, 
  isBought: explicitIsBought, 
  isEquipped: explicitIsEquipped, 
  notyxCoins, 
  canAfford: explicitCanAfford, 
  onBuy, 
  onPurchase, 
  onEquip, 
  onPreview, 
  isDark = false,
  isLoading = false 
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Normalise purchase and equipped states
  const isBought = explicitIsBought !== undefined ? explicitIsBought : !!purchase;
  const isEquipped = explicitIsEquipped !== undefined ? explicitIsEquipped : purchase?.status === 'equipped';
  const canAfford = explicitCanAfford !== undefined 
    ? explicitCanAfford 
    : (notyxCoins !== undefined ? notyxCoins >= reward.cost_coins : true);

  const handleActionClick = onPurchase || onBuy;

  const skin = getSkinByName(reward.name);
  const colors = skin?.colors || { 
    primary: "hsl(262 83% 60%)", 
    secondary: "hsl(270 70% 55%)", 
    accent: "hsl(280 90% 70%)", 
    frame: "#9333ea", 
    glow: "rgba(147,51,234,0.6)" 
  };
  
  const bgColor = skin 
    ? (isDark ? skin.bg.dark : skin.bg.light) 
    : (isDark ? '#0f172a' : '#ffffff');
  
  const IconComponent = skin?.icon || Sparkles;
  const pattern = skin?.pattern;

  // Determine if card background is visually dark
  const isCardDark = isDark || (bgColor && typeof bgColor === 'string' && (
    bgColor.startsWith('#0') || 
    bgColor.startsWith('#1') || 
    bgColor.startsWith('#2')
  ));

  return (
    <div 
      className="group relative p-6 sm:p-7 rounded-[2.5rem] transition-all duration-300 hover:scale-[1.02] hover:-translate-y-2 flex flex-col h-full min-w-0 overflow-hidden shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: bgColor,
        backdropFilter: 'blur(24px)',
        border: isEquipped 
          ? `2.5px solid ${colors.frame}` 
          : isHovered 
            ? `2px solid ${colors.frame}` 
            : isCardDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: isEquipped 
          ? `0 20px 40px -10px ${colors.glow}, 0 0 35px -5px ${colors.glow}`
          : isHovered 
            ? `0 25px 45px -12px ${colors.glow}, 0 0 25px -5px ${colors.glow}`
            : isCardDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.04)',
      }}
    >
      {/* Background Animated Particle Theme Pattern */}
      <SkinPattern pattern={pattern} colors={colors} isHovered={isHovered} />

      {/* Top Ambient Highlight Gradient Bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 transition-opacity duration-300 rounded-t-[2.5rem]" 
        style={{
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent || colors.frame})`,
          opacity: isHovered || isEquipped ? 1 : 0.6
        }} 
      />

      {/* Top Badges & Actions Row */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        {/* Emblem Box */}
        <div 
          className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-md relative overflow-hidden" 
          style={{
            background: `linear-gradient(135deg, ${colors.frame}25, ${colors.frame}10)`,
            border: `2px solid ${colors.frame}60`,
            boxShadow: isHovered ? `0 8px 25px ${colors.glow}` : 'none'
          }}
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <RewardIcon reward={reward} name={reward.name} icon={reward.icon} className="w-8 h-8 transition-transform duration-300" style={{ color: colors.frame }} />
        </div>

        {/* Right side: Equipped indicator + Preview button */}
        <div className="flex items-center gap-2">
          {isEquipped && (
            <div 
              className="px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm text-white font-['Outfit'] font-black text-[10px] uppercase tracking-wider"
              style={{
                background: `linear-gradient(135deg, ${colors.frame}, ${colors.secondary})`,
                boxShadow: `0 4px 15px ${colors.glow}`
              }}
            >
              <Check className="w-3 h-3 stroke-[3]" />
              <span>Equipado</span>
            </div>
          )}

          {onPreview && (
            <button 
              type="button"
              onClick={() => onPreview(reward)}
              title="Ver vista previa de la tarjeta 3D"
              className="p-2.5 rounded-2xl transition-all duration-300 hover:scale-110 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm text-slate-500 hover:text-blue-600 hover:border-blue-300"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Theme Name & Rarity */}
      <div className="relative z-10 mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span 
            className="font-['Outfit'] font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-1 px-2.5 py-0.5 rounded-md"
            style={{ 
              color: colors.frame,
              background: `${colors.frame}15`,
              border: `1px solid ${colors.frame}30`
            }}
          >
            <Gem className="w-2.5 h-2.5" /> Tema Notyx
          </span>
        </div>

        <h3 
          className="font-['Outfit'] font-black text-xl tracking-tight leading-snug truncate" 
          style={{ 
            color: isCardDark ? '#f8fafc' : '#0f172a',
            textShadow: isHovered ? `0 0 25px ${colors.glow}` : 'none'
          }}
          title={reward.name}
        >
          {reward.name}
        </h3>
      </div>

      {/* Description container */}
      <div 
        className="relative flex-1 mb-6 p-4 rounded-2xl overflow-hidden border transition-colors duration-300" 
        style={{ 
          background: isCardDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.75)', 
          borderColor: `${colors.frame}25` 
        }}
      >
        <div 
          className="absolute -bottom-8 -right-6 opacity-[0.06] pointer-events-none transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12"
          style={{ color: colors.frame }}
        >
          <IconComponent className="w-36 h-36" />
        </div>
        <p 
          className="font-['DM_Sans'] font-medium text-xs leading-relaxed relative z-10 line-clamp-3" 
          style={{ color: isCardDark ? '#cbd5e1' : '#334155' }}
        >
          {skin?.description || reward.description}
        </p>
      </div>
      
      {/* Price & Action Area */}
      <div className="space-y-3 mt-auto relative z-10">
        {!isBought && (
          <div className="flex items-center justify-between px-1">
            <span className="font-['Outfit'] font-extrabold text-[10px] uppercase tracking-widest text-slate-400">
              Inversión
            </span>
            <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-['Outfit'] font-black text-sm text-amber-600 dark:text-amber-400">
                {reward.cost_coins} <span className="text-[10px] font-bold">Coins</span>
              </span>
            </div>
          </div>
        )}
        
        {isEquipped ? (
          <div 
            className="w-full h-14 rounded-2xl font-['Outfit'] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 border-2 transition-all shadow-inner"
            style={{ 
              background: `${colors.frame}15`,
              color: colors.frame,
              borderColor: `${colors.frame}40`
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Tema Equipado</span>
          </div>
        ) : isBought ? (
          <button 
            type="button"
            onClick={() => onEquip?.(reward)}
            disabled={isLoading}
            className="w-full h-14 rounded-2xl font-['Outfit'] font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-[0.98] text-white flex items-center justify-center gap-2 shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${colors.frame}, ${colors.secondary})`,
              boxShadow: `0 8px 25px ${colors.glow}`
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Equipar Tema</span>
          </button>
        ) : (
          <button 
            type="button"
            onClick={() => handleActionClick?.(reward)}
            disabled={!canAfford || isLoading}
            className={`w-full h-14 rounded-2xl font-['Outfit'] font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
              canAfford 
                ? 'text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer' 
                : 'cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
            }`}
            style={canAfford ? {
              background: `linear-gradient(135deg, ${colors.frame}, ${colors.secondary})`,
              boxShadow: `0 8px 25px ${colors.glow}`
            } : {}}
          >
            {canAfford ? (
              <>
                <Coins className="w-4 h-4" />
                <span>Desbloquear ({reward.cost_coins})</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Faltan {Math.max(0, reward.cost_coins - (notyxCoins || 0))} Coins</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Ambient Shine on Hover */}
      {isHovered && (
        <div 
          className="absolute inset-0 rounded-[2.5rem] pointer-events-none transition-opacity duration-500" 
          style={{
            background: `linear-gradient(135deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)`,
            animation: 'shine 1.8s ease-in-out infinite'
          }} 
        />
      )}

      <style>{`
        @keyframes shine { 
          0%, 100% { opacity: 0.2; transform: translateX(-10%); } 
          50% { opacity: 0.6; transform: translateX(10%); } 
        }
      `}</style>
    </div>
  );
}

export function ShopCardSkeleton({ isDark }) {
  return (
    <div className="p-6 sm:p-7 rounded-[2.5rem] animate-pulse border border-slate-100 dark:border-slate-800" style={{ background: isDark ? '#1e293b' : '#f8fafc' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="w-16 h-16 rounded-[1.5rem]" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
        <div className="w-10 h-10 rounded-2xl" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
      </div>
      <div className="h-6 w-3/4 rounded-xl mb-2" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
      <div className="h-4 w-1/3 rounded-lg mb-4" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
      <div className="h-20 w-full rounded-2xl mb-6" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
      <div className="h-14 w-full rounded-2xl" style={{ background: isDark ? '#334155' : '#e2e8f0' }} />
    </div>
  );
}