package com.notyx.app.data.repository

import com.notyx.app.data.SupabaseConfig
import com.notyx.app.data.models.*
import com.notyx.app.domain.GamificationEngine
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

class StudentRepository {
    private val postgrest = SupabaseConfig.postgrest

    private var cachedRewards: List<Reward>? = null
    private var cachedHouses: MutableMap<String, ClassHouse> = mutableMapOf()

    private suspend fun resolveClassStudentIds(studentOrUserId: String): List<String> {
        return try {
            val direct = postgrest.from("class_students")
                .select { filter { eq("id", studentOrUserId) } }
                .decodeSingleOrNull<ClassStudent>()
            if (direct != null) {
                return listOf(direct.id)
            }

            val byStudentId = postgrest.from("class_students")
                .select { filter { eq("student_id", studentOrUserId) } }
                .decodeList<ClassStudent>()
            if (byStudentId.isNotEmpty()) {
                return byStudentId.map { it.id }
            }

            val byDni = postgrest.from("class_students")
                .select { filter { eq("dni", studentOrUserId) } }
                .decodeList<ClassStudent>()
            if (byDni.isNotEmpty()) {
                return byDni.map { it.id }
            }

            listOf(studentOrUserId)
        } catch (e: Exception) {
            listOf(studentOrUserId)
        }
    }

    suspend fun getStudentStats(studentId: String): GamificationStats = coroutineScope {
        try {
            val classStudentIds = resolveClassStudentIds(studentId)

            val gradesDeferred = async {
                if (classStudentIds.isNotEmpty()) {
                    postgrest.from("grades")
                        .select { filter { isIn("class_student_id", classStudentIds) } }
                        .decodeList<Grade>()
                } else emptyList()
            }

            val attendancesDeferred = async {
                if (classStudentIds.isNotEmpty()) {
                    postgrest.from("attendance")
                        .select { filter { isIn("class_student_id", classStudentIds) } }
                        .decodeList<Attendance>()
                } else emptyList()
            }

            val purchasesDeferred = async {
                try {
                    val all = postgrest.from("student_purchases")
                        .select()
                        .decodeList<StudentPurchase>()
                    all.filter { p ->
                        (p.classStudentId != null && classStudentIds.contains(p.classStudentId)) ||
                        (p.studentId != null && (p.studentId == studentId || classStudentIds.contains(p.studentId)))
                    }
                } catch (e: Exception) { emptyList() }
            }

            val rewardsDeferred = async {
                cachedRewards ?: try {
                    postgrest.from("rewards").select().decodeList<Reward>().also { cachedRewards = it }
                } catch (e: Exception) { emptyList() }
            }

            val pokemonPurchasesDeferred = async {
                try {
                    val all = postgrest.from("student_pokemon_store")
                        .select()
                        .decodeList<StudentPokemonStoreItem>()
                    all.filter { p ->
                        (p.classStudentId != null && classStudentIds.contains(p.classStudentId)) ||
                        (p.studentId != null && (p.studentId == studentId || classStudentIds.contains(p.studentId)))
                    }
                } catch (e: Exception) { emptyList() }
            }

            val studentRecordDeferred = async {
                try {
                    if (classStudentIds.isNotEmpty()) {
                        postgrest.from("class_students")
                            .select { filter { isIn("id", classStudentIds) } }
                            .decodeList<ClassStudent>()
                            .firstOrNull()
                    } else null
                } catch (e: Exception) { null }
            }

            val grades = gradesDeferred.await()
            val attendances = attendancesDeferred.await()
            val purchases = purchasesDeferred.await()
            val rewards = rewardsDeferred.await()
            val pokemonPurchases = pokemonPurchasesDeferred.await()
            val studentRecord = studentRecordDeferred.await()

            val rewardsMap = rewards.associateBy { it.id }

            // Compute spent coins on skins/rewards
            val spentOnRewards = purchases.sumOf { p ->
                rewardsMap[p.rewardId]?.costCoins ?: 0
            }
            val spentOnPokemon = pokemonPurchases.sumOf { it.costCoins }
            val totalSpentCoins = spentOnRewards + spentOnPokemon

            // Find equipped skin
            val equippedPurchase = purchases.firstOrNull { it.status == "equipped" }
            val equippedSkinName = equippedPurchase?.let { rewardsMap[it.rewardId]?.name }

            val totalGradePoints = grades.sumOf { it.score }
            val attendedCount = attendances.count { it.isActuallyPresent }
            val absenceCount = attendances.count { !it.isActuallyPresent }

            // Consecutive streak and max streak
            var streak = 0
            var maxStreak = 0
            var currentStreak = 0
            attendances.forEach { att ->
                if (att.isActuallyPresent) {
                    currentStreak++
                    if (currentStreak > maxStreak) maxStreak = currentStreak
                } else {
                    currentStreak = 0
                }
            }
            streak = attendances.takeLastWhile { it.isActuallyPresent }.size

            // Check perfect grades
            val perfectSessionsCount = grades.count { it.score >= 10.0 }

            val studentHouse = if (studentRecord?.houseId != null) {
                cachedHouses[studentRecord.houseId] ?: try {
                    val house = postgrest.from("class_houses")
                        .select { filter { eq("id", studentRecord.houseId) } }
                        .decodeSingleOrNull<ClassHouse>()
                    if (house != null) cachedHouses[house.id] = house
                    house
                } catch (e: Exception) { null }
            } else null

            GamificationEngine.calculate(
                totalGradePoints = totalGradePoints,
                attendedCount = attendedCount,
                absenceCount = absenceCount,
                streakCount = streak,
                maxStreak = maxStreak,
                spentCoins = totalSpentCoins,
                perfectSessionsCount = perfectSessionsCount,
                equippedSkin = equippedSkinName,
                house = studentHouse
            )
        } catch (e: Exception) {
            GamificationEngine.calculate()
        }
    }

    suspend fun getEnrolledClasses(studentId: String): List<EnrolledClassItem> {
        return try {
            val classStudents = postgrest.from("class_students")
                .select {
                    filter {
                        eq("student_id", studentId)
                    }
                }
                .decodeList<ClassStudent>()

            val classIds = classStudents.map { it.classId }.distinct()
            if (classIds.isEmpty()) return emptyList()

            val classes = postgrest.from("classes")
                .select {
                    filter {
                        isIn("id", classIds)
                    }
                }
                .decodeList<ClassItem>()

            val teacherIds = classes.mapNotNull { it.teacherId }.distinct()
            val teachers = if (teacherIds.isNotEmpty()) {
                postgrest.from("profiles")
                    .select {
                        filter {
                            isIn("id", teacherIds)
                        }
                    }
                    .decodeList<Profile>()
            } else emptyList()

            val teacherMap = teachers.associateBy { it.id }

            classes.map { cls ->
                val teacherName = cls.teacherId?.let { teacherMap[it]?.fullName } ?: "Docente"
                EnrolledClassItem(
                    id = cls.id,
                    name = cls.name,
                    shortCode = cls.shortCode,
                    teacherName = teacherName
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun joinClassByCode(studentId: String, studentName: String, shortCode: String): Result<Unit> {
        return try {
            val cleanCode = shortCode.trim().uppercase()
            val classes = postgrest.from("classes")
                .select()
                .decodeList<ClassItem>()

            val targetClass = classes.firstOrNull { it.shortCode?.uppercase() == cleanCode }
                ?: return Result.failure(Exception("No se encontró ninguna clase con el código '$cleanCode'"))

            val existing = postgrest.from("class_students")
                .select {
                    filter {
                        eq("class_id", targetClass.id)
                        eq("student_id", studentId)
                    }
                }
                .decodeSingleOrNull<ClassStudent>()

            if (existing != null) {
                return Result.failure(Exception("Ya estás inscrito en esta clase"))
            }

            val newEnrollment = ClassStudent(
                id = java.util.UUID.randomUUID().toString(),
                classId = targetClass.id,
                studentId = studentId,
                studentName = studentName
            )
            postgrest.from("class_students").insert(newEnrollment)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getClassByCode(shortCode: String): Result<ClassItem> {
        return try {
            val clean = shortCode.trim().uppercase()
            val classes = postgrest.from("classes")
                .select()
                .decodeList<ClassItem>()
            val found = classes.firstOrNull {
                it.shortCode?.trim()?.uppercase() == clean ||
                it.code?.trim()?.uppercase() == clean ||
                it.joinCode?.trim()?.uppercase() == clean ||
                it.id.equals(clean, ignoreCase = true) ||
                it.publicToken?.equals(clean, ignoreCase = true) == true
            } ?: return Result.failure(Exception("No se encontró ninguna clase con el código '$clean'"))
            Result.success(found)
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
                .sortedBy { it.studentName ?: "" }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun getClassSessionsWithGrades(classId: String, studentId: String): List<DetailedGradeItem> {
        return try {
            val classStudents = postgrest.from("class_students")
                .select {
                    filter {
                        eq("class_id", classId)
                    }
                }
                .decodeList<ClassStudent>()

            val targetStudent = classStudents.firstOrNull {
                it.id == studentId || it.studentId == studentId || it.dni == studentId
            } ?: return emptyList()

            val sessions = postgrest.from("sessions")
                .select {
                    filter {
                        eq("class_id", classId)
                    }
                }
                .decodeList<ClassSession>()

            val sessionIds = sessions.map { it.id }
            if (sessionIds.isEmpty()) return emptyList()

            val criteria = postgrest.from("session_criteria")
                .select {
                    filter {
                        isIn("session_id", sessionIds)
                    }
                }
                .decodeList<SessionCriteria>()

            val criteriaMap = criteria.associateBy { it.id }
            val sessionMap = sessions.associateBy { it.id }

            val grades = postgrest.from("grades")
                .select {
                    filter {
                        eq("class_student_id", targetStudent.id)
                    }
                }
                .decodeList<Grade>()

            grades.filter { criteriaMap.containsKey(it.criteriaId) }.map { g ->
                val crit = criteriaMap[g.criteriaId]
                val sess = crit?.let { sessionMap[it.sessionId] }
                val cuatrimestreVal = sess?.cuatrimestre ?: (sess?.date?.let { d ->
                    val parts = d.split("-")
                    if (parts.size >= 2 && (parts[1].toIntOrNull() ?: 1) >= 7) 2 else 1
                } ?: 1)
                DetailedGradeItem(
                    criteriaId = g.criteriaId,
                    criteriaName = crit?.name ?: "Evaluación",
                    score = g.score,
                    maxScore = crit?.maxScore ?: 10.0,
                    sessionTitle = sess?.displayTitle ?: "Sesión",
                    date = sess?.date,
                    cuatrimestre = cuatrimestreVal
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun formatDisplayDate(dateStr: String?): String {
        if (dateStr.isNullOrBlank()) return "Sesión"
        return try {
            val parts = dateStr.split("-")
            if (parts.size >= 3) {
                val year = parts[0]
                val month = parts[1].toIntOrNull() ?: 1
                val day = parts[2].toIntOrNull() ?: 1
                val months = listOf("", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre")
                val monthName = if (month in 1..12) months[month] else parts[1]
                "$day de $monthName, $year"
            } else {
                dateStr
            }
        } catch (e: Exception) {
            dateStr
        }
    }

    suspend fun getStudentDaySessions(classId: String, studentId: String): List<DaySessionSummary> {
        return try {
            val individualGrades = getClassSessionsWithGrades(classId, studentId)
            val attendances = getAttendanceHistory(studentId, classId)
            val attendanceMap = attendances.associateBy { it.sessionId }
            val attendanceByDate = attendances.associateBy { it.date }

            val sessions = try {
                postgrest.from("sessions")
                    .select { filter { eq("class_id", classId) } }
                    .decodeList<ClassSession>()
            } catch (e: Exception) {
                emptyList()
            }
            val sessionMap = sessions.associateBy { it.id }

            if (individualGrades.isEmpty()) {
                return attendances.map { att ->
                    val sess = sessionMap[att.sessionId]
                    DaySessionSummary(
                        date = att.date,
                        displayDate = formatDisplayDate(att.date),
                        sessionTitle = sess?.displayTitle ?: "Clase del ${att.date}",
                        cuatrimestre = sess?.cuatrimestre ?: 1,
                        isPresent = att.isPresent,
                        grades = emptyList(),
                        totalScore = 0.0,
                        maxScore = 0.0,
                        percentage = 0.0
                    )
                }.sortedByDescending { it.date ?: "" }
            }

            // Agrupar todas las notas y criterios por la misma fecha / sesión
            val groupedByDate = individualGrades.groupBy { it.date ?: it.sessionTitle ?: "Sin Fecha" }

            val daySummaries = groupedByDate.map { (dateKey, gradesList) ->
                val first = gradesList.first()
                val effectiveDate = first.date
                val attRecord = effectiveDate?.let { attendanceByDate[it] }
                val totalScore = gradesList.sumOf { it.score }
                val maxScore = gradesList.sumOf { it.maxScore }
                val percentage = if (maxScore > 0) (totalScore / maxScore) * 100.0 else 0.0
                val sessionName = first.sessionTitle?.takeIf { it.isNotBlank() } ?: "Sesión $dateKey"

                DaySessionSummary(
                    date = effectiveDate,
                    displayDate = formatDisplayDate(effectiveDate ?: dateKey),
                    sessionTitle = sessionName,
                    cuatrimestre = first.cuatrimestre ?: 1,
                    isPresent = attRecord?.isPresent,
                    grades = gradesList,
                    totalScore = totalScore,
                    maxScore = maxScore,
                    percentage = percentage
                )
            }

            val existingDates = daySummaries.mapNotNull { it.date }.toSet()
            val extraAttendanceDays = attendances.filter { it.date !in existingDates && it.date != "Fecha no disponible" }.map { att ->
                val sess = sessionMap[att.sessionId]
                DaySessionSummary(
                    date = att.date,
                    displayDate = formatDisplayDate(att.date),
                    sessionTitle = sess?.displayTitle ?: "Clase del ${att.date}",
                    cuatrimestre = sess?.cuatrimestre ?: 1,
                    isPresent = att.isPresent,
                    grades = emptyList(),
                    totalScore = 0.0,
                    maxScore = 0.0,
                    percentage = 0.0
                )
            }

            (daySummaries + extraAttendanceDays).sortedByDescending { it.date ?: "" }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun saveGameProgress(
        classStudentId: String,
        gameName: String,
        difficulty: String,
        score: Int,
        earnedCoins: Int
    ): Result<Unit> = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        try {
            val existing = postgrest.from("student_game_progress")
                .select {
                    filter {
                        eq("class_student_id", classStudentId)
                        eq("game_name", gameName)
                        eq("difficulty", difficulty)
                    }
                }
                .decodeSingleOrNull<StudentGameProgress>()

            val nowIso = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.format(java.util.Date())

            if (existing != null) {
                val newHigh = maxOf(existing.highScore, score)
                val newPlayed = existing.totalGamesPlayed + 1
                postgrest.from("student_game_progress")
                    .update(mapOf(
                        "high_score" to newHigh,
                        "total_games_played" to newPlayed,
                        "last_played_at" to nowIso
                    )) {
                        filter {
                            eq("id", existing.id ?: "")
                        }
                    }
            } else {
                val newProgress = StudentGameProgress(
                    id = java.util.UUID.randomUUID().toString(),
                    classStudentId = classStudentId,
                    gameName = gameName,
                    difficulty = difficulty,
                    highScore = score,
                    totalGamesPlayed = 1,
                    lastPlayedAt = nowIso
                )
                postgrest.from("student_game_progress").insert(newProgress)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getStudentGameProgress(classStudentId: String): List<StudentGameProgress> = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        try {
            postgrest.from("student_game_progress")
                .select {
                    filter {
                        eq("class_student_id", classStudentId)
                    }
                }
                .decodeList<StudentGameProgress>()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun getFullClassMatrix(classId: String): FullClassMatrix = coroutineScope {
        try {
            val students = postgrest.from("class_students")
                .select {
                    filter {
                        eq("class_id", classId)
                    }
                }
                .decodeList<ClassStudent>()

            val sessions = postgrest.from("sessions")
                .select {
                    filter {
                        eq("class_id", classId)
                    }
                    order(column = "date", order = io.github.jan.supabase.postgrest.query.Order.ASCENDING)
                }
                .decodeList<ClassSession>()

            val sessionIds = sessions.map { it.id }
            val criteria = if (sessionIds.isNotEmpty()) {
                postgrest.from("session_criteria")
                    .select {
                        filter {
                            isIn("session_id", sessionIds)
                        }
                    }
                    .decodeList<SessionCriteria>()
            } else emptyList()

            val studentIds = students.map { it.id }
            val allGrades = if (studentIds.isNotEmpty()) {
                postgrest.from("grades")
                    .select {
                        filter {
                            isIn("class_student_id", studentIds)
                        }
                    }
                    .decodeList<Grade>()
            } else emptyList()

            val criteriaBySession = criteria.groupBy { it.sessionId }
            val sessionColumns = sessions.map { session ->
                ClassSessionColumn(
                    session = session,
                    criteria = criteriaBySession[session.id] ?: emptyList()
                )
            }.filter { it.criteria.isNotEmpty() }

            val allVisibleCriteria = sessionColumns.flatMap { it.criteria }
            val maxPossibleScore = allVisibleCriteria.sumOf { it.safeMaxScore }

            val gradesByStudent = allGrades.groupBy { it.classStudentId ?: it.studentId ?: "" }

            val rawRows = students.map { student ->
                val sGrades = gradesByStudent[student.id] ?: emptyList()
                val gradeMap = sGrades.associate { it.criteriaId to it.score }
                val totalScore = allVisibleCriteria.sumOf { crit -> gradeMap[crit.id] ?: 0.0 }
                val maxScore = maxPossibleScore
                val pct = if (maxScore > 0) ((totalScore / maxScore) * 100).toInt() else 0
                val level = (totalScore / 10).toInt().coerceAtLeast(1)

                ClassStudentRow(
                    studentId = student.studentId ?: student.id,
                    studentName = student.studentName ?: "Sin nombre",
                    classStudentId = student.id,
                    rank = 1,
                    gradesByCriteriaId = gradeMap,
                    totalScore = totalScore,
                    maxScore = maxScore,
                    percentage = pct,
                    level = level,
                    streak = 0,
                    hp = 100
                )
            }

            val sortedRows = rawRows.sortedByDescending { it.totalScore }.mapIndexed { idx, row ->
                row.copy(rank = idx + 1)
            }

            FullClassMatrix(
                sessionsWithCriteria = sessionColumns,
                allCriteria = allVisibleCriteria,
                studentRows = sortedRows,
                maxPossibleClassScore = maxPossibleScore
            )
        } catch (e: Exception) {
            FullClassMatrix()
        }
    }


    suspend fun getDetailedGrades(studentId: String): List<DetailedGradeItem> {
        return try {
            val classStudentIds = resolveClassStudentIds(studentId)
            if (classStudentIds.isEmpty()) return emptyList()

            val grades = postgrest.from("grades")
                .select { filter { isIn("class_student_id", classStudentIds) } }
                .decodeList<Grade>()

            val criteriaList = try {
                postgrest.from("session_criteria")
                    .select()
                    .decodeList<SessionCriteria>()
            } catch (e: Exception) {
                emptyList()
            }
            val criteriaMap = criteriaList.associateBy { it.id }

            val sessions = try {
                postgrest.from("sessions")
                    .select()
                    .decodeList<ClassSession>()
            } catch (e: Exception) {
                emptyList()
            }
            val sessionsMap = sessions.associateBy { it.id }

            grades.map { g ->
                val crit = criteriaMap[g.criteriaId]
                val session = crit?.let { sessionsMap[it.sessionId] }
                DetailedGradeItem(
                    criteriaId = g.criteriaId,
                    criteriaName = crit?.name ?: "Criterio de Evaluación",
                    score = g.score,
                    maxScore = crit?.maxScore ?: 10.0,
                    sessionTitle = session?.displayTitle ?: "Sesión",
                    date = session?.date,
                    cuatrimestre = session?.cuatrimestre ?: 1
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun getAttendanceHistory(studentId: String, classId: String? = null): List<AttendanceRecord> {
        return try {
            val classStudentIds = resolveClassStudentIds(studentId)
            if (classStudentIds.isEmpty()) return emptyList()

            val attendances = postgrest.from("attendance")
                .select { filter { isIn("class_student_id", classStudentIds) } }
                .decodeList<Attendance>()

            val sessions = try {
                if (classId != null) {
                    postgrest.from("sessions")
                        .select {
                            filter { eq("class_id", classId) }
                            order(column = "date", order = io.github.jan.supabase.postgrest.query.Order.DESCENDING)
                        }
                        .decodeList<ClassSession>()
                } else {
                    postgrest.from("sessions")
                        .select {
                            order(column = "date", order = io.github.jan.supabase.postgrest.query.Order.DESCENDING)
                        }
                        .decodeList<ClassSession>()
                }
            } catch (e: Exception) {
                emptyList()
            }
            val sessionsMap = sessions.associateBy { it.id }
            val attendanceBySession = attendances.associateBy { it.sessionId }

            if (classId != null && sessions.isNotEmpty()) {
                // Return all class sessions with the attendance status for this student
                sessions.map { session ->
                    val att = attendanceBySession[session.id]
                    AttendanceRecord(
                        sessionId = session.id,
                        sessionTitle = session.displayTitle,
                        date = session.date ?: "Fecha no disponible",
                        isPresent = att?.isActuallyPresent == true
                    )
                }
            } else {
                attendances.mapNotNull { att ->
                    val session = sessionsMap[att.sessionId] ?: return@mapNotNull null
                    AttendanceRecord(
                        sessionId = att.sessionId,
                        sessionTitle = session.displayTitle,
                        date = session.date ?: "Fecha no disponible",
                        isPresent = att.isActuallyPresent
                    )
                }.sortedByDescending { it.date }
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun getTutorReportByDni(dni: String): Result<TutorReportData> = coroutineScope {
        try {
            val cleanDni = dni.trim()
            val classStudents = postgrest.from("class_students")
                .select {
                    filter {
                        eq("dni", cleanDni)
                    }
                }
                .decodeList<ClassStudent>()

            if (classStudents.isEmpty()) {
                return@coroutineScope Result.failure(Exception("No se encontró ningún estudiante con el DNI $cleanDni"))
            }

            val studentName = classStudents.first().studentName ?: "Estudiante"
            val classStudentIds = classStudents.map { it.id }
            val classId = classStudents.firstOrNull()?.classId

            // Fetch class info and sessions in parallel
            val classDeferred = async {
                if (classId != null) {
                    try {
                        postgrest.from("classes")
                            .select { filter { eq("id", classId) } }
                            .decodeSingleOrNull<ClassItem>()?.name
                    } catch (e: Exception) { null }
                } else null
            }

            val sessionsDeferred = async {
                try {
                    if (classId != null) {
                        postgrest.from("sessions")
                            .select { filter { eq("class_id", classId) } }
                            .decodeList<ClassSession>()
                    } else {
                        postgrest.from("sessions").select().decodeList<ClassSession>()
                    }
                } catch (e: Exception) { emptyList() }
            }

            val gradesDeferred = async {
                if (classStudentIds.isNotEmpty()) {
                    postgrest.from("grades")
                        .select { filter { isIn("class_student_id", classStudentIds) } }
                        .decodeList<Grade>()
                } else emptyList()
            }

            val attendancesDeferred = async {
                if (classStudentIds.isNotEmpty()) {
                    postgrest.from("attendance")
                        .select { filter { isIn("class_student_id", classStudentIds) } }
                        .decodeList<Attendance>()
                } else emptyList()
            }

            val className = classDeferred.await()
            val sessions = sessionsDeferred.await()
            val rawGrades = gradesDeferred.await()
            val rawAtt = attendancesDeferred.await()

            val sessionIds = sessions.map { it.id }
            val criteria = try {
                if (sessionIds.isNotEmpty()) {
                    postgrest.from("session_criteria")
                        .select { filter { isIn("session_id", sessionIds) } }
                        .decodeList<SessionCriteria>()
                } else emptyList()
            } catch (e: Exception) { emptyList() }

            val critMap = criteria.associateBy { it.id }
            val sessMap = sessions.associateBy { it.id }

            val grades = rawGrades.map { g ->
                val crit = critMap[g.criteriaId]
                val sess = crit?.let { sessMap[it.sessionId] }
                DetailedGradeItem(
                    criteriaId = g.criteriaId,
                    criteriaName = crit?.name ?: "Evaluación",
                    score = g.score,
                    maxScore = crit?.maxScore ?: 10.0,
                    sessionTitle = sess?.displayTitle ?: "Sesión",
                    date = sess?.date,
                    cuatrimestre = sess?.cuatrimestre ?: 1
                )
            }

            val attendances = rawAtt.map { att ->
                val sess = sessMap[att.sessionId]
                AttendanceRecord(
                    sessionId = att.sessionId,
                    sessionTitle = sess?.displayTitle ?: "Sesión",
                    date = sess?.date ?: "Fecha no disponible",
                    isPresent = att.isActuallyPresent
                )
            }.sortedByDescending { it.date }

            val avg = if (grades.isNotEmpty()) grades.map { it.score }.average() else 0.0
            val totalAtt = attendances.size
            val presentCount = attendances.count { it.isPresent }
            val absentCount = totalAtt - presentCount
            val pct = if (totalAtt > 0) (presentCount * 100 / totalAtt) else 100

            Result.success(
                TutorReportData(
                    studentName = studentName,
                    dni = cleanDni,
                    className = className,
                    averageScore = avg,
                    attendancePct = pct,
                    presentCount = presentCount,
                    absentCount = absentCount,
                    grades = grades,
                    attendances = attendances
                )
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getGlobalRanking(): List<RankingStudent> {
        return try {
            val classStudents = postgrest.from("class_students")
                .select()
                .decodeList<ClassStudent>()

            val allGrades = postgrest.from("grades")
                .select()
                .decodeList<Grade>()

            val allAttendance = postgrest.from("attendance")
                .select()
                .decodeList<Attendance>()

            val gradesByStudent = allGrades.groupBy { it.classStudentId }
            val attendanceByStudent = allAttendance.groupBy { it.classStudentId }

            val ranked = classStudents.mapNotNull { cs ->
                val id = cs.id
                val name = cs.studentName ?: "Estudiante"
                val studentGrades = gradesByStudent[id] ?: emptyList()
                val studentAtt = attendanceByStudent[id] ?: emptyList()

                val totalPts = studentGrades.sumOf { it.score }
                val attCount = studentAtt.count { it.isActuallyPresent }
                val absCount = studentAtt.count { !it.isActuallyPresent }
                val streak = studentAtt.takeLastWhile { it.isActuallyPresent }.size

                val stats = GamificationEngine.calculate(
                    totalGradePoints = totalPts,
                    attendedCount = attCount,
                    absenceCount = absCount,
                    streakCount = streak
                )

                RankingStudent(
                    id = id,
                    name = name,
                    xp = stats.xp,
                    level = stats.currentLevel,
                    rankName = stats.rankName,
                    rankPosition = 0,
                    streak = streak
                )
            }
            .sortedByDescending { it.xp }
            .mapIndexed { index, student ->
                student.copy(rankPosition = index + 1)
            }

            ranked
        } catch (e: Exception) {
            emptyList()
        }
    }
}
