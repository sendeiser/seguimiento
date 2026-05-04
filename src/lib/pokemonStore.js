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
    
  if (error) throw error;
  return data;
}
