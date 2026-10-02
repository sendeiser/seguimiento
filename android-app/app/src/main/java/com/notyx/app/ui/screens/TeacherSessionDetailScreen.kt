package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notyx.app.data.models.Attendance
import com.notyx.app.data.models.ClassStudent
import com.notyx.app.data.models.Grade
import com.notyx.app.data.models.SessionCriteria
import com.notyx.app.data.repository.TeacherRepository
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherSessionDetailScreen(
    sessionId: String,
    classId: String,
    sessionDate: String,
    cuatrimestre: Int,
    className: String,
    teacherRepository: TeacherRepository,
    onBack: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Calificaciones", "Asistencia")

    var currentSessionId by remember { mutableStateOf(sessionId) }
    var currentSessionDate by remember { mutableStateOf(sessionDate) }
    var currentCuatrimestre by remember { mutableIntStateOf(cuatrimestre) }
    var classSessions by remember { mutableStateOf<List<com.notyx.app.data.models.ClassSession>>(emptyList()) }
    var showSessionPickerDialog by remember { mutableStateOf(false) }

    var students by remember { mutableStateOf<List<ClassStudent>>(emptyList()) }
    var criteriaList by remember { mutableStateOf<List<SessionCriteria>>(emptyList()) }
    var grades by remember { mutableStateOf<List<Grade>>(emptyList()) }
    var attendances by remember { mutableStateOf<List<Attendance>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isPreloadingBaseCriteria by remember { mutableStateOf(false) }

    // Dialogs
    var showNewCriteriaDialog by remember { mutableStateOf(false) }
    var editingCriteria by remember { mutableStateOf<SessionCriteria?>(null) }
    var deletingCriteria by remember { mutableStateOf<SessionCriteria?>(null) }
    var isDeletingCriteria by remember { mutableStateOf(false) }

    var editingGradeInfo by remember { mutableStateOf<Triple<ClassStudent, SessionCriteria, Double?>?>(null) }
    var studentForBulkGrade by remember { mutableStateOf<ClassStudent?>(null) }
    var showClassBulkGradeDialog by remember { mutableStateOf(false) }

    // Search and filters
    var gradeSearchQuery by remember { mutableStateOf("") }
    var attendanceSearchQuery by remember { mutableStateOf("") }
    var attendanceStatusFilter by remember { mutableStateOf("all") } // "all", "present", "absent", "unrecorded"

    val scope = rememberCoroutineScope()

    val refreshData: (Boolean) -> Unit = { showLoading ->
        scope.launch {
            if (showLoading) isLoading = true
            val sessList = teacherRepository.getClassSessions(classId)
            classSessions = sessList
            students = teacherRepository.getClassStudents(classId)
            criteriaList = teacherRepository.getSessionCriteria(currentSessionId)
            grades = teacherRepository.getSessionGrades(currentSessionId)
            attendances = teacherRepository.getAttendanceForSession(currentSessionId)
            if (showLoading) isLoading = false
        }
    }

    LaunchedEffect(currentSessionId) {
        refreshData(true)
    }

    // Helper para actualizar notas en memoria de forma instantánea (0ms de latencia visual)
    val updateGradesLocally: (studentId: String, critIds: List<String>, score: Double) -> Unit = { sId, cIds, scoreVal ->
        val cIdSet = cIds.toSet()
        val updated = grades.filterNot { it.classStudentId == sId && it.criteriaId in cIdSet }.toMutableList()
        cIds.forEach { cId ->
            updated.add(
                Grade(
                    id = "temp_${System.currentTimeMillis()}_${sId}_$cId",
                    classStudentId = sId,
                    criteriaId = cId,
                    score = scoreVal
                )
            )
        }
        grades = updated
    }

    val updateClassGradeLocally: (critId: String, studentIds: List<String>, score: Double) -> Unit = { cId, sIds, scoreVal ->
        val sIdSet = sIds.toSet()
        val updated = grades.filterNot { it.criteriaId == cId && it.classStudentId in sIdSet }.toMutableList()
        sIds.forEach { sId ->
            updated.add(
                Grade(
                    id = "temp_${System.currentTimeMillis()}_${sId}_$cId",
                    classStudentId = sId,
                    criteriaId = cId,
                    score = scoreVal
                )
            )
        }
        grades = updated
    }

    val preloadBaseCriteriaAction = {
        scope.launch {
            isPreloadingBaseCriteria = true
            teacherRepository.preloadSessionBaseCriteria(currentSessionId)
            isPreloadingBaseCriteria = false
            refreshData(false)
        }
    }

    // Modal: Selector de Sesión / Fecha
    if (showSessionPickerDialog) {
        AlertDialog(
            onDismissRequest = { showSessionPickerDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.CalendarMonth, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Cambiar Sesión de Clase", fontWeight = FontWeight.Black, fontSize = 18.sp)
                }
            },
            text = {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 350.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(items = classSessions.sortedByDescending { it.date ?: "" }) { sess ->
                        val isCurr = sess.id == currentSessionId
                        Surface(
                            onClick = {
                                currentSessionId = sess.id
                                currentSessionDate = sess.date ?: ""
                                currentCuatrimestre = sess.cuatrimestre ?: 1
                                showSessionPickerDialog = false
                            },
                            shape = RoundedCornerShape(12.dp),
                            color = if (isCurr) PrimaryIndigo else Color(0xFFF8FAFC),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (isCurr) PrimaryIndigo else Color(0xFFE2E8F0)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "Sesión ${sess.date ?: "Sin fecha"}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = if (isCurr) Color.White else TextPrimary
                                    )
                                    Text(
                                        text = "${sess.cuatrimestre ?: 1}° Cuatrimestre",
                                        fontSize = 11.sp,
                                        color = if (isCurr) Color.White.copy(alpha = 0.8f) else TextSecondary
                                    )
                                }
                                if (isCurr) {
                                    Icon(Icons.Rounded.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showSessionPickerDialog = false }) {
                    Text("Cerrar", color = PrimaryIndigo, fontWeight = FontWeight.Bold)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Nuevo Criterio de Evaluación
    if (showNewCriteriaDialog) {
        var criteriaName by remember { mutableStateOf("") }
        var maxScoreText by remember { mutableStateOf("10") }
        var isSubmitting by remember { mutableStateOf(false) }
        var createError by remember { mutableStateOf<String?>(null) }

        val presetNames = listOf("Participación", "Actividades", "Carpeta", "Conducta", "Examen", "Trabajo Práctico")

        AlertDialog(
            onDismissRequest = { if (!isSubmitting) showNewCriteriaDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.AddCircleOutline, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Nuevo Criterio de Evaluación",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text(
                        text = "Definí el aspecto a calificar en esta sesión.",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )

                    // Presets de nombres
                    Column {
                        Text(
                            text = "Sugerencias rápidas:",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(presetNames) { preset ->
                                Surface(
                                    onClick = { criteriaName = preset },
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (criteriaName == preset) PrimaryIndigo else Color(0xFFF1F5F9),
                                    border = if (criteriaName == preset) null else androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFCBD5E1))
                                ) {
                                    Text(
                                        text = preset,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (criteriaName == preset) Color.White else TextPrimary,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                    }

                    OutlinedTextField(
                        value = criteriaName,
                        onValueChange = { criteriaName = it },
                        label = { Text("Nombre del Criterio") },
                        placeholder = { Text("Ej: Trabajo Práctico 1") },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = maxScoreText,
                        onValueChange = { maxScoreText = it },
                        label = { Text("Puntaje Máximo") },
                        placeholder = { Text("10") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (createError != null) {
                        Text(
                            text = createError ?: "",
                            fontSize = 12.sp,
                            color = StatusError,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val maxScore = maxScoreText.toDoubleOrNull() ?: 10.0
                        if (criteriaName.isNotBlank()) {
                            isSubmitting = true
                            createError = null
                            scope.launch {
                                val res = teacherRepository.createSessionCriteria(currentSessionId, criteriaName, maxScore)
                                isSubmitting = false
                                if (res.isSuccess) {
                                    showNewCriteriaDialog = false
                                    refreshData(false)
                                } else {
                                    createError = res.exceptionOrNull()?.message ?: "Error al guardar el criterio"
                                }
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = !isSubmitting && criteriaName.isNotBlank()
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Crear Criterio", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showNewCriteriaDialog = false },
                    enabled = !isSubmitting
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Modificar Criterio
    editingCriteria?.let { crit ->
        var editName by remember { mutableStateOf(crit.name) }
        var editMaxScoreText by remember { mutableStateOf(crit.safeMaxScore.toInt().toString()) }
        var isUpdatingCrit by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { if (!isUpdatingCrit) editingCriteria = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Edit, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Modificar Criterio", fontWeight = FontWeight.Black, fontSize = 18.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text(
                        text = "Editá el nombre o puntaje máximo para este criterio.",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )

                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        label = { Text("Nombre del Criterio") },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = editMaxScoreText,
                        onValueChange = { editMaxScoreText = it },
                        label = { Text("Puntaje Máximo") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val maxScore = editMaxScoreText.toDoubleOrNull() ?: 10.0
                        if (editName.isNotBlank()) {
                            isUpdatingCrit = true
                            scope.launch {
                                teacherRepository.updateSessionCriteria(crit.id, editName, maxScore)
                                isUpdatingCrit = false
                                editingCriteria = null
                                refreshData(false)
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = !isUpdatingCrit && editName.isNotBlank()
                ) {
                    if (isUpdatingCrit) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Guardar Cambios", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { editingCriteria = null },
                    enabled = !isUpdatingCrit
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Confirmar Eliminación de Criterio
    deletingCriteria?.let { crit ->
        AlertDialog(
            onDismissRequest = { if (!isDeletingCriteria) deletingCriteria = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.WarningAmber, contentDescription = null, tint = StatusError)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("¿Eliminar Criterio?", fontWeight = FontWeight.Black, fontSize = 18.sp, color = StatusError)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Estás a punto de eliminar '${crit.name}'.",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Esta acción borrará permanentemente todas las calificaciones que los alumnos recibieron en este criterio.",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isDeletingCriteria = true
                        scope.launch {
                            teacherRepository.deleteSessionCriteria(crit.id)
                            isDeletingCriteria = false
                            deletingCriteria = null
                            refreshData(false)
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = StatusError),
                    enabled = !isDeletingCriteria
                ) {
                    if (isDeletingCriteria) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Eliminar Criterio", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { deletingCriteria = null },
                    enabled = !isDeletingCriteria
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Calificar Alumno con Presets Rápidos y Opción Multi-Criterio (ACTUALIZACIÓN INSTANTÁNEA OPTIMISTA)
    editingGradeInfo?.let { (student, crit, currentScore) ->
        var scoreInput by remember { mutableStateOf(currentScore?.let { if (it % 1.0 == 0.0) it.toInt().toString() else it.toString() } ?: "") }
        var applyToAllCriteria by remember { mutableStateOf(false) }
        val scorePresets = listOf(10, 9, 8, 7, 6, 5, 4, 1)

        AlertDialog(
            onDismissRequest = { editingGradeInfo = null },
            title = {
                Text(
                    text = "Calificar Alumno",
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = student.studentName ?: "Estudiante",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "Criterio: ${crit.name} (Máx: ${crit.safeMaxScore.toInt()} pts)",
                        fontSize = 13.sp,
                        color = PrimaryIndigo,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    // Presets de notas rápidas
                    Text(
                        text = "Notas rápidas:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSecondary
                    )
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(scorePresets) { preset ->
                            val isSelected = scoreInput == preset.toString() || scoreInput == "${preset}.0"
                            Surface(
                                modifier = Modifier.clickable {
                                    scoreInput = preset.toString()
                                },
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) PrimaryIndigo else Color(0xFFF1F5F9),
                                border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFCBD5E1))
                            ) {
                                Text(
                                    text = preset.toString(),
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp,
                                    color = if (isSelected) Color.White else TextPrimary,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    OutlinedTextField(
                        value = scoreInput,
                        onValueChange = { scoreInput = it },
                        label = { Text("Nota (0 - ${crit.safeMaxScore.toInt()})") },
                        placeholder = { Text("Ej: 8.5") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (criteriaList.size > 1) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { applyToAllCriteria = !applyToAllCriteria }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = applyToAllCriteria,
                                onCheckedChange = { applyToAllCriteria = it }
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Aplicar esta nota a los ${criteriaList.size} criterios de este alumno",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = PrimaryIndigo
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val score = scoreInput.toDoubleOrNull()
                        if (score != null && score in 0.0..crit.safeMaxScore) {
                            if (applyToAllCriteria && criteriaList.size > 1) {
                                val critIds = criteriaList.map { it.id }
                                updateGradesLocally(student.id, critIds, score)
                                editingGradeInfo = null
                                scope.launch {
                                    teacherRepository.saveAllCriteriaGradesForStudent(
                                        student.id,
                                        critIds,
                                        score
                                    )
                                }
                            } else {
                                updateGradesLocally(student.id, listOf(crit.id), score)
                                editingGradeInfo = null
                                scope.launch {
                                    teacherRepository.saveGrade(student.id, crit.id, score)
                                }
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = scoreInput.toDoubleOrNull() != null
                ) {
                    Text(
                        if (applyToAllCriteria) "Guardar a Todos (${criteriaList.size})" else "Guardar Nota",
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { editingGradeInfo = null }
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Calificación Rápida a Todos los Criterios de un Alumno (1 Tap - Optimista Instantáneo)
    studentForBulkGrade?.let { student ->
        var bulkScoreInput by remember { mutableStateOf("10") }
        val scorePresets = listOf(10, 9, 8, 7, 6, 5, 4, 1)

        AlertDialog(
            onDismissRequest = { studentForBulkGrade = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Bolt, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Misma Nota a Todos los Criterios",
                        fontWeight = FontWeight.Black,
                        fontSize = 17.sp
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = student.studentName ?: "Estudiante",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "Tocá una nota para asignarla inmediatamente a los ${criteriaList.size} criterios de este alumno:",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )

                    // Presets rápidos directos
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        scorePresets.take(4).forEach { preset ->
                            Button(
                                onClick = {
                                    val score = preset.toDouble()
                                    val critIds = criteriaList.map { it.id }
                                    updateGradesLocally(student.id, critIds, score)
                                    studentForBulkGrade = null
                                    scope.launch {
                                        teacherRepository.saveAllCriteriaGradesForStudent(
                                            student.id,
                                            critIds,
                                            score
                                        )
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (preset >= 7) Color(0xFF16A34A) else if (preset >= 6) Color(0xFFD97706) else Color(0xFFDC2626)
                                ),
                                contentPadding = PaddingValues(vertical = 10.dp)
                            ) {
                                Text(preset.toString(), fontWeight = FontWeight.Black, fontSize = 16.sp)
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        scorePresets.drop(4).forEach { preset ->
                            Button(
                                onClick = {
                                    val score = preset.toDouble()
                                    val critIds = criteriaList.map { it.id }
                                    updateGradesLocally(student.id, critIds, score)
                                    studentForBulkGrade = null
                                    scope.launch {
                                        teacherRepository.saveAllCriteriaGradesForStudent(
                                            student.id,
                                            critIds,
                                            score
                                        )
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (preset >= 6) Color(0xFFD97706) else Color(0xFFDC2626)
                                ),
                                contentPadding = PaddingValues(vertical = 10.dp)
                            ) {
                                Text(preset.toString(), fontWeight = FontWeight.Black, fontSize = 16.sp)
                            }
                        }
                    }

                    OutlinedTextField(
                        value = bulkScoreInput,
                        onValueChange = { bulkScoreInput = it },
                        label = { Text("O ingresar otra nota") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val score = bulkScoreInput.toDoubleOrNull()
                        if (score != null && score in 0.0..10.0) {
                            val critIds = criteriaList.map { it.id }
                            updateGradesLocally(student.id, critIds, score)
                            studentForBulkGrade = null
                            scope.launch {
                                teacherRepository.saveAllCriteriaGradesForStudent(
                                    student.id,
                                    critIds,
                                    score
                                )
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = bulkScoreInput.toDoubleOrNull() != null
                ) {
                    Text("Aplicar Nota", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { studentForBulkGrade = null }
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Calificar Criterio a Toda la Clase (Optimista Instantáneo)
    if (showClassBulkGradeDialog && criteriaList.isNotEmpty()) {
        var selectedCritId by remember { mutableStateOf(criteriaList.first().id) }
        var bulkScoreInput by remember { mutableStateOf("10") }
        val scorePresets = listOf(10, 9, 8, 7, 6, 5, 4, 1)

        AlertDialog(
            onDismissRequest = { showClassBulkGradeDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Groups, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Calificar Criterio a Toda la Clase",
                        fontWeight = FontWeight.Black,
                        fontSize = 17.sp
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Seleccioná el criterio a calificar:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(items = criteriaList, key = { it.id }) { crit ->
                            val isSel = crit.id == selectedCritId
                            Surface(
                                modifier = Modifier.clickable { selectedCritId = crit.id },
                                shape = RoundedCornerShape(10.dp),
                                color = if (isSel) PrimaryIndigo else Color(0xFFF1F5F9),
                                border = if (isSel) null else androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFCBD5E1))
                            ) {
                                Text(
                                    text = crit.name,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSel) Color.White else TextPrimary,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }

                    Text(
                        text = "Nota a asignar a los ${students.size} alumnos:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(scorePresets) { preset ->
                            val isSel = bulkScoreInput == preset.toString()
                            Surface(
                                modifier = Modifier.clickable { bulkScoreInput = preset.toString() },
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSel) PrimaryIndigo else Color(0xFFF1F5F9)
                            ) {
                                Text(
                                    text = preset.toString(),
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp,
                                    color = if (isSel) Color.White else TextPrimary,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = bulkScoreInput,
                        onValueChange = { bulkScoreInput = it },
                        label = { Text("Nota") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val score = bulkScoreInput.toDoubleOrNull()
                        if (score != null && score in 0.0..10.0) {
                            val studentIds = students.map { it.id }
                            updateClassGradeLocally(selectedCritId, studentIds, score)
                            showClassBulkGradeDialog = false
                            scope.launch {
                                teacherRepository.saveCriteriaGradeForClass(
                                    selectedCritId,
                                    studentIds,
                                    score
                                )
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = bulkScoreInput.toDoubleOrNull() != null
                ) {
                    Text("Calificar Toda la Clase", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showClassBulkGradeDialog = false }
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "Volver",
                            tint = TextPrimary
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(end = 4.dp)
                    ) {
                        Text(
                            text = "Sesión $currentSessionDate",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = className,
                                fontSize = 12.sp,
                                color = TextSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )
                            Surface(
                                color = Color(0xFFEFF6FF),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "$currentCuatrimestre° Cuat.",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = PrimaryIndigo,
                                    maxLines = 1,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    // Navigation buttons between sessions
                    val sortedSessions = remember(classSessions) { classSessions.sortedBy { it.date ?: "" } }
                    val currentIndex = sortedSessions.indexOfFirst { it.id == currentSessionId }
                    val prevSession = if (currentIndex > 0) sortedSessions[currentIndex - 1] else null
                    val nextSession = if (currentIndex >= 0 && currentIndex < sortedSessions.size - 1) sortedSessions[currentIndex + 1] else null

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        IconButton(
                            onClick = {
                                prevSession?.let {
                                    currentSessionId = it.id
                                    currentSessionDate = it.date ?: ""
                                    currentCuatrimestre = it.cuatrimestre ?: 1
                                }
                            },
                            enabled = prevSession != null,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.Rounded.ChevronLeft,
                                contentDescription = "Sesión anterior",
                                tint = if (prevSession != null) TextPrimary else TextSecondary.copy(alpha = 0.3f),
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        IconButton(
                            onClick = { showSessionPickerDialog = true },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.Rounded.CalendarMonth,
                                contentDescription = "Elegir fecha",
                                tint = PrimaryIndigo,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        IconButton(
                            onClick = {
                                nextSession?.let {
                                    currentSessionId = it.id
                                    currentSessionDate = it.date ?: ""
                                    currentCuatrimestre = it.cuatrimestre ?: 1
                                }
                            },
                            enabled = nextSession != null,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.Rounded.ChevronRight,
                                contentDescription = "Sesión siguiente",
                                tint = if (nextSession != null) TextPrimary else TextSecondary.copy(alpha = 0.3f),
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }

                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.White,
                    contentColor = PrimaryIndigo
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            text = {
                                Text(
                                    text = title,
                                    fontSize = 14.sp,
                                    fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        )
                    }
                }
            }
        },
        containerColor = BgLightSecondary
    ) { padding ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = PrimaryIndigo)
            }
        } else {
            when (selectedTab) {
                0 -> {
                    // TAB 0: CALIFICACIONES Y CRITERIOS
                    val filteredStudentsForGrading = remember(students, gradeSearchQuery) {
                        if (gradeSearchQuery.isBlank()) {
                            students
                        } else {
                            students.filter {
                                val name = it.studentName ?: ""
                                val dni = it.dni ?: ""
                                name.contains(gradeSearchQuery, ignoreCase = true) || dni.contains(gradeSearchQuery)
                            }
                        }
                    }

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        contentPadding = PaddingValues(vertical = 16.dp)
                    ) {
                        // Action: Add Criteria
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Criterios Evaluados (${criteriaList.size})",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    if (criteriaList.isEmpty()) {
                                        OutlinedButton(
                                            onClick = { preloadBaseCriteriaAction() },
                                            enabled = !isPreloadingBaseCriteria,
                                            shape = RoundedCornerShape(12.dp),
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                        ) {
                                            if (isPreloadingBaseCriteria) {
                                                CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                                            } else {
                                                Icon(Icons.Rounded.Bolt, contentDescription = null, modifier = Modifier.size(16.dp), tint = PrimaryIndigo)
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Criterios Base", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryIndigo)
                                            }
                                        }
                                    }
                                    Button(
                                        onClick = { showNewCriteriaDialog = true },
                                        shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                    ) {
                                        Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Nuevo Criterio", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }

                        // Criteria chips with Edit/Delete actions
                        if (criteriaList.isNotEmpty()) {
                            item {
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    items(items = criteriaList, key = { it.id }) { crit ->
                                        Surface(
                                            color = Color(0xFFEFF6FF),
                                            shape = RoundedCornerShape(12.dp),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryIndigo.copy(alpha = 0.25f))
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(start = 10.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    text = "${crit.name} (Máx: ${crit.safeMaxScore.toInt()})",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = PrimaryIndigo
                                                )
                                                Spacer(modifier = Modifier.width(4.dp))
                                                IconButton(
                                                    onClick = { editingCriteria = crit },
                                                    modifier = Modifier.size(24.dp)
                                                ) {
                                                    Icon(
                                                        Icons.Rounded.Edit,
                                                        contentDescription = "Editar",
                                                        tint = PrimaryIndigo,
                                                        modifier = Modifier.size(14.dp)
                                                    )
                                                }
                                                IconButton(
                                                    onClick = { deletingCriteria = crit },
                                                    modifier = Modifier.size(24.dp)
                                                ) {
                                                    Icon(
                                                        Icons.Rounded.Close,
                                                        contentDescription = "Eliminar",
                                                        tint = StatusError,
                                                        modifier = Modifier.size(14.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (criteriaList.isEmpty()) {
                            item {
                                Card(
                                    shape = RoundedCornerShape(20.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(
                                        modifier = Modifier.padding(24.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(
                                            text = "Sin criterios de evaluación todavía",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = TextPrimary
                                        )
                                        Text(
                                            text = "Podés precargar los 4 criterios base estándar (Participación, Actividades, Carpeta, Conducta) o crear criterios personalizados.",
                                            fontSize = 12.sp,
                                            color = TextSecondary,
                                            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
                                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                        )
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Button(
                                                onClick = { preloadBaseCriteriaAction() },
                                                shape = RoundedCornerShape(12.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                                                enabled = !isPreloadingBaseCriteria
                                            ) {
                                                if (isPreloadingBaseCriteria) {
                                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                                                } else {
                                                    Icon(Icons.Rounded.Bolt, contentDescription = null, modifier = Modifier.size(16.dp))
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Text("Cargar Criterios Base", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                                }
                                            }

                                            OutlinedButton(
                                                onClick = { showNewCriteriaDialog = true },
                                                shape = RoundedCornerShape(12.dp)
                                            ) {
                                                Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(16.dp), tint = PrimaryIndigo)
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Personalizado", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = PrimaryIndigo)
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            item {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Alumnos (${students.size})",
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                        if (criteriaList.isNotEmpty() && students.isNotEmpty()) {
                                            FilledTonalButton(
                                                onClick = { showClassBulkGradeDialog = true },
                                                shape = RoundedCornerShape(10.dp),
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                                colors = ButtonDefaults.filledTonalButtonColors(containerColor = Color(0xFFEFF6FF))
                                            ) {
                                                Icon(Icons.Rounded.Groups, contentDescription = null, tint = PrimaryIndigo, modifier = Modifier.size(14.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Calificar Toda la Clase", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = PrimaryIndigo)
                                            }
                                        }
                                    }

                                    OutlinedTextField(
                                        value = gradeSearchQuery,
                                        onValueChange = { gradeSearchQuery = it },
                                        placeholder = { Text("Buscar alumno a calificar...") },
                                        leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = TextSecondary) },
                                        singleLine = true,
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            }

                            if (filteredStudentsForGrading.isEmpty()) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 30.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("No se encontraron alumnos.", color = TextSecondary, fontSize = 13.sp)
                                    }
                                }
                            } else {
                                items(items = filteredStudentsForGrading, key = { it.id }) { student ->
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(18.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
                                    ) {
                                        Column(modifier = Modifier.padding(16.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(36.dp)
                                                        .clip(CircleShape)
                                                        .background(PrimaryIndigo.copy(alpha = 0.12f)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(
                                                        text = (student.studentName?.firstOrNull() ?: 'E').uppercase(),
                                                        fontSize = 14.sp,
                                                        fontWeight = FontWeight.Black,
                                                        color = PrimaryIndigo
                                                    )
                                                }

                                                Spacer(modifier = Modifier.width(10.dp))

                                                Column(modifier = Modifier.weight(1f)) {
                                                    Text(
                                                        text = student.studentName ?: "Estudiante",
                                                        fontSize = 14.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = TextPrimary
                                                    )
                                                    student.dni?.let {
                                                        Text(text = "DNI: $it", fontSize = 11.sp, color = TextSecondary)
                                                    }
                                                }

                                                if (criteriaList.isNotEmpty()) {
                                                    FilledTonalButton(
                                                        onClick = { studentForBulkGrade = student },
                                                        shape = RoundedCornerShape(10.dp),
                                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                                        colors = ButtonDefaults.filledTonalButtonColors(containerColor = Color(0xFFEEF2FF))
                                                    ) {
                                                        Icon(Icons.Rounded.Bolt, contentDescription = null, tint = PrimaryIndigo, modifier = Modifier.size(14.dp))
                                                        Spacer(modifier = Modifier.width(4.dp))
                                                        Text("Misma nota (${criteriaList.size})", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = PrimaryIndigo)
                                                    }
                                                }
                                            }

                                            Spacer(modifier = Modifier.height(12.dp))
                                            HorizontalDivider(color = BorderLight)
                                            Spacer(modifier = Modifier.height(10.dp))

                                            // Criteria score rows for this student
                                            criteriaList.forEach { crit ->
                                                val gradeRecord = grades.firstOrNull {
                                                    it.classStudentId == student.id && it.criteriaId == crit.id
                                                }
                                                val currentScore = gradeRecord?.score

                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .clickable {
                                                            editingGradeInfo = Triple(student, crit, currentScore)
                                                        }
                                                        .padding(vertical = 6.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(
                                                        text = crit.name,
                                                        fontSize = 13.sp,
                                                        color = TextPrimary,
                                                        modifier = Modifier.weight(1f)
                                                    )

                                                    Surface(
                                                        color = when {
                                                            currentScore == null -> Color(0xFFF1F5F9)
                                                            currentScore >= 6.0 -> Color(0xFFDCFCE7)
                                                            else -> Color(0xFFFEE2E2)
                                                        },
                                                        shape = RoundedCornerShape(8.dp)
                                                    ) {
                                                        Text(
                                                            text = if (currentScore != null) String.format("%.1f", currentScore) else "Sin calificar",
                                                            fontSize = 12.sp,
                                                            fontWeight = FontWeight.Black,
                                                            color = when {
                                                                currentScore == null -> Color(0xFF64748B)
                                                                currentScore >= 6.0 -> Color(0xFF166534)
                                                                else -> Color(0xFF991B1B)
                                                            },
                                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                1 -> {
                    // TAB 1: ASISTENCIA DE LA SESIÓN
                    val presentCount = attendances.count { it.isActuallyPresent }
                    val absentCount = attendances.count { it.isExplicitlyAbsent }
                    val unrecordedCount = maxOf(0, students.size - (presentCount + absentCount))
                    val totalStudents = students.size
                    val pct = if (totalStudents > 0) (presentCount * 100 / totalStudents) else 0

                    val filteredAttendanceStudents = remember(students, attendanceSearchQuery, attendanceStatusFilter, attendances) {
                        students.filter { student ->
                            val name = student.studentName ?: ""
                            val dni = student.dni ?: ""
                            val matchesQuery = attendanceSearchQuery.isBlank() || name.contains(attendanceSearchQuery, ignoreCase = true) || dni.contains(attendanceSearchQuery)

                            val attRecord = attendances.firstOrNull { it.classStudentId == student.id }
                            val matchesStatus = when (attendanceStatusFilter) {
                                "present" -> attRecord?.isActuallyPresent == true
                                "absent" -> attRecord?.isExplicitlyAbsent == true
                                "unrecorded" -> attRecord == null || (!attRecord.isActuallyPresent && !attRecord.isExplicitlyAbsent)
                                else -> true
                            }

                            matchesQuery && matchesStatus
                        }
                    }

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(vertical = 14.dp)
                    ) {
                        item {
                            Card(
                                shape = RoundedCornerShape(22.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(18.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f, fill = false)) {
                                            Text(
                                                text = "Asistencia de la Sesión",
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.Black,
                                                color = TextPrimary
                                            )
                                            Text(
                                                text = "Fecha: $currentSessionDate • $currentCuatrimestre° Cuatrimestre",
                                                fontSize = 12.sp,
                                                color = TextSecondary,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }

                                        Surface(
                                            color = if (pct >= 75) StatusSuccessBg else StatusWarningBg,
                                            shape = RoundedCornerShape(12.dp),
                                            border = androidx.compose.foundation.BorderStroke(
                                                1.dp,
                                                if (pct >= 75) StatusSuccessBorder else StatusWarningBorder
                                            )
                                        ) {
                                            Text(
                                                text = "$pct%",
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.Black,
                                                color = if (pct >= 75) StatusSuccess else StatusWarning,
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(14.dp))

                                    // Metric breakdown chips
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Surface(
                                            color = StatusSuccessBg,
                                            shape = RoundedCornerShape(10.dp),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, StatusSuccessBorder),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(vertical = 8.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text("$presentCount", fontSize = 16.sp, fontWeight = FontWeight.Black, color = StatusSuccess)
                                                Text("Presentes", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = StatusSuccess)
                                            }
                                        }

                                        Surface(
                                            color = StatusErrorBg,
                                            shape = RoundedCornerShape(10.dp),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, StatusErrorBorder),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(vertical = 8.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text("$absentCount", fontSize = 16.sp, fontWeight = FontWeight.Black, color = StatusError)
                                                Text("Ausentes", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = StatusError)
                                            }
                                        }

                                        Surface(
                                            color = StatusNeutralBg,
                                            shape = RoundedCornerShape(10.dp),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, StatusNeutralBorder),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(vertical = 8.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text("$unrecordedCount", fontSize = 16.sp, fontWeight = FontWeight.Black, color = StatusNeutral)
                                                Text("Sin registrar", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = StatusNeutral)
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(14.dp))

                                    // Quick actions: Presentes / Ausentes (Instantáneo)
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Button(
                                            onClick = {
                                                val studentIds = students.map { it.id }
                                                val updated = studentIds.map { sId ->
                                                    Attendance(
                                                        id = "temp_att_${System.currentTimeMillis()}_$sId",
                                                        classStudentId = sId,
                                                        sessionId = currentSessionId,
                                                        status = "present"
                                                    )
                                                }
                                                attendances = updated
                                                scope.launch {
                                                    teacherRepository.markAllPresent(currentSessionId, studentIds)
                                                }
                                            },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = Color(0xFFDCFCE7),
                                                contentColor = Color(0xFF15803D)
                                            ),
                                            contentPadding = PaddingValues(vertical = 8.dp)
                                        ) {
                                            Icon(Icons.Rounded.DoneAll, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Todos Presentes", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        }

                                        Button(
                                            onClick = {
                                                val studentIds = students.map { it.id }
                                                val updated = studentIds.map { sId ->
                                                    Attendance(
                                                        id = "temp_att_${System.currentTimeMillis()}_$sId",
                                                        classStudentId = sId,
                                                        sessionId = currentSessionId,
                                                        status = "absent"
                                                    )
                                                }
                                                attendances = updated
                                                scope.launch {
                                                    teacherRepository.markAllAbsent(currentSessionId, studentIds)
                                                }
                                            },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = Color(0xFFFEE2E2),
                                                contentColor = Color(0xFFB91C1C)
                                            ),
                                            contentPadding = PaddingValues(vertical = 8.dp)
                                        ) {
                                            Icon(Icons.Rounded.RemoveDone, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Todos Ausentes", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        }
                                    }
                                }
                            }
                        }

                        // Search and filter
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    value = attendanceSearchQuery,
                                    onValueChange = { attendanceSearchQuery = it },
                                    placeholder = { Text("Buscar alumno en la lista...") },
                                    leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = TextSecondary) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    listOf(
                                        "Todos" to "all",
                                        "Presentes" to "present",
                                        "Ausentes" to "absent",
                                        "Sin registrar" to "unrecorded"
                                    ).forEach { (label, filterVal) ->
                                        val isSel = attendanceStatusFilter == filterVal
                                        Surface(
                                            onClick = { attendanceStatusFilter = filterVal },
                                            shape = RoundedCornerShape(8.dp),
                                            color = if (isSel) PrimaryIndigo else Color.White,
                                            border = androidx.compose.foundation.BorderStroke(1.dp, if (isSel) PrimaryIndigo else Color(0xFFE2E8F0))
                                        ) {
                                            Text(
                                                text = label,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isSel) Color.White else TextPrimary,
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        if (filteredAttendanceStudents.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 30.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("No se encontraron alumnos con este filtro.", color = TextSecondary, fontSize = 13.sp)
                                }
                            }
                        } else {
                            items(items = filteredAttendanceStudents, key = { it.id }) { student ->
                                val attRecord = attendances.firstOrNull { it.classStudentId == student.id }
                                val state = when {
                                    attRecord == null -> "unrecorded"
                                    attRecord.isActuallyPresent -> "present"
                                    attRecord.isExplicitlyAbsent -> "absent"
                                    else -> "unrecorded"
                                }

                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = student.studentName ?: "Estudiante",
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = TextPrimary,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            student.dni?.let {
                                                Text(text = "DNI: $it", fontSize = 11.sp, color = TextSecondary)
                                            }
                                        }

                                        Surface(
                                            onClick = {
                                                val nextStatus = when (state) {
                                                    "unrecorded" -> "present"
                                                    "present" -> "absent"
                                                    else -> "present"
                                                }
                                                val newAtt = Attendance(
                                                    id = attRecord?.id ?: "temp_att_${System.currentTimeMillis()}_${student.id}",
                                                    classStudentId = student.id,
                                                    sessionId = currentSessionId,
                                                    status = nextStatus
                                                )
                                                attendances = attendances.filterNot { it.classStudentId == student.id } + newAtt
                                                scope.launch {
                                                    teacherRepository.setAttendanceStatus(student.id, currentSessionId, nextStatus)
                                                }
                                            },
                                            shape = RoundedCornerShape(12.dp),
                                            color = when (state) {
                                                "present" -> StatusSuccessBg
                                                "absent" -> StatusErrorBg
                                                else -> StatusNeutralBg
                                            },
                                            border = androidx.compose.foundation.BorderStroke(
                                                1.dp,
                                                when (state) {
                                                    "present" -> StatusSuccessBorder
                                                    "absent" -> StatusErrorBorder
                                                    else -> StatusNeutralBorder
                                                }
                                            )
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(
                                                    imageVector = when (state) {
                                                        "present" -> Icons.Rounded.Check
                                                        "absent" -> Icons.Rounded.Close
                                                        else -> Icons.Rounded.Schedule
                                                    },
                                                    contentDescription = null,
                                                    tint = when (state) {
                                                        "present" -> StatusSuccess
                                                        "absent" -> StatusError
                                                        else -> StatusNeutral
                                                    },
                                                    modifier = Modifier.size(16.dp)
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = when (state) {
                                                        "present" -> "Presente"
                                                        "absent" -> "Ausente"
                                                        else -> "Sin registrar"
                                                    },
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = when (state) {
                                                        "present" -> StatusSuccess
                                                        "absent" -> StatusError
                                                        else -> StatusNeutral
                                                    }
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
