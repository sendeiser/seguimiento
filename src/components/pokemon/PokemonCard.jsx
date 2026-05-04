import React from "react";
import { Coins, CheckCircle2, ShoppingBag } from "lucide-react";
import { useTheme } from "../../providers/ThemeProvider";

export default function PokemonCard({ pokemon, owned, onBuy }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`relative rounded-3xl p-6 flex flex-col items-center justify-between gap-4 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${owned ? 'opacity-80' : 'hover:shadow-2xl'}`}
         style={{ 
           background: isDark ? 'hsl(220 20% 15% / 0.8)' : 'hsl(0 0% 100% / 0.8)',
           backdropFilter: 'blur(20px)',
           border: isDark ? '1px solid hsl(0 0% 100% / 0.1)' : '1px solid hsl(0 0% 100% / 0.15)',
           boxShadow: isDark ? 'none' : '0 10px 40px -10px rgba(0,0,0,0.05)'
         }}>
      
      {owned && (
        <div className="absolute top-4 right-4 text-emerald-500 flex flex-col items-center">
           <CheckCircle2 className="w-6 h-6 mb-1" />
        </div>
      )}

      {/* Sprite */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-xl" />
        <img 
          src={pokemon.sprite} 
          alt={pokemon.name} 
          className="w-full h-full object-contain relative z-10 filter drop-shadow-lg"
          loading="lazy"
        />
      </div>

      <div className="text-center w-full">
        <h3 className="text-xl font-black capitalize tracking-tight" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>
          {pokemon.name}
        </h3>
        
        <div className="flex gap-1 justify-center mt-2 flex-wrap">
          {pokemon.types.map(t => (
            <span key={t} className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full" 
                  style={{ background: isDark ? 'hsl(0 0% 100% / 0.1)' : 'hsl(220 20% 90%)', color: isDark ? 'hsl(220 20% 80%)' : 'hsl(220 10% 40%)' }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Button / Cost */}
      <div className="w-full mt-2">
        <button 
          onClick={onBuy}
          disabled={owned}
          className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${
            owned 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30'
          }`}
          style={owned && isDark ? { background: 'hsl(220 20% 20%)', color: 'hsl(220 10% 50%)', borderColor: 'hsl(220 20% 25%)' } : {}}
        >
          {owned ? (
            <>Adquirido</>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" /> 
              {pokemon.cost_coins} <Coins className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
