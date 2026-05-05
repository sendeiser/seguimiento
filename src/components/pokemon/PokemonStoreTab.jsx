import React, { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { listPokemon, getPokemonDetails } from "../../lib/pokemonService";
import { getStudentPokemon, addPokemonToStore } from "../../lib/pokemonStore";
import PokemonCard from "./PokemonCard";
import { useAuth } from "../../providers/AuthProvider";

 export default function PokemonStoreTab({ notyxCoins, onBuySuccess, onBuyRequest, ownedPokemonIds, classStudentId }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [pokemonList, setPokemonList] = useState([]);
  const [ownedIds, setOwnedIds] = useState(new Set(ownedPokemonIds || []));
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const pokemonTypes = [
    { id: 'all', label: 'Todos', icon: '✨', color: 'bg-slate-100' },
    { id: 'fire', label: 'Fuego', icon: '🔥', color: 'bg-orange-500' },
    { id: 'water', label: 'Agua', icon: '💧', color: 'bg-blue-500' },
    { id: 'grass', label: 'Planta', icon: '🍃', color: 'bg-emerald-500' },
    { id: 'electric', label: 'Eléctrico', icon: '⚡', color: 'bg-yellow-400' },
    { id: 'psychic', label: 'Psíquico', icon: '🔮', color: 'bg-pink-500' },
    { id: 'ice', label: 'Hielo', icon: '❄️', color: 'bg-cyan-300' },
    { id: 'dragon', label: 'Dragón', icon: '🐲', color: 'bg-indigo-700' },
    { id: 'fighting', label: 'Lucha', icon: '🥊', color: 'bg-red-700' },
  ];

  useEffect(() => {
    if (ownedPokemonIds) {
      setOwnedIds(new Set(ownedPokemonIds));
    } else if (user || classStudentId) {
      fetchOwned();
    }
  }, [user, ownedPokemonIds, classStudentId]);

  useEffect(() => {
    fetchPokemon();
  }, [page, selectedType]);

  const fetchOwned = async () => {
    if (!user && !classStudentId) return;
    try {
      const owned = await getStudentPokemon(user?.id, classStudentId);
      setOwnedIds(new Set(owned.map(o => o.pokemon_id)));
    } catch (e) {
      console.error("Error fetching owned pokemon", e);
    }
  };

  const fetchPokemon = async () => {
    setLoading(true);
    try {
      let results = [];
      if (selectedType === "all") {
        const data = await listPokemon(page, 12);
        results = data.results;
      } else {
        const res = await fetch(`https://pokeapi.co/api/v2/type/${selectedType}`);
        const data = await res.json();
        // Paginate type results manually
        const start = (page - 1) * 12;
        results = data.pokemon.slice(start, start + 12).map(p => p.pokemon);
      }

      const detailed = await Promise.all(
        results.map(p => getPokemonDetails(p.url))
      );
      setPokemonList(detailed);
    } catch (e) {
      console.error("Error fetching pokemon list", e);
    }
    setLoading(false);
  };

  const handleBuy = async (pokemon) => {
    if (notyxCoins < pokemon.cost_coins) {
      alert("No tienes suficientes Notyx Coins.");
      return;
    }
    
    // In PublicStudentView, we handle buy through a modal/DNI verification
    if (!user && onBuyRequest) {
      onBuyRequest(pokemon);
      return;
    }
    
    try {
      // For logged-in students in GlobalMarketplace
      await addPokemonToStore(user?.id, pokemon, classStudentId);
      setOwnedIds(prev => new Set(prev).add(pokemon.id));
      alert(`¡Has capturado a ${pokemon.name}!`);
      if (onBuySuccess) onBuySuccess(pokemon.cost_coins);
    } catch (e) {
      console.error(e);
      alert("Hubo un error al guardar el Pokémon.");
    }
  };

  const filteredPokemon = pokemonList.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.original_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 mt-12 animate-in fade-in duration-700">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            Centro Pokémon
          </h2>
        </div>

        {/* Search and Filters */}
        <div className="space-y-6">
           <div className="relative group max-w-2xl mx-auto w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar por nombre (ej: Pikachu, Charizard...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-16 pl-16 pr-8 rounded-[2rem] bg-white border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900 shadow-xl shadow-slate-200/20"
              />
           </div>

           <div className="flex flex-wrap gap-2 justify-center">
              {pokemonTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => { setSelectedType(type.id); setPage(1); }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
                    selectedType === type.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' 
                      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm'
                  }`}
                >
                  <span>{type.icon}</span>
                  {type.label}
                </button>
              ))}
           </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Consultando la PokéDex...</p>
        </div>
      ) : (
        <>
          {filteredPokemon.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
               <p className="text-slate-400 font-bold">No se encontraron Pokémon que coincidan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredPokemon.map(p => (
                <PokemonCard 
                  key={p.id} 
                  pokemon={p} 
                  owned={ownedIds.has(p.id)} 
                  onBuy={() => handleBuy(p)} 
                />
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-center gap-6 mt-12">
            <button 
              onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
              disabled={page === 1}
              className="px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black uppercase tracking-widest text-xs disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
            >
              Anterior
            </button>
            <div className="flex flex-col items-center">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Página</span>
               <span className="text-xl font-black text-indigo-600">{page}</span>
            </div>
            <button 
              onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
              className="px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all shadow-sm"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
}
