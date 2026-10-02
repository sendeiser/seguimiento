package com.notyx.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Profile(
    val id: String,
    @SerialName("full_name") val fullName: String? = null,
    val role: String = "student",
    val email: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val dni: String? = null
)

@Serializable
data class ClassItem(
    val id: String,
    val name: String,
    @SerialName("short_code") val shortCode: String? = null,
    val code: String? = null,
    @SerialName("join_code") val joinCode: String? = null,
    @SerialName("public_token") val publicToken: String? = null,
    val subject: String? = null,
    @SerialName("teacher_id") val teacherId: String? = null
)

@Serializable
data class ClassStudent(
    val id: String,
    @SerialName("class_id") val classId: String,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("student_name") val studentName: String? = null,
    val dni: String? = null,
    @SerialName("public_token") val publicToken: String? = null,
    @SerialName("house_id") val houseId: String? = null
)

data class TeacherClassItem(
    val id: String,
    val name: String,
    val shortCode: String? = null,
    val teacherId: String? = null,
    val studentsCount: Int = 0
)

data class EnrolledClassItem(
    val id: String,
    val name: String,
    val shortCode: String? = null,
    val teacherName: String? = null
)

data class TutorReportData(
    val studentName: String,
    val dni: String,
    val className: String? = null,
    val averageScore: Double = 0.0,
    val attendancePct: Int = 100,
    val presentCount: Int = 0,
    val absentCount: Int = 0,
    val grades: List<DetailedGradeItem> = emptyList(),
    val attendances: List<AttendanceRecord> = emptyList()
)

@Serializable
data class SessionCriteria(
    val id: String = "",
    @SerialName("session_id") val sessionId: String = "",
    val name: String = "",
    @SerialName("max_score") val maxScore: Double? = 10.0,
    @SerialName("created_at") val createdAt: String? = null
) {
    val safeMaxScore: Double
        get() = maxScore ?: 10.0
}

@Serializable
data class Grade(
    val id: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("class_student_id") val classStudentId: String? = null,
    @SerialName("criteria_id") val criteriaId: String,
    val score: Double = 0.0
)

@Serializable
data class Attendance(
    val id: String? = null,
    @SerialName("class_student_id") val classStudentId: String? = null,
    @SerialName("session_id") val sessionId: String,
    @SerialName("is_present") val isPresent: Boolean = false,
    val status: String? = null
) {
    val isActuallyPresent: Boolean
        get() = status?.equals("present", ignoreCase = true) == true ||
                (status == null && isPresent) ||
                (isPresent && status?.equals("absent", ignoreCase = true) != true)

    val isExplicitlyAbsent: Boolean
        get() = status?.equals("absent", ignoreCase = true) == true ||
                (!isPresent && status != null)
}

@Serializable
data class Reward(
    val id: String,
    val name: String,
    val description: String? = null,
    @SerialName("cost_coins") val costCoins: Int = 100,
    val category: String = "cosmetic",
    val icon: String? = null
)

@Serializable
data class StudentPurchase(
    val id: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("class_student_id") val classStudentId: String? = null,
    @SerialName("reward_id") val rewardId: String,
    val status: String = "bought",
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class ClassSession(
    val id: String,
    @SerialName("class_id") val classId: String,
    val date: String? = null,
    val cuatrimestre: Int? = 1
) {
    val displayTitle: String
        get() = "Sesión ${date ?: ""}"
}

data class Badge(
    val id: String,
    val label: String,
    val description: String,
    val iconName: String,
    val unlocked: Boolean
)

data class DetailedGradeItem(
    val criteriaId: String,
    val criteriaName: String,
    val score: Double,
    val maxScore: Double = 10.0,
    val sessionTitle: String? = null,
    val date: String? = null,
    val cuatrimestre: Int? = 1
)

data class AttendanceRecord(
    val sessionId: String,
    val sessionTitle: String,
    val date: String,
    val isPresent: Boolean
)

@Serializable
data class PokemonItem(
    val id: Int,
    val name: String,
    @SerialName("original_name") val originalName: String? = null,
    val sprite: String? = null,
    val types: List<String> = emptyList(),
    @SerialName("cost_coins") val costCoins: Int = 150,
    val hp: Int = 50,
    val attack: Int = 50,
    val defense: Int = 50
)

@Serializable
data class StudentPokemon(
    val id: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("class_student_id") val classStudentId: String? = null,
    @SerialName("pokemon_id") val pokemonId: Int,
    @SerialName("pokemon_name") val pokemonName: String,
    @SerialName("sprite_url") val spriteUrl: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class StudentPokemonStoreItem(
    val id: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("class_student_id") val classStudentId: String? = null,
    @SerialName("pokemon_id") val pokemonId: Int,
    @SerialName("pokemon_name") val pokemonName: String,
    @SerialName("sprite_url") val spriteUrl: String? = null,
    @SerialName("cost_coins") val costCoins: Int = 150,
    val level: Int = 1,
    val experience: Int = 0
)

@Serializable
data class ClassHouse(
    val id: String,
    @SerialName("class_id") val classId: String? = null,
    val name: String,
    val color: String? = null,
    val icon: String? = "🛡️"
)

data class GamificationStats(
    val xp: Int = 0,
    val currentLevel: Int = 1,
    val currentLevelXP: Int = 0,
    val nextLevelXP: Int = 150,
    val rankName: String = "Hierro",
    val rankColor: Long = 0xFF64748B,
    val hp: Int = 100,
    val maxHp: Int = 100,
    val streak: Int = 0,
    val notyxCoins: Int = 0,
    val equippedSkin: String? = null,
    val house: ClassHouse? = null,
    val badges: List<Badge> = emptyList()
)

data class RankingStudent(
    val id: String,
    val name: String,
    val xp: Int,
    val level: Int,
    val rankName: String,
    val rankPosition: Int,
    val streak: Int
)

@Serializable
data class ClassStudentRow(
    val studentId: String,
    val studentName: String,
    val classStudentId: String,
    val rank: Int = 1,
    val gradesByCriteriaId: Map<String, Double> = emptyMap(),
    val totalScore: Double = 0.0,
    val maxScore: Double = 0.0,
    val percentage: Int = 0,
    val level: Int = 1,
    val streak: Int = 0,
    val hp: Int = 100
)

@Serializable
data class ClassSessionColumn(
    val session: ClassSession,
    val criteria: List<SessionCriteria> = emptyList()
)

@Serializable
data class FullClassMatrix(
    val sessionsWithCriteria: List<ClassSessionColumn> = emptyList(),
    val allCriteria: List<SessionCriteria> = emptyList(),
    val studentRows: List<ClassStudentRow> = emptyList(),
    val maxPossibleClassScore: Double = 0.0
)

data class DaySessionSummary(
    val date: String?,
    val displayDate: String,
    val sessionTitle: String,
    val cuatrimestre: Int = 1,
    val isPresent: Boolean? = null,
    val grades: List<DetailedGradeItem> = emptyList(),
    val totalScore: Double = 0.0,
    val maxScore: Double = 0.0,
    val percentage: Double = 0.0
) {
    val isPassing: Boolean get() = percentage >= 60.0
}

@Serializable
data class StudentGameProgress(
    val id: String? = null,
    @SerialName("class_student_id") val classStudentId: String,
    @SerialName("game_name") val gameName: String,
    val difficulty: String = "easy",
    @SerialName("high_score") val highScore: Int = 0,
    @SerialName("total_games_played") val totalGamesPlayed: Int = 0,
    @SerialName("last_played_at") val lastPlayedAt: String? = null
)


