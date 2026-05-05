import React, { useState, useEffect } from 'react';
import { Search, Loader2, Sparkles, BookOpen } from "lucide-react";
import { getStudentPokemon } from "../../lib/pokemonStore";
import { getPokemonDetails } from "../../lib/pokemonService";
import { useAuth } from "../../providers/AuthProvider";
import PokemonCard from "./PokemonCard";
import TradePokemonModal from "./TradePokemonModal";

export default function PokedexTab({ studentId, classStudentId }) {
  const { user } = useAuth();
  const [ownedPokemon, setOwnedPokemon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [totalPokemonCount, setTotalPokemonCount] = useState(0);
  const [selectedType, setSelectedType] = useState("all");
  const [tradingPokemon, setTradingPokemon] = useState(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  const pokemonTypes = [
    { id: 'all', label: 'Todos', icon: '✨' },
    { id: 'fire', label: 'Fuego', icon: '🔥' },
    { id: 'water', label: 'Agua', icon: '💧' },
    { id: 'grass', label: 'Planta', icon: '🍃' },
    { id: 'electric', label: 'Eléctrico', icon: '⚡' },
    { id: 'psychic', label: 'Psíquico', icon: '🔮' },
    { id: 'ice', label: 'Hielo', icon: '❄️' },
    { id: 'dragon', label: 'Dragón', icon: '🐲' },
    { id: 'fighting', label: 'Lucha', icon: '🥊' },
  ];

  useEffect(() => {
    fetchOwned();
    fetchTotalCount();
  }, [user, studentId, classStudentId]);

  const fetchTotalCount = async () => {
    try {
      const res = await fetch("https://pokeapi.co/api/v2/pokemon-species/");
      const data = await res.json();
      setTotalPokemonCount(data.count);
    } catch (e) {
      console.error("Error fetching total count", e);
    }
  };

  const fetchOwned = async () => {
    const targetId = studentId || user?.id;
    if (!targetId && !classStudentId) return;

    setLoading(true);
    try {
      const owned = await getStudentPokemon(targetId, classStudentId);
      const detailed = await Promise.all(
        owned.map(async p => {
          const apiDetails = await getPokemonDetails(p.pokemon_id);
          return {
            ...apiDetails,
            instanceId: p.id,
            level: p.level || 1,
            experience: p.experience || 0
          };
        })
      );
      setOwnedPokemon(detailed);
    } catch (e) {
      console.error("Error fetching Pokedex", e);
    }
    setLoading(false);
  };

  const filteredPokemon = ownedPokemon.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.original_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || p.types.includes(selectedType);
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Consultando tu PokéDex...</p>
      </div>
    );
  }

  const completionPercentage = totalPokemonCount > 0 ? (ownedPokemon.length / totalPokemonCount) * 100 : 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-8">
      {/* Header & Stats Card */}
      <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl shadow-slate-200/40 border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-6 max-w-md">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/20">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Mi PokéDex</h2>
                <p className="text-slate-500 font-medium">Progreso de tu colección personal</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Completado</span>
                <span className="text-sm font-black text-indigo-600">{ownedPokemon.length} <span className="text-slate-300 mx-1">/</span> {totalPokemonCount || '...'}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full lg:w-[450px]">
            <div className="relative group w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar en mi colección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-16 pl-16 pr-8 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-900 shadow-inner"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {pokemonTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                    selectedType === type.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <span>{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filteredPokemon.length === 0 ? (
        <div className="bg-white rounded-[3rem] py-24 text-center border-2 border-dashed border-slate-100">
          <div className="relative inline-block mb-6">
             <div className="absolute inset-0 bg-indigo-500/10 blur-2xl animate-pulse rounded-full" />
             <Sparkles className="relative w-16 h-16 text-indigo-400 mx-auto" />
          </div>
          <h3 className="text-2xl font-black text-slate-300">Colección Vacía</h3>
          <p className="text-slate-400 mt-2 max-w-xs mx-auto">
            {searchTerm || selectedType !== 'all' 
              ? "No hay resultados para estos filtros." 
              : "Captura nuevos Pokémon en la tienda para verlos aquí."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPokemon.map(p => (
            <PokemonCard 
              key={p.id} 
              pokemon={p} 
              owned={true} 
              onBuy={() => {}} 
              onTrade={(poke) => {
                setTradingPokemon(poke);
                setIsTradeModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <TradePokemonModal 
        isOpen={isTradeModalOpen} 
        onClose={() => setIsTradeModalOpen(false)}
        offeredPokemon={tradingPokemon}
        currentStudentId={studentId || user?.id}
        currentClassStudentId={classStudentId}
      />
    </div>
  );
}
