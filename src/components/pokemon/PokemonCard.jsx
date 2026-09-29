import React, { useState, useEffect } from 'react';
import { Coins, CheckCircle2, ShoppingBag, Eye, Zap, ArrowRightLeft, Pencil, Check, X, Loader2 } from "lucide-react";
import { useTheme } from "../../providers/ThemeProvider";
import PokemonDetailsModal from "./PokemonDetailsModal";

export default function PokemonCard({ 
  pokemon, 
  owned, 
  onBuy, 
  onTrade, 
  isTeacher = false, 
  onUpdatePrice, 
  isDark: explicitIsDark 
}) {
  const { theme } = useTheme();
  const isDark = explicitIsDark !== undefined ? explicitIsDark : theme === 'dark';
  const [showDetails, setShowDetails] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState(pokemon.cost_coins);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPriceDraft(pokemon.cost_coins);
  }, [pokemon.cost_coins]);

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
        className={`group relative rounded-[2.5rem] p-5 transition-all duration-500 cursor-pointer hover:-translate-y-2 border-2 overflow-hidden flex flex-col h-full min-w-0 ${
          isDark 
            ? 'border-slate-800/80 shadow-2xl shadow-black/40' 
            : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'
        }`}
        style={{
          background: isDark 
            ? 'linear-gradient(145deg, hsl(220 20% 14% / 0.88), hsl(220 25% 8% / 0.72))'
            : '#ffffff',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Background Decorative Type Circle */}
        <div className={`absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-10 transition-transform duration-700 group-hover:scale-150 ${typeColors[pokemon.types[0]] || 'bg-slate-400'}`} />

        <div className="relative z-10 flex flex-col h-full">
          <div className={`relative aspect-square rounded-3xl overflow-hidden mb-5 flex items-center justify-center p-4 transition-colors ${
            isDark ? 'bg-slate-800/50' : 'bg-slate-50'
          }`}>
            <img 
              src={pokemon.sprite} 
              alt={pokemon.name} 
              className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110" 
            />
            
            <button 
              onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
              className={`absolute top-3 right-3 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all ${
                isDark ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700' : 'bg-white/80 text-slate-600 hover:bg-white'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{String(pokemon.id).padStart(3, '0')}</span>
              <div className="flex gap-1">
                {pokemon.types.map(t => (
                  <span key={t} className={`w-2 h-2 rounded-full ${typeColors[t] || 'bg-slate-400'}`} title={t} />
                ))}
              </div>
            </div>

            <h3 className={`text-xl font-black capitalize tracking-tight leading-none truncate ${
              isDark ? 'text-white' : 'text-slate-800'
            }`}>
              {pokemon.name}
            </h3>

            {owned && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                  <span>Experiencia</span>
                  <span>{pokemon.experience || 0} / {(pokemon.level || 1) * 100}</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden shadow-inner ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-700 shadow-[0_0_8px_rgba(79,70,229,0.4)]"
                    style={{ width: `${((pokemon.experience || 0) / ((pokemon.level || 1) * 100)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 mt-auto">
              {isTeacher ? (
                <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-1">
                    <span className="font-['Outfit'] font-black text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      Precio Docente
                      {pokemon.isCustomPrice && (
                        <span className="text-amber-500 text-[9px] font-bold">(Editado)</span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-['Outfit'] font-black text-xs text-amber-500">
                        {pokemon.cost_coins}
                      </span>
                    </div>
                  </div>

                  {isEditingPrice ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={priceDraft}
                          onChange={(e) => setPriceDraft(e.target.value)}
                          className={`w-full h-10 px-2 text-center font-['Outfit'] font-black text-sm rounded-xl border-2 border-amber-400 outline-none ${
                            isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                          }`}
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={async () => {
                            if (onUpdatePrice) {
                              setIsSaving(true);
                              await onUpdatePrice(pokemon.id, priceDraft);
                              setIsSaving(false);
                              setIsEditingPrice(false);
                            }
                          }}
                          className="h-10 px-3 rounded-xl font-['Outfit'] font-black text-xs uppercase bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-1 shadow-md shrink-0 cursor-pointer"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Guardar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPriceDraft(pokemon.cost_coins);
                            setIsEditingPrice(false);
                          }}
                          className={`h-10 px-2.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                            isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        {[-100, -50, +50, +100].map(delta => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() => setPriceDraft(prev => Math.max(0, (parseInt(prev, 10) || 0) + delta))}
                            className={`px-1.5 py-0.5 text-[9px] font-black rounded-md border transition-colors cursor-pointer ${
                              isDark 
                                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-amber-500/20 hover:text-amber-400' 
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-amber-100 hover:text-amber-800'
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingPrice(true)}
                      className="w-full h-11 rounded-2xl font-['Outfit'] font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-[0.98] text-white flex items-center justify-center gap-2 shadow-lg cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Modificar Precio</span>
                    </button>
                  )}
                </div>
              ) : owned ? (
                <div className="flex gap-2">
                  <div className={`flex-1 h-14 rounded-2xl flex flex-col items-center justify-center border ${
                    isDark ? 'bg-emerald-950/40 border-emerald-800/40' : 'bg-emerald-50 border-emerald-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">Capturado</span>
                    </div>
                  </div>
                  {onTrade && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onTrade(pokemon); }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all shadow-sm active:scale-95 group/trade ${
                        isDark ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400 border-slate-700' : 'bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}
                      title="Intercambiar"
                    >
                      <ArrowRightLeft className="w-5 h-5 group-hover/trade:rotate-180 transition-transform duration-500" />
                    </button>
                  )}
                </div>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); onBuy(pokemon); }}
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 group/btn cursor-pointer"
                >
                  <Coins className="w-5 h-5 group-hover/btn:rotate-12 transition-transform text-amber-300" />
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
