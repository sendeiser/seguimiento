import React, { useState } from 'react';
import { Coins, CheckCircle2, ShoppingBag, Eye, Zap, ArrowRightLeft } from "lucide-react";
import { useTheme } from "../../providers/ThemeProvider";
import PokemonDetailsModal from "./PokemonDetailsModal";

export default function PokemonCard({ pokemon, owned, onBuy, onTrade }) {
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

  const typeBgColors = {
    normal: 'hsla(0,0%,70%,0.06)', fire: 'hsla(0,80%,55%,0.06)',
    water: 'hsla(210,80%,55%,0.06)', electric: 'hsla(45,100%,55%,0.06)',
    grass: 'hsla(120,60%,50%,0.06)', ice: 'hsla(180,60%,60%,0.06)',
    fighting: 'hsla(0,60%,45%,0.06)', poison: 'hsla(280,60%,50%,0.06)',
    ground: 'hsla(35,60%,45%,0.06)', flying: 'hsla(240,60%,65%,0.06)',
    psychic: 'hsla(330,90%,55%,0.06)', bug: 'hsla(80,60%,45%,0.06)',
    rock: 'hsla(40,40%,45%,0.06)', ghost: 'hsla(260,50%,50%,0.06)',
    dragon: 'hsla(240,70%,55%,0.06)', dark: 'hsla(0,0%,20%,0.06)',
    steel: 'hsla(0,0%,65%,0.06)', fairy: 'hsla(330,80%,65%,0.06)',
  };

  const primaryType = pokemon.types[0];

  return (
    <>
      <div 
        onClick={() => setShowDetails(true)}
        className="group relative rounded-[2.5rem] p-5 transition-all duration-500 cursor-pointer hover:-translate-y-2 border-2 overflow-hidden"
        style={{ background: typeBgColors[primaryType] || 'hsla(0,0%,70%,0.06)', borderColor: 'hsla(220,15%,80%,0.08)' }}
      >
        {/* Background Decorative Type Circle */}
        <div className={`absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-15 transition-transform duration-700 group-hover:scale-150 ${typeColors[pokemon.types[0]] || 'bg-slate-400'}`} />

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

            {owned && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                  <span>Experiencia</span>
                  <span>{pokemon.experience || 0} / {(pokemon.level || 1) * 100}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-700 shadow-[0_0_8px_rgba(79,70,229,0.4)]"
                    style={{ width: `${((pokemon.experience || 0) / ((pokemon.level || 1) * 100)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              {owned ? (
                <div className="flex gap-2">
                  <div className="flex-1 h-14 bg-emerald-50 rounded-2xl flex flex-col items-center justify-center border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center">Capturado</span>
                    </div>
                  </div>
                  {onTrade && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onTrade(pokemon); }}
                      className="w-14 h-14 bg-white hover:bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border-2 border-indigo-100 transition-all shadow-sm active:scale-95 group/trade"
                      title="Intercambiar"
                    >
                      <ArrowRightLeft className="w-5 h-5 group-hover/trade:rotate-180 transition-transform duration-500" />
                    </button>
                  )}
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
        
        {owned && (
          <div className="absolute top-6 left-6 z-20 scale-90 origin-top-left">
            <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 flex items-center gap-2">
              <Zap className="w-3 h-3 fill-white" />
              Niv. {pokemon.level || 1}
            </div>
          </div>
        )}
      </div>

      <PokemonDetailsModal 
        pokemon={pokemon} 
        isOpen={showDetails} 
        onClose={() => setShowDetails(false)} 
      />
    </>
  );
}
