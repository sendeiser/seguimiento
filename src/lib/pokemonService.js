export const POKEAPI_BASE = "https://pokeapi.co/api/v2";

export async function listPokemon(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const res = await fetch(`${POKEAPI_BASE}/pokemon?limit=${pageSize}&offset=${offset}`);
  if (!res.ok) throw new Error("Failed to fetch Pokémon list");
  return await res.json();
}

export async function getPokemonDetails(urlOrName) {
  const url = urlOrName.startsWith("http") ? urlOrName : `${POKEAPI_BASE}/pokemon/${urlOrName}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch Pokémon details");
  const data = await res.json();
  
  // Calculate dynamic cost based on base experience (minimum 100, max ~500)
  const baseCost = Math.floor((data.base_experience || 60) * 1.8);
  const cost = Math.max(100, Math.min(1000, baseCost));

  return {
    id: data.id,
    name: data.name,
    sprite: data.sprites?.other?.["official-artwork"]?.front_default || data.sprites?.front_default,
    types: data.types?.map(t => t.type.name) || [],
    cost_coins: cost,
    baseExperience: data.base_experience
  };
}
