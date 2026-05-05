import { supabase } from "./supabase";

export async function getStudentPokemon(studentId, classStudentId = null) {
  let query = supabase.from("student_pokemon_store").select("*");
  
  if (studentId && classStudentId) {
    query = query.or(`student_id.eq.${studentId},class_student_id.eq.${classStudentId}`);
  } else if (studentId) {
    query = query.eq("student_id", studentId);
  } else if (classStudentId) {
    query = query.eq("class_student_id", classStudentId);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addPokemonToStore(studentId, pokemonDetails, classStudentId = null) {
  const { data, error } = await supabase
    .from("student_pokemon_store")
    .insert({ 
      student_id: studentId, 
      class_student_id: classStudentId,
      pokemon_id: pokemonDetails.id, 
      pokemon_name: pokemonDetails.name,
      sprite_url: pokemonDetails.sprite,
      cost_coins: pokemonDetails.cost_coins
    });
    
  if (error) throw error;
  return data;
}
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

// --- TRADING SYSTEM ---

export async function proposeTrade(tradeData) {
  const { error } = await supabase.from("pokemon_trades").insert(tradeData);
  if (error) throw error;
}

export async function getStudentTrades(studentId) {
  const { data, error } = await supabase
    .from("pokemon_trades")
    .select(`
      *,
      sender:sender_id(full_name),
      receiver:receiver_id(full_name),
      offered_pokemon:offered_instance_id(*),
      requested_pokemon:requested_instance_id(*)
    `)
    .or(`sender_id.eq.${studentId},receiver_id.eq.${studentId}`)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function handleTradeResponse(trade, status) {
  if (status === 'accepted') {
    // 1. Intercambio de Dueño
    if (trade.trade_type === 'trade') {
      // Swapping
      const { error: err1 } = await supabase.from("student_pokemon_store")
        .update({ student_id: trade.receiver_id })
        .eq("id", trade.offered_instance_id);
        
      const { error: err2 } = await supabase.from("student_pokemon_store")
        .update({ student_id: trade.sender_id })
        .eq("id", trade.requested_instance_id);
        
      if (err1 || err2) throw err1 || err2;
    } else {
      // Regalo o Venta (Solo se mueve el ofrecido)
      const { error: err } = await supabase.from("student_pokemon_store")
        .update({ student_id: trade.receiver_id })
        .eq("id", trade.offered_instance_id);
        
      if (err) throw err;
    }
  }
  
  const { error } = await supabase
    .from("pokemon_trades")
    .update({ status })
    .eq("id", trade.id);
    
  if (error) throw error;
}
