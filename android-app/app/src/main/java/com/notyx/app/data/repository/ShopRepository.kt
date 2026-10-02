package com.notyx.app.data.repository

import com.notyx.app.data.SupabaseConfig
import com.notyx.app.data.models.PokemonItem
import com.notyx.app.data.models.Reward
import com.notyx.app.data.models.StudentPokemonStoreItem
import com.notyx.app.data.models.StudentPurchase
import io.github.jan.supabase.postgrest.from

class ShopRepository {
    private val postgrest = SupabaseConfig.postgrest

    suspend fun getRewards(): List<Reward> {
        return try {
            postgrest.from("rewards")
                .select()
                .decodeList<Reward>()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun createReward(
        name: String,
        description: String?,
        costCoins: Int,
        category: String = "item",
        icon: String? = null
    ): Result<Reward> {
        return try {
            val newReward = Reward(
                id = java.util.UUID.randomUUID().toString(),
                name = name.trim(),
                description = description?.trim()?.ifBlank { null },
                costCoins = costCoins,
                category = category,
                icon = icon?.trim()?.ifBlank { null }
            )
            postgrest.from("rewards").insert(newReward)
            Result.success(newReward)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateReward(
        rewardId: String,
        name: String,
        description: String?,
        costCoins: Int,
        category: String,
        icon: String? = null
    ): Result<Unit> {
        return try {
            postgrest.from("rewards").update({
                set("name", name.trim())
                set("description", description?.trim()?.ifBlank { null })
                set("cost_coins", costCoins)
                set("category", category)
                set("icon", icon?.trim()?.ifBlank { null })
            }) {
                filter {
                    eq("id", rewardId)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteReward(rewardId: String): Result<Unit> {
        return try {
            // First delete any student_purchases referencing this reward to avoid FK constraints
            try {
                postgrest.from("student_purchases").delete {
                    filter { eq("reward_id", rewardId) }
                }
            } catch (e: Exception) { /* ignore */ }

            postgrest.from("rewards").delete {
                filter {
                    eq("id", rewardId)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateRewardPrice(rewardId: String, newCostCoins: Int): Result<Unit> {
        return try {
            postgrest.from("rewards")
                .update({ set("cost_coins", newCostCoins) }) {
                    filter {
                        eq("id", rewardId)
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMyPurchases(studentId: String): List<StudentPurchase> {
        return try {
            val all = postgrest.from("student_purchases")
                .select()
                .decodeList<StudentPurchase>()
            all.filter { it.studentId == studentId || it.classStudentId == studentId }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun buyReward(
        studentId: String?,
        rewardId: String,
        classStudentId: String? = null
    ): Result<Unit> {
        return try {
            val csId = classStudentId ?: studentId
            val profileId = if (classStudentId != null && studentId != classStudentId) studentId else null
            val purchase = StudentPurchase(
                id = java.util.UUID.randomUUID().toString(),
                studentId = profileId,
                classStudentId = csId,
                rewardId = rewardId,
                status = "bought"
            )
            postgrest.from("student_purchases").insert(purchase)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun equipSkin(studentId: String, rewardId: String): Result<Unit> {
        return try {
            // First unequip all previous skins for this student
            try {
                postgrest.from("student_purchases")
                    .update({ set("status", "bought") }) {
                        filter {
                            eq("student_id", studentId)
                            eq("status", "equipped")
                        }
                    }
                postgrest.from("student_purchases")
                    .update({ set("status", "bought") }) {
                        filter {
                            eq("class_student_id", studentId)
                            eq("status", "equipped")
                        }
                    }
            } catch (e: Exception) { /* ignore */ }

            // Set current skin as equipped
            try {
                postgrest.from("student_purchases")
                    .update({ set("status", "equipped") }) {
                        filter {
                            eq("student_id", studentId)
                            eq("reward_id", rewardId)
                        }
                    }
            } catch (e: Exception) { /* ignore */ }

            try {
                postgrest.from("student_purchases")
                    .update({ set("status", "equipped") }) {
                        filter {
                            eq("class_student_id", studentId)
                            eq("reward_id", rewardId)
                        }
                    }
            } catch (e: Exception) { /* ignore */ }

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- POKÉMON CENTER METHODS ---

    suspend fun getMyPokemon(studentId: String): List<StudentPokemonStoreItem> {
        return try {
            val all = postgrest.from("student_pokemon_store")
                .select()
                .decodeList<StudentPokemonStoreItem>()
            all.filter { it.studentId == studentId || it.classStudentId == studentId }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun capturePokemon(
        studentId: String?,
        pokemon: PokemonItem,
        classStudentId: String? = null
    ): Result<Unit> {
        return try {
            val csId = classStudentId ?: studentId
            val profileId = if (classStudentId != null && studentId != classStudentId) studentId else null
            val item = StudentPokemonStoreItem(
                id = java.util.UUID.randomUUID().toString(),
                studentId = profileId,
                classStudentId = csId,
                pokemonId = pokemon.id,
                pokemonName = pokemon.name,
                spriteUrl = pokemon.sprite,
                costCoins = pokemon.costCoins,
                level = 1,
                experience = 0
            )
            postgrest.from("student_pokemon_store").insert(item)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private val jsonParser = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
    private val cachedPokeApiPokemon = java.util.concurrent.ConcurrentHashMap<Int, PokemonItem>()

    suspend fun fetchPokemonFromPokeApi(page: Int = 1, pageSize: Int = 24, type: String = "all"): List<PokemonItem> = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        try {
            val urlString = if (type == "all") {
                val offset = (page - 1).coerceAtLeast(0) * pageSize
                "https://pokeapi.co/api/v2/pokemon?limit=$pageSize&offset=$offset"
            } else {
                "https://pokeapi.co/api/v2/type/${type.lowercase()}"
            }

            val conn = java.net.URL(urlString).openConnection() as java.net.HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("User-Agent", "NotyxEdu/1.0")
            conn.connectTimeout = 8000
            conn.readTimeout = 8000

            if (conn.responseCode != 200) return@withContext emptyList()

            val text = conn.inputStream.bufferedReader().use { it.readText() }
            val root = jsonParser.parseToJsonElement(text) as? kotlinx.serialization.json.JsonObject ?: return@withContext emptyList()

            val baseArtwork = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork"

            val rawList = if (type == "all") {
                val resultsArray = root["results"] as? kotlinx.serialization.json.JsonArray ?: return@withContext emptyList()
                resultsArray.mapNotNull { item ->
                    val obj = item as? kotlinx.serialization.json.JsonObject ?: return@mapNotNull null
                    val name = (obj["name"] as? kotlinx.serialization.json.JsonPrimitive)?.content ?: return@mapNotNull null
                    val url = (obj["url"] as? kotlinx.serialization.json.JsonPrimitive)?.content ?: return@mapNotNull null
                    val id = url.trimEnd('/').substringAfterLast('/').toIntOrNull() ?: return@mapNotNull null
                    name to id
                }
            } else {
                val pokemonArray = root["pokemon"] as? kotlinx.serialization.json.JsonArray ?: return@withContext emptyList()
                val offset = (page - 1).coerceAtLeast(0) * pageSize
                val subList = pokemonArray.drop(offset).take(pageSize)
                subList.mapNotNull { item ->
                    val itemObj = item as? kotlinx.serialization.json.JsonObject ?: return@mapNotNull null
                    val pObj = itemObj["pokemon"] as? kotlinx.serialization.json.JsonObject ?: return@mapNotNull null
                    val name = (pObj["name"] as? kotlinx.serialization.json.JsonPrimitive)?.content ?: return@mapNotNull null
                    val url = (pObj["url"] as? kotlinx.serialization.json.JsonPrimitive)?.content ?: return@mapNotNull null
                    val id = url.trimEnd('/').substringAfterLast('/').toIntOrNull() ?: return@mapNotNull null
                    name to id
                }
            }

            rawList.map { (pName, pId) ->
                cachedPokeApiPokemon[pId] ?: run {
                    val baseCost = (120 + (pId % 25) * 15).coerceIn(100, 750)
                    val capitalName = pName.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
                    val item = PokemonItem(
                        id = pId,
                        name = capitalName,
                        originalName = pName,
                        sprite = "$baseArtwork/$pId.png",
                        types = if (type != "all") listOf(type) else emptyList(),
                        costCoins = baseCost,
                        hp = 50 + (pId % 50),
                        attack = 50 + (pId % 60),
                        defense = 50 + (pId % 55)
                    )
                    cachedPokeApiPokemon[pId] = item
                    item
                }
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun searchPokemonOnPokeApi(query: String): PokemonItem? = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        try {
            val clean = query.trim().lowercase()
            if (clean.isBlank()) return@withContext null

            val conn = java.net.URL("https://pokeapi.co/api/v2/pokemon/$clean").openConnection() as java.net.HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("User-Agent", "NotyxEdu/1.0")
            conn.connectTimeout = 8000
            conn.readTimeout = 8000

            if (conn.responseCode != 200) return@withContext null

            val text = conn.inputStream.bufferedReader().use { it.readText() }
            val root = jsonParser.parseToJsonElement(text) as? kotlinx.serialization.json.JsonObject ?: return@withContext null

            val id = (root["id"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.toIntOrNull() ?: return@withContext null
            val name = (root["name"] as? kotlinx.serialization.json.JsonPrimitive)?.content ?: clean
            val baseExp = (root["base_experience"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.toIntOrNull() ?: 80
            val cost = ((baseExp * 1.8).toInt()).coerceIn(100, 1000)

            val typesArray = root["types"] as? kotlinx.serialization.json.JsonArray
            val types = typesArray?.mapNotNull { item ->
                val tObj = item as? kotlinx.serialization.json.JsonObject
                val innerType = tObj?.get("type") as? kotlinx.serialization.json.JsonObject
                (innerType?.get("name") as? kotlinx.serialization.json.JsonPrimitive)?.content
            } ?: emptyList()

            var hp = 50
            var atk = 50
            var def = 50
            val statsArray = root["stats"] as? kotlinx.serialization.json.JsonArray
            statsArray?.forEach { s ->
                val sObj = s as? kotlinx.serialization.json.JsonObject ?: return@forEach
                val statObj = sObj["stat"] as? kotlinx.serialization.json.JsonObject
                val statName = (statObj?.get("name") as? kotlinx.serialization.json.JsonPrimitive)?.content
                val baseStat = (sObj["base_stat"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.toIntOrNull() ?: 50
                when (statName) {
                    "hp" -> hp = baseStat
                    "attack" -> atk = baseStat
                    "defense" -> def = baseStat
                }
            }

            val baseArtwork = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork"
            val capitalName = name.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
            val poke = PokemonItem(
                id = id,
                name = capitalName,
                originalName = name,
                sprite = "$baseArtwork/$id.png",
                types = types,
                costCoins = cost,
                hp = hp,
                attack = atk,
                defense = def
            )
            cachedPokeApiPokemon[id] = poke
            poke
        } catch (e: Exception) {
            null
        }
    }

    fun getCatalogPokemon(): List<PokemonItem> {
        val baseArtwork = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork"
        return listOf(
            PokemonItem(1, "Bulbasaur", "bulbasaur", "$baseArtwork/1.png", listOf("grass", "poison"), 120, 45, 49, 49),
            PokemonItem(2, "Ivysaur", "ivysaur", "$baseArtwork/2.png", listOf("grass", "poison"), 250, 60, 62, 63),
            PokemonItem(3, "Venusaur", "venusaur", "$baseArtwork/3.png", listOf("grass", "poison"), 400, 80, 82, 83),
            PokemonItem(4, "Charmander", "charmander", "$baseArtwork/4.png", listOf("fire"), 120, 39, 52, 43),
            PokemonItem(5, "Charmeleon", "charmeleon", "$baseArtwork/5.png", listOf("fire"), 250, 58, 64, 58),
            PokemonItem(6, "Charizard", "charizard", "$baseArtwork/6.png", listOf("fire", "flying"), 450, 78, 84, 78),
            PokemonItem(7, "Squirtle", "squirtle", "$baseArtwork/7.png", listOf("water"), 120, 44, 48, 65),
            PokemonItem(8, "Wartortle", "wartortle", "$baseArtwork/8.png", listOf("water"), 250, 59, 63, 80),
            PokemonItem(9, "Blastoise", "blastoise", "$baseArtwork/9.png", listOf("water"), 420, 79, 83, 100),
            PokemonItem(25, "Pikachu", "pikachu", "$baseArtwork/25.png", listOf("electric"), 150, 35, 55, 40),
            PokemonItem(26, "Raichu", "raichu", "$baseArtwork/26.png", listOf("electric"), 320, 60, 90, 55),
            PokemonItem(39, "Jigglypuff", "jigglypuff", "$baseArtwork/39.png", listOf("normal", "fairy"), 130, 115, 45, 20),
            PokemonItem(94, "Gengar", "gengar", "$baseArtwork/94.png", listOf("ghost", "poison"), 380, 60, 65, 60),
            PokemonItem(133, "Eevee", "eevee", "$baseArtwork/133.png", listOf("normal"), 120, 55, 55, 50),
            PokemonItem(134, "Vaporeon", "vaporeon", "$baseArtwork/134.png", listOf("water"), 340, 130, 65, 60),
            PokemonItem(135, "Jolteon", "jolteon", "$baseArtwork/135.png", listOf("electric"), 340, 65, 65, 60),
            PokemonItem(136, "Flareon", "flareon", "$baseArtwork/136.png", listOf("fire"), 340, 65, 130, 60),
            PokemonItem(143, "Snorlax", "snorlax", "$baseArtwork/143.png", listOf("normal"), 320, 160, 110, 65),
            PokemonItem(149, "Dragonite", "dragonite", "$baseArtwork/149.png", listOf("dragon", "flying"), 500, 91, 134, 95),
            PokemonItem(150, "Mewtwo", "mewtwo", "$baseArtwork/150.png", listOf("psychic"), 750, 106, 110, 90),
            PokemonItem(151, "Mew", "mew", "$baseArtwork/151.png", listOf("psychic"), 700, 100, 100, 100),
            PokemonItem(155, "Cyndaquil", "cyndaquil", "$baseArtwork/155.png", listOf("fire"), 120, 39, 52, 43),
            PokemonItem(157, "Typhlosion", "typhlosion", "$baseArtwork/157.png", listOf("fire"), 420, 78, 84, 78),
            PokemonItem(158, "Totodile", "totodile", "$baseArtwork/158.png", listOf("water"), 120, 50, 65, 64),
            PokemonItem(160, "Feraligatr", "feraligatr", "$baseArtwork/160.png", listOf("water"), 420, 85, 105, 100),
            PokemonItem(249, "Lugia", "lugia", "$baseArtwork/249.png", listOf("psychic", "flying"), 800, 106, 90, 130),
            PokemonItem(250, "Ho-Oh", "ho-oh", "$baseArtwork/250.png", listOf("fire", "flying"), 800, 106, 130, 90),
            PokemonItem(255, "Torchic", "torchic", "$baseArtwork/255.png", listOf("fire"), 120, 45, 60, 40),
            PokemonItem(257, "Blaziken", "blaziken", "$baseArtwork/257.png", listOf("fire", "fighting"), 450, 80, 120, 70),
            PokemonItem(258, "Mudkip", "mudkip", "$baseArtwork/258.png", listOf("water"), 120, 50, 70, 50),
            PokemonItem(282, "Gardevoir", "gardevoir", "$baseArtwork/282.png", listOf("psychic", "fairy"), 420, 68, 65, 65),
            PokemonItem(384, "Rayquaza", "rayquaza", "$baseArtwork/384.png", listOf("dragon", "flying"), 850, 105, 150, 90),
            PokemonItem(445, "Garchomp", "garchomp", "$baseArtwork/445.png", listOf("dragon", "ground"), 520, 108, 130, 95),
            PokemonItem(448, "Lucario", "lucario", "$baseArtwork/448.png", listOf("fighting", "steel"), 350, 70, 110, 70),
            PokemonItem(658, "Greninja", "greninja", "$baseArtwork/658.png", listOf("water", "dark"), 480, 72, 95, 67),
            PokemonItem(778, "Mimikyu", "mimikyu", "$baseArtwork/778.png", listOf("ghost", "fairy"), 360, 55, 90, 80)
        )
    }
}
