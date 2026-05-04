import React, { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { listPokemon, getPokemonDetails } from "../../lib/pokemonService";
import { getStudentPokemon, addPokemonToStore } from "../../lib/pokemonStore";
import PokemonCard from "./PokemonCard";
import { useAuth } from "../../providers/AuthProvider";

export default function PokemonStoreTab({ notyxCoins, onBuySuccess, onBuyRequest, ownedPokemonIds }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [pokemonList, setPokemonList] = useState([]);
  const [ownedIds, setOwnedIds] = useState(new Set(ownedPokemonIds || []));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ownedPokemonIds) {
      setOwnedIds(new Set(ownedPokemonIds));
    } else if (user) {
      fetchOwned();
    }
  }, [user, ownedPokemonIds]);

  useEffect(() => {
    fetchPokemon();
  }, [page]);

  const fetchOwned = async () => {
    if (!user) return;
    try {
      const owned = await getStudentPokemon(user.id);
      setOwnedIds(new Set(owned.map(o => o.pokemon_id)));
    } catch (e) {
      console.error("Error fetching owned pokemon", e);
    }
  };

  const fetchPokemon = async () => {
    setLoading(true);
    try {
      const data = await listPokemon(page, 12);
      const detailed = await Promise.all(
        data.results.map(p => getPokemonDetails(p.url))
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
    
    // If not authenticated (public view), delegate to parent
    if (!user && onBuyRequest) {
      onBuyRequest(pokemon);
      return;
    }
    
    try {
      await addPokemonToStore(user.id, pokemon);
      setOwnedIds(prev => new Set(prev).add(pokemon.id));
      alert(`¡Has capturado a ${pokemon.name}!`);
      if (onBuySuccess) onBuySuccess(pokemon.cost_coins);
    } catch (e) {
      console.error(e);
      alert("Hubo un error al guardar el Pokémon.");
    }
  };

  return (
    <div className="space-y-8 mt-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-['Outfit'] font-extrabold text-slate-900 dark:text-white">
          Centro Pokémon
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {pokemonList.map(p => (
              <PokemonCard 
                key={p.id} 
                pokemon={p} 
                owned={ownedIds.has(p.id)} 
                onBuy={() => handleBuy(p)} 
              />
            ))}
          </div>
          
          <div className="flex items-center justify-center gap-4 mt-8">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="font-bold text-slate-500">Página {page}</span>
            <button 
              onClick={() => setPage(p => p + 1)}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
}
