package com.notyx.app.domain

import com.notyx.app.data.models.Badge
import com.notyx.app.data.models.ClassHouse
import com.notyx.app.data.models.GamificationStats
import kotlin.math.max
import kotlin.math.min

data class RankDef(
    val name: String,
    val minXP: Int,
    val color: Long
)

object GamificationEngine {
    const val XP_PER_LEVEL = 150

    val RANKS = listOf(
        RankDef("Hierro", 0, 0xFF64748B),
        RankDef("Bronce", 100, 0xFFB45309),
        RankDef("Plata", 300, 0xFF6B7280),
        RankDef("Oro", 600, 0xFFD97706),
        RankDef("Platino", 1000, 0xFF14B8A6),
        RankDef("Diamante", 1500, 0xFF0891B2),
        RankDef("Maestro", 2500, 0xFFC026D3)
    )

    fun calculate(
        totalGradePoints: Double = 0.0,
        attendedCount: Int = 0,
        absenceCount: Int = 0,
        streakCount: Int = 0,
        maxStreak: Int = streakCount,
        spentCoins: Int = 0,
        perfectSessionsCount: Int = 0,
        hasPhoenix: Boolean = false,
        hasResilience: Boolean = false,
        equippedSkin: String? = null,
        house: ClassHouse? = null
    ): GamificationStats {
        // XP calculation: 20 XP per attendance + 15 XP per grade point + 50 per perfect session
        var xp = (attendedCount * 20) + (totalGradePoints * 15).toInt() + (perfectSessionsCount * 50)
        if (xp < 0) xp = 0

        // HP calculation: base 100 - 30 per absence + grade bonuses
        var hp = 100 - (absenceCount * 30) + (attendedCount * 5)
        if (hp <= 0) {
            hp = 100 // Reset upon death
            xp = max(0, xp - 150)
        }
        hp = max(0, min(100, hp))

        // Level & Progress (150 XP per level)
        val level = 1 + (xp / XP_PER_LEVEL)
        val currentLevelXP = xp % XP_PER_LEVEL
        val nextLevelXP = XP_PER_LEVEL

        // Rank determination
        val rank = RANKS.reversed().firstOrNull { xp >= it.minXP } ?: RANKS.first()

        // Coins: 1.5 coins per XP, minus spent
        val earnedCoins = (xp * 1.5).toInt()
        val netCoins = max(0, earnedCoins - spentCoins)

        // Badges evaluation
        val badges = listOf(
            Badge(
                id = "first_blood",
                label = "Primer Paso",
                description = "Asistir a tu primera clase",
                iconName = "Flag",
                unlocked = attendedCount >= 1
            ),
            Badge(
                id = "streak_3",
                label = "Racha x3",
                description = "3 clases consecutivas",
                iconName = "Flame",
                unlocked = maxStreak >= 3
            ),
            Badge(
                id = "streak_5",
                label = "Imparable x5",
                description = "5 clases consecutivas",
                iconName = "Whatshot",
                unlocked = maxStreak >= 5
            ),
            Badge(
                id = "perfect_score",
                label = "Día Perfecto",
                description = "Puntaje máximo en una sesión",
                iconName = "Star",
                unlocked = perfectSessionsCount >= 1
            ),
            Badge(
                id = "perfectionist",
                label = "Perfeccionista",
                description = "Puntaje máximo en 3 sesiones",
                iconName = "EmojiEvents",
                unlocked = perfectSessionsCount >= 3
            ),
            Badge(
                id = "resilience",
                label = "Mejora Continua",
                description = "Superar el puntaje previo",
                iconName = "TrendingUp",
                unlocked = hasResilience
            ),
            Badge(
                id = "phoenix",
                label = "Ave Fénix",
                description = "Sobrevivir con 20 HP o menos",
                iconName = "Favorite",
                unlocked = hasPhoenix || hp in 1..20
            )
        )

        return GamificationStats(
            xp = xp,
            currentLevel = level,
            currentLevelXP = currentLevelXP,
            nextLevelXP = nextLevelXP,
            rankName = rank.name,
            rankColor = rank.color,
            hp = hp,
            maxHp = 100,
            streak = streakCount,
            notyxCoins = netCoins,
            equippedSkin = equippedSkin,
            house = house,
            badges = badges
        )
    }
}
