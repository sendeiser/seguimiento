export const POKEAPI_BASE = "https://pokeapi.co/api/v2";

export async function listPokemon(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const res = await fetch(`${POKEAPI_BASE}/pokemon?limit=${pageSize}&offset=${offset}`);
  if (!res.ok) throw new Error("Failed to fetch Pokémon list");
  return await res.json();
}

export async function getPokemonDetails(urlOrName) {
  const identifier = String(urlOrName);
  const url = identifier.startsWith("http") ? identifier : `${POKEAPI_BASE}/pokemon/${identifier}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch Pokémon details");
  const data = await res.json();
  
  // Fetch Species Data for Name, Description, Habitat and Evolution Chain
  const speciesRes = await fetch(data.species.url);
  const speciesData = await speciesRes.json();
  
  // Spanish Name
  const spanishNameEntry = speciesData.names.find(n => n.language.name === 'es');
  const spanishName = spanishNameEntry ? spanishNameEntry.name : data.name;

  // Spanish Description (Flavor Text)
  const descriptionEntry = speciesData.flavor_text_entries.find(n => n.language.name === 'es');
  const description = descriptionEntry 
    ? descriptionEntry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ') 
    : "Sin descripción disponible.";

  // Habitat
  const habitat = speciesData.habitat?.name || "desconocido";

  // Shiny Sprite
  const shinySprite = data.sprites?.other?.["official-artwork"]?.front_shiny || data.sprites?.front_shiny;

  // Audio Cry (Modern/Original)
  const cry = data.cries?.latest || data.cries?.legacy;

  // Calculate dynamic cost based on base experience
  const baseCost = Math.floor((data.base_experience || 60) * 1.8);
  const cost = Math.max(100, Math.min(1000, baseCost));

  return {
    id: data.id,
    name: spanishName,
    original_name: data.name,
    description,
    habitat,
    cry,
    sprite: data.sprites?.other?.["official-artwork"]?.front_default || data.sprites?.front_default,
    shinySprite,
    types: data.types?.map(t => t.type.name) || [],
    cost_coins: cost,
    baseExperience: data.base_experience,
    stats: data.stats?.map(s => ({ name: s.stat.name, value: s.base_stat })) || [],
    abilities: data.abilities?.map(a => a.ability.name) || [],
    height: data.height,
    weight: data.weight,
    evolutionChainUrl: speciesData.evolution_chain.url
  };
}

export async function getEvolutionChain(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch evolution chain");
  const data = await res.json();
  
  const chain = [];
  let current = data.chain;
  
  while (current) {
    const id = current.species.url.split('/').filter(Boolean).pop();
    chain.push({
      name: current.species.name,
      id: id,
      sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
    });
    current = current.evolves_to[0];
  }
  
  return chain;
}
