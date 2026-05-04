import { supabase } from "./supabase";

export async function getStudentPokemon(studentId) {
  const { data, error } = await supabase
    .from("student_pokemon_store")
    .select("*")
    .eq("student_id", studentId);
  if (error) throw error;
  return data;
}

export async function addPokemonToStore(studentId, pokemonDetails) {
  const { data, error } = await supabase
    .from("student_pokemon_store")
    .insert({ 
      student_id: studentId, 
      pokemon_id: pokemonDetails.id, 
      pokemon_name: pokemonDetails.name,
      sprite_url: pokemonDetails.sprite,
      cost_coins: pokemonDetails.cost_coins
    });
    
export async function addPokemonXP(instanceId, xpAmount) {
  const { data: current, error: fetchError } = await supabase
    .from("student_pokemon_store")
    .select("level, experience")
    .eq("id", instanceId)
    .single();

  if (fetchError) throw fetchError;

  let newXP = (current.experience || 0) + xpAmount;
  let newLevel = current.level || 1;
  
  // Logic: Level * 100 XP to reach next level
  // e.g. Level 1 needs 100 XP, Level 2 needs 200 XP, etc.
  while (newXP >= newLevel * 100) {
    newXP -= newLevel * 100;
    newLevel += 1;
  }

  const { data, error } = await supabase
    .from("student_pokemon_store")
    .update({ 
      level: newLevel, 
      experience: newXP 
    })
    .eq("id", instanceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addXPToAllStudentPokemon(studentId, xpAmount) {
  const pokemon = await getStudentPokemon(studentId);
  if (!pokemon || pokemon.length === 0) return;

  return Promise.all(pokemon.map(p => addPokemonXP(p.id, xpAmount)));
}
