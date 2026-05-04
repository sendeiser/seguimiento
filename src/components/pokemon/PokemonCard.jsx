import React, { useState } from 'react';
import { Coins, CheckCircle2, ShoppingBag, Eye } from "lucide-react";
import { useTheme } from "../../providers/ThemeProvider";
import PokemonDetailsModal from "./PokemonDetailsModal";

export default function PokemonCard({ pokemon, owned, onBuy }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showDetails, setShowDetails] = useState(false);

  const typeColors = {
    normal: "bg-slate-400",
    fire: "bg-orange-500",
    water: "bg-blue-500",
    electric: "bg-yellow-400 text-yellow-900",
    grass: "bg-emerald-500",
    ice: "bg-cyan-300 text-cyan-900",
    fighting: "bg-red-700",
    poison: "bg-purple-500",
    ground: "bg-amber-600",
    flying: "bg-indigo-400",
    psychic: "bg-pink-500",
    bug: "bg-lime-500",
    rock: "bg-stone-600",
    ghost: "bg-violet-800",
    dragon: "bg-indigo-700",
    dark: "bg-slate-800",
    steel: "bg-gray-500",
    fairy: "bg-rose-400",
  };

  return (
    <>
      <div 
        onClick={() => setShowDetails(true)}
        className="group relative rounded-[2.5rem] p-5 transition-all duration-500 cursor-pointer hover:-translate-y-2 bg-white border-slate-100 shadow-xl shadow-slate-200/50 border-2 overflow-hidden"
      >
        {/* Background Decorative Type Circle */}
        <div className={`absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-10 transition-transform duration-700 group-hover:scale-150 ${typeColors[pokemon.types[0]] || 'bg-slate-400'}`} />

        <div className="relative z-10">
          <div className="relative aspect-square rounded-3xl overflow-hidden mb-6 bg-slate-50 flex items-center justify-center p-4">
            <img 
              src={pokemon.sprite} 
              alt={pokemon.name} 
              className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110" 
            />
            
            <button 
              onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
              className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
            >
              <Eye className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{String(pokemon.id).padStart(3, '0')}</span>
              <div className="flex gap-1">
                {pokemon.types.map(t => (
                  <span key={t} className={`w-2 h-2 rounded-full ${typeColors[t] || 'bg-slate-400'}`} title={t} />
                ))}
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-800 capitalize tracking-tight leading-none truncate">
              {pokemon.name}
            </h3>

            <div className="pt-4">
              {owned ? (
                <div className="w-full h-14 bg-emerald-50 rounded-2xl flex items-center justify-center gap-2 border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">En Pokedex</span>
                </div>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); onBuy(pokemon); }}
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 group/btn"
                >
                  <Coins className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                  <span className="font-black text-sm uppercase tracking-widest">{pokemon.cost_coins}</span>
                  <ShoppingBag className="w-4 h-4 opacity-40" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <PokemonDetailsModal 
        pokemon={pokemon} 
        isOpen={showDetails} 
        onClose={() => setShowDetails(false)} 
      />
    </>
  );
}
