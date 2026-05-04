import React, { useState, useEffect } from 'react';
import { X, Shield, Zap, Heart, Sword, FastForward, Activity, Volume2, Sparkles, MapPin, ChevronRight, Gamepad2 } from "lucide-react";
import { getEvolutionChain } from "../../lib/pokemonService";

const statIcons = {
  hp: <Heart className="w-4 h-4" />,
  attack: <Sword className="w-4 h-4" />,
  defense: <Shield className="w-4 h-4" />,
  "special-attack": <Zap className="w-4 h-4" />,
  "special-defense": <Activity className="w-4 h-4" />,
  speed: <FastForward className="w-4 h-4" />,
};

const translations = {
  stats: {
    hp: "PS",
    attack: "Ataque",
    defense: "Defensa",
    "special-attack": "Atq. Especial",
    "special-defense": "Def. Especial",
    speed: "Velocidad"
  },
  types: {
    normal: "Normal", fire: "Fuego", water: "Agua", electric: "Eléctrico", grass: "Planta",
    ice: "Hielo", fighting: "Lucha", poison: "Veneno", ground: "Tierra", flying: "Volador",
    psychic: "Psíquico", bug: "Bicho", rock: "Roca", ghost: "Fantasma", dragon: "Dragón",
    dark: "Siniestro", steel: "Acero", fairy: "Hada"
  },
  habitats: {
    cave: "Cueva", forest: "Bosque", grassland: "Pradera", mountain: "Montaña",
    rare: "Raro", "rough-terrain": "Terreno Áspero", sea: "Mar", urban: "Urbano",
    waters_edge: "Orilla del Agua", desconocido: "Desconocido"
  }
};

const typeColors = {
  normal: "bg-slate-400", fire: "bg-orange-500", water: "bg-blue-500", electric: "bg-yellow-400 text-yellow-900",
  grass: "bg-emerald-500", ice: "bg-cyan-300 text-cyan-900", fighting: "bg-red-700", poison: "bg-purple-500",
  ground: "bg-amber-600", flying: "bg-indigo-400", psychic: "bg-pink-500", bug: "bg-lime-500",
  rock: "bg-stone-600", ghost: "bg-violet-800", dragon: "bg-indigo-700", dark: "bg-slate-800",
  steel: "bg-gray-500", fairy: "bg-rose-400",
};

export default function PokemonDetailsModal({ pokemon, isOpen, onClose }) {
  const [isShiny, setIsShiny] = useState(false);
  const [evolutionChain, setEvolutionChain] = useState([]);
  const [isPlayingCry, setIsPlayingCry] = useState(false);
  const [audioMode, setAudioMode] = useState('latest'); // 'latest' or 'legacy'

  useEffect(() => {
    if (isOpen) {
      setIsShiny(false);
      setAudioMode('latest');
      if (pokemon.evolutionChainUrl) {
        getEvolutionChain(pokemon.evolutionChainUrl).then(setEvolutionChain);
      }
      
      // Auto-play cry after a short delay (Pokédex style)
      const timer = setTimeout(() => {
        playCry();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, pokemon?.id]);

  if (!pokemon || !isOpen) return null;

  const playCry = (overrideMode = null) => {
    const mode = overrideMode || audioMode;
    const cryUrl = mode === 'latest' ? pokemon.cry : pokemon.legacyCry;
    
    if (cryUrl) {
      const audio = new Audio(cryUrl);
      audio.volume = 0.5;
      audio.onplay = () => setIsPlayingCry(true);
      audio.onended = () => setIsPlayingCry(false);
      audio.onerror = () => setIsPlayingCry(false);
      
      // Play and handle browser autoplay restrictions
      audio.play().catch(err => {
        console.log("Autoplay prevented or audio error", err);
        setIsPlayingCry(false);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
      />
      
      <div className="relative w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header / Banner */}
        <div className={`h-48 relative ${typeColors[pokemon.types[0]] || 'bg-slate-400'} opacity-90 transition-all duration-700`}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
          
          <div className="absolute top-6 left-8 right-6 flex justify-between items-center z-20">
             <div className="flex gap-2">
                <button 
                  onClick={() => playCry()}
                  className={`p-3 rounded-2xl backdrop-blur-md transition-all ${isPlayingCry ? 'bg-white text-indigo-600 scale-110 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  title={audioMode === 'latest' ? "Reproducir Grito Moderno" : "Reproducir Grito Retro"}
                >
                  <Volume2 className={`w-5 h-5 ${isPlayingCry ? 'animate-pulse' : ''}`} />
                </button>
                <button 
                  onClick={() => {
                    const newMode = audioMode === 'latest' ? 'legacy' : 'latest';
                    setAudioMode(newMode);
                    playCry(newMode);
                  }}
                  className={`p-3 rounded-2xl backdrop-blur-md transition-all ${audioMode === 'legacy' ? 'bg-amber-400 text-amber-900 scale-110 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  title="Cambiar a Sonido Retro (8-bit)"
                >
                  <Gamepad2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsShiny(!isShiny)}
                  className={`p-3 rounded-2xl backdrop-blur-md transition-all ${isShiny ? 'bg-yellow-400 text-yellow-900 scale-110 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  title="Ver Shiny"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
             </div>
             <button 
               onClick={onClose}
               className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl text-white transition-all"
             >
               <X className="w-6 h-6" />
             </button>
          </div>
          
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-56 h-56 z-10 transition-all duration-700">
            <img 
              src={isShiny ? pokemon.shinySprite : pokemon.sprite} 
              alt={pokemon.name} 
              className="w-full h-full object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.25)] hover:scale-110 transition-transform duration-500"
            />
          </div>
        </div>

        <div className="pt-24 p-8 md:p-12 space-y-10">
          {/* Header Info */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
               <span className="text-slate-400 font-black text-xs tracking-widest uppercase">
                  #{String(pokemon.id).padStart(3, '0')}
               </span>
               <div className="h-1 w-1 rounded-full bg-slate-300" />
               <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <MapPin className="w-3 h-3 text-indigo-500" />
                  {translations.habitats[pokemon.habitat] || pokemon.habitat}
               </span>
            </div>
            <h2 className="text-5xl font-black text-slate-800 capitalize tracking-tight mb-6">
              {pokemon.name} {isShiny && <span className="text-yellow-500 text-2xl">✨</span>}
            </h2>

            {pokemon.level && (
              <div className="flex flex-col items-center gap-3 mb-8 bg-indigo-50/30 p-6 rounded-[2.5rem] border border-indigo-100/50 max-w-sm mx-auto">
                <div className="bg-indigo-600 text-white px-8 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20">
                  Nivel {pokemon.level}
                </div>
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] px-1">
                    <span>Progreso XP</span>
                    <span>{pokemon.experience} / {pokemon.level * 100}</span>
                  </div>
                  <div className="h-2.5 bg-white rounded-full overflow-hidden shadow-inner border border-indigo-100/50 p-0.5">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                      style={{ width: `${(pokemon.experience / (pokemon.level * 100)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <p className="text-slate-500 max-w-lg mx-auto font-medium leading-relaxed italic">
               "{pokemon.description}"
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Stats */}
            <div className="space-y-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" /> Estadísticas
              </h3>
              <div className="space-y-4">
                {pokemon.stats.map(stat => (
                  <div key={stat.name} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-2">
                        {statIcons[stat.name] || <Activity className="w-3 h-3" />}
                        {translations.stats[stat.name] || stat.name}
                      </span>
                      <span className="text-slate-700">{stat.value}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out ${typeColors[pokemon.types[0]] || 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info and Evolutions */}
            <div className="space-y-10">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                     <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Peso</span>
                     <span className="text-2xl font-black text-slate-800">{(pokemon.weight / 10).toFixed(1)} <small className="text-slate-400 text-xs">kg</small></span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                     <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Altura</span>
                     <span className="text-2xl font-black text-slate-800">{(pokemon.height / 10).toFixed(1)} <small className="text-slate-400 text-xs">m</small></span>
                  </div>
               </div>

               {/* Evolution Chain */}
               {evolutionChain.length > 1 && (
                 <div className="space-y-4">
                   <h3 className="text-lg font-black text-slate-800">Línea Evolutiva</h3>
                   <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
                     {evolutionChain.map((evo, idx) => (
                       <React.Fragment key={evo.id}>
                         <div className="flex flex-col items-center gap-1">
                           <div className={`w-16 h-16 rounded-2xl p-2 transition-all ${evo.id == pokemon.id ? 'bg-white shadow-md border-2 border-indigo-200' : 'opacity-40 hover:opacity-100'}`}>
                              <img src={evo.sprite} alt={evo.name} className="w-full h-full object-contain" />
                           </div>
                           <span className={`text-[8px] font-black uppercase tracking-tighter ${evo.id == pokemon.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                              {evo.name}
                           </span>
                         </div>
                         {idx < evolutionChain.length - 1 && (
                           <ChevronRight className="w-4 h-4 text-slate-300" />
                         )}
                       </React.Fragment>
                     ))}
                   </div>
                 </div>
               )}

               <div className="space-y-4">
                 <h3 className="text-lg font-black text-slate-800">Habilidades</h3>
                 <div className="flex flex-wrap gap-2">
                   {pokemon.abilities.map(ability => (
                     <span key={ability} className="bg-white text-slate-600 border border-slate-200 px-5 py-2.5 rounded-2xl text-xs font-bold capitalize shadow-sm hover:border-indigo-200 transition-colors">
                       {ability.replace('-', ' ')}
                     </span>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
