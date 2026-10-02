package com.notyx.app.data.repository

import com.notyx.app.data.SupabaseConfig
import com.notyx.app.data.models.*
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlin.random.Random

class TeacherRepository {
    private val postgrest = SupabaseConfig.postgrest

    private fun generateShortCode(): String {
        val chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        return (1..5)
            .map { chars[Random.nextInt(chars.length)] }
            .joinToString("")
    }

    suspend fun getTeacherClasses(teacherId: String): List<TeacherClassItem> {
        return try {
            val classes = postgrest.from("classes")
                .select {
                    filter {
                        eq("teacher_id", teacherId)
                    }
                }
                .decodeList<ClassItem>()

            val classIds = classes.map { it.id }
            val classStudents = if (classIds.isNotEmpty()) {
                postgrest.from("class_students")
                    .select {
                        filter {
                            isIn("class_id", classIds)
                        }
                    }
                    .decodeList<ClassStudent>()
            } else emptyList()

            val studentCounts = classStudents.groupBy { it.classId }

            classes.map { cls ->
                TeacherClassItem(
                    id = cls.id,
                    name = cls.name,
                    shortCode = cls.shortCode,
                    teacherId = cls.teacherId,
                    studentsCount = studentCounts[cls.id]?.size ?: 0
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun createClass(name: String, teacherId: String): Result<Unit> {
        return try {
            val code = generateShortCode()
            val newClass = ClassItem(
                id = java.util.UUID.randomUUID().toString(),
                name = name.trim(),
                shortCode = code,
                teacherId = teacherId
            )
            postgrest.from("classes").insert(newClass)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getClassSessions(classId: String): List<ClassSession> {
        return try {
            postgrest.from("sessions")
                .select {
                    filter {
                        eq("class_id", classId)
                    }
                    order(column = "date", order = Order.DESCENDING)
                }
                .decodeList<ClassSession>()
        } catch (e: Exception) {
            emptyList()
        }
    }

    val BASE_CRITERIA = listOf(
        "Participación en clase" to 10.0,
        "Actividades completas" to 10.0,
        "Carpeta completa" to 10.0,
        "Conducta" to 10.0
    )

    suspend fun createSession(
        classId: String,
        date: String,
        cuatrimestre: Int,
        preloadBaseCriteria: Boolean = true
    ): Result<String> {
        return try {
            val sessionId = java.util.UUID.randomUUID().toString()
            val session = ClassSession(
                id = sessionId,
                classId = classId,
                date = date,
                cuatrimestre = cuatrimestre
            )
            postgrest.from("sessions").insert(session)

            if (preloadBaseCriteria) {
                preloadSessionBaseCriteria(sessionId)
            }

            Result.success(sessionId)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun preloadSessionBaseCriteria(sessionId: String): Result<Unit> {
        return try {
            val existing = getSessionCriteria(sessionId)
            val existingNames = existing.map { it.name.trim().lowercase() }.toSet()

            val toInsert = BASE_CRITERIA.filter { (name, _) ->
                !existingNames.contains(name.lowercase())
            }.map { (name, max) ->
                SessionCriteria(
                    id = java.util.UUID.randomUUID().toString(),
                    sessionId = sessionId,
                    name = name,
                    maxScore = max
                )
            }

            if (toInsert.isNotEmpty()) {
                postgrest.from("session_criteria").insert(toInsert)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            android.util.Log.e("TeacherRepository", "Error in preloadSessionBaseCriteria: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun updateSession(sessionId: String, date: String, cuatrimestre: Int): Result<Unit> {
        return try {
            postgrest.from("sessions").update({
                set("date", date)
                set("cuatrimestre", cuatrimestre)
            }) {
                filter {
                    eq("id", sessionId)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteSession(sessionId: String): Result<Unit> {
        return try {
            // Cascade delete attendance
            try {
                postgrest.from("attendance").delete {
                    filter { eq("session_id", sessionId) }
                }
            } catch (e: Exception) { /* ignore */ }

            // Fetch criteria to delete their grades
            try {
                val criteria = getSessionCriteria(sessionId)
                val critIds = criteria.map { it.id }
                if (critIds.isNotEmpty()) {
                    postgrest.from("grades").delete {
                        filter { isIn("criteria_id", critIds) }
                    }
                    postgrest.from("session_criteria").delete {
                        filter { eq("session_id", sessionId) }
                    }
                }
            } catch (e: Exception) { /* ignore */ }

            // Delete session itself
            postgrest.from("sessions").delete {
                filter { eq("id", sessionId) }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getClassStudents(classId: String): List<ClassStudent> {
        return try {
            postgrest.from("class_students")
                .select {
                    filter {
                        eq("class_id", classId)
                    }
                }
                .decodeList<ClassStudent>()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun addStudentToClass(classId: String, studentName: String, dni: String?): Result<Unit> {
        return try {
            val student = ClassStudent(
                id = java.util.UUID.randomUUID().toString(),
                classId = classId,
                studentName = studentName.trim(),
                dni = dni?.trim()?.ifBlank { null }
            )
            postgrest.from("class_students").insert(student)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- ATTENDANCE METHODS ---

    suspend fun getAttendanceForSession(sessionId: String): List<Attendance> {
        return try {
            postgrest.from("attendance")
                .select {
                    filter {
                        eq("session_id", sessionId)
                    }
                }
                .decodeList<Attendance>()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun toggleAttendance(classStudentId: String, sessionId: String, isPresent: Boolean): Result<Unit> {
        return try {
            val statusStr = if (isPresent) "present" else "absent"
            val existing = postgrest.from("attendance")
                .select {
                    filter {
                        eq("class_student_id", classStudentId)
                        eq("session_id", sessionId)
                    }
                }
                .decodeSingleOrNull<Attendance>()

            if (existing != null) {
                postgrest.from("attendance")
                    .update({
                        set("is_present", isPresent)
                        set("status", statusStr)
                    }) {
                        filter {
                            eq("id", existing.id ?: "")
                        }
                    }
            } else {
                val record = Attendance(
                    id = java.util.UUID.randomUUID().toString(),
                    classStudentId = classStudentId,
                    sessionId = sessionId,
                    isPresent = isPresent,
                    status = statusStr
                )
                postgrest.from("attendance").insert(record)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun setAttendanceStatus(classStudentId: String, sessionId: String, newStatus: String): Result<Unit> {
        return try {
            val existing = postgrest.from("attendance")
                .select {
                    filter {
                        eq("class_student_id", classStudentId)
                        eq("session_id", sessionId)
                    }
                }
                .decodeSingleOrNull<Attendance>()

            when (newStatus) {
                "present" -> {
                    if (existing != null) {
                        postgrest.from("attendance").update({
                            set("is_present", true)
                            set("status", "present")
                        }) {
                            filter { eq("id", existing.id ?: "") }
                        }
                    } else {
                        val record = Attendance(
                            id = java.util.UUID.randomUUID().toString(),
                            classStudentId = classStudentId,
                            sessionId = sessionId,
                            isPresent = true,
                            status = "present"
                        )
                        postgrest.from("attendance").insert(record)
                    }
                }
                "absent" -> {
                    if (existing != null) {
                        postgrest.from("attendance").update({
                            set("is_present", false)
                            set("status", "absent")
                        }) {
                            filter { eq("id", existing.id ?: "") }
                        }
                    } else {
                        val record = Attendance(
                            id = java.util.UUID.randomUUID().toString(),
                            classStudentId = classStudentId,
                            sessionId = sessionId,
                            isPresent = false,
                            status = "absent"
                        )
                        postgrest.from("attendance").insert(record)
                    }
                }
                "clear" -> {
                    if (existing != null && existing.id != null) {
                        postgrest.from("attendance").delete {
                            filter { eq("id", existing.id) }
                        }
                    }
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markAllPresent(sessionId: String, classStudentIds: List<String>): Result<Unit> {
        return try {
            val existing = getAttendanceForSession(sessionId).associateBy { it.classStudentId }
            for (studentId in classStudentIds) {
                val record = existing[studentId]
                if (record != null) {
                    postgrest.from("attendance").update({
                        set("is_present", true)
                        set("status", "present")
                    }) {
                        filter { eq("id", record.id ?: "") }
                    }
                } else {
                    val newAtt = Attendance(
                        id = java.util.UUID.randomUUID().toString(),
                        classStudentId = studentId,
                        sessionId = sessionId,
                        isPresent = true,
                        status = "present"
                    )
                    postgrest.from("attendance").insert(newAtt)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markAllAbsent(sessionId: String, classStudentIds: List<String>): Result<Unit> {
        return try {
            val existing = getAttendanceForSession(sessionId).associateBy { it.classStudentId }
            for (studentId in classStudentIds) {
                val record = existing[studentId]
                if (record != null) {
                    postgrest.from("attendance").update({
                        set("is_present", false)
                        set("status", "absent")
                    }) {
                        filter { eq("id", record.id ?: "") }
                    }
                } else {
                    val newAtt = Attendance(
                        id = java.util.UUID.randomUUID().toString(),
                        classStudentId = studentId,
                        sessionId = sessionId,
                        isPresent = false,
                        status = "absent"
                    )
                    postgrest.from("attendance").insert(newAtt)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun clearAllAttendance(sessionId: String, classStudentIds: List<String>): Result<Unit> {
        return try {
            postgrest.from("attendance").delete {
                filter {
                    eq("session_id", sessionId)
                    isIn("class_student_id", classStudentIds)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- SESSION CRITERIA & GRADING METHODS ---

    suspend fun getSessionCriteria(sessionId: String): List<SessionCriteria> {
        return try {
            postgrest.from("session_criteria")
                .select {
                    filter {
                        eq("session_id", sessionId)
                    }
                    order(column = "created_at", order = Order.ASCENDING)
                }
                .decodeList<SessionCriteria>()
        } catch (e: Exception) {
            android.util.Log.e("TeacherRepository", "Error in getSessionCriteria for session $sessionId: ${e.message}", e)
            emptyList()
        }
    }

    suspend fun createSessionCriteria(sessionId: String, name: String, maxScore: Double = 10.0): Result<Unit> {
        return try {
            val critId = java.util.UUID.randomUUID().toString()
            val newCrit = SessionCriteria(
                id = critId,
                sessionId = sessionId,
                name = name.trim(),
                maxScore = maxScore
            )
            postgrest.from("session_criteria").insert(newCrit)
            Result.success(Unit)
        } catch (e: Exception) {
            android.util.Log.e("TeacherRepository", "Error in createSessionCriteria: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun updateSessionCriteria(criteriaId: String, name: String, maxScore: Double): Result<Unit> {
        return try {
            postgrest.from("session_criteria").update({
                set("name", name.trim())
                set("max_score", maxScore)
            }) {
                filter {
                    eq("id", criteriaId)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteSessionCriteria(criteriaId: String): Result<Unit> {
        return try {
            try {
                postgrest.from("grades").delete {
                    filter { eq("criteria_id", criteriaId) }
                }
            } catch (e: Exception) { /* ignore */ }

            postgrest.from("session_criteria").delete {
                filter {
                    eq("id", criteriaId)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSessionGrades(sessionId: String): List<Grade> {
        return try {
            val criteria = getSessionCriteria(sessionId)
            val criteriaIds = criteria.map { it.id }
            if (criteriaIds.isEmpty()) return emptyList()

            postgrest.from("grades")
                .select {
                    filter {
                        isIn("criteria_id", criteriaIds)
                    }
                }
                .decodeList<Grade>()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun saveGrade(classStudentId: String, criteriaId: String, score: Double): Result<Unit> {
        return try {
            val existing = postgrest.from("grades")
                .select {
                    filter {
                        eq("class_student_id", classStudentId)
                        eq("criteria_id", criteriaId)
                    }
                }
                .decodeSingleOrNull<Grade>()

            if (existing != null) {
                postgrest.from("grades")
                    .update({
                        set("score", score)
                    }) {
                        filter {
                            eq("id", existing.id ?: "")
                        }
                    }
            } else {
                val newGrade = Grade(
                    id = java.util.UUID.randomUUID().toString(),
                    classStudentId = classStudentId,
                    criteriaId = criteriaId,
                    score = score
                )
                postgrest.from("grades").insert(newGrade)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun saveAllCriteriaGradesForStudent(
        classStudentId: String,
        criteriaIds: List<String>,
        score: Double
    ): Result<Unit> = coroutineScope {
        try {
            if (criteriaIds.isEmpty()) return@coroutineScope Result.success(Unit)

            val existingGrades = postgrest.from("grades")
                .select {
                    filter {
                        eq("class_student_id", classStudentId)
                        isIn("criteria_id", criteriaIds)
                    }
                }
                .decodeList<Grade>()

            val existingByCrit = existingGrades.associateBy { it.criteriaId }

            val deferreds = criteriaIds.map { critId ->
                async {
                    val existing = existingByCrit[critId]
                    if (existing != null) {
                        postgrest.from("grades")
                            .update({
                                set("score", score)
                            }) {
                                filter { eq("id", existing.id ?: "") }
                            }
                    } else {
                        val newGrade = Grade(
                            id = java.util.UUID.randomUUID().toString(),
                            classStudentId = classStudentId,
                            criteriaId = critId,
                            score = score
                        )
                        postgrest.from("grades").insert(newGrade)
                    }
                }
            }
            deferreds.awaitAll()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun saveCriteriaGradeForClass(
        criteriaId: String,
        classStudentIds: List<String>,
        score: Double
    ): Result<Unit> = coroutineScope {
        try {
            if (classStudentIds.isEmpty()) return@coroutineScope Result.success(Unit)

            val existingGrades = postgrest.from("grades")
                .select {
                    filter {
                        eq("criteria_id", criteriaId)
                        isIn("class_student_id", classStudentIds)
                    }
                }
                .decodeList<Grade>()

            val existingByStudent = existingGrades.associateBy { it.classStudentId }

            val deferreds = classStudentIds.map { studentId ->
                async {
                    val existing = existingByStudent[studentId]
                    if (existing != null) {
                        postgrest.from("grades")
                            .update({
                                set("score", score)
                            }) {
                                filter { eq("id", existing.id ?: "") }
                            }
                    } else {
                        val newGrade = Grade(
                            id = java.util.UUID.randomUUID().toString(),
                            classStudentId = studentId,
                            criteriaId = criteriaId,
                            score = score
                        )
                        postgrest.from("grades").insert(newGrade)
                    }
                }
            }
            deferreds.awaitAll()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
