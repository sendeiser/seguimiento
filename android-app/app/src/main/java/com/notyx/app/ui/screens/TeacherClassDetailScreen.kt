package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notyx.app.data.models.Attendance
import com.notyx.app.data.models.ClassSession
import com.notyx.app.data.models.ClassStudent
import com.notyx.app.data.repository.TeacherRepository
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.YearMonth
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherClassDetailScreen(
    classId: String,
    className: String,
    shortCode: String?,
    teacherRepository: TeacherRepository,
    onBack: () -> Unit,
    onSelectSession: (sessionId: String, sessionDate: String, cuatrimestre: Int) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Sesiones", "Alumnos", "Asistencia")

    var sessions by remember { mutableStateOf<List<ClassSession>>(emptyList()) }
    var students by remember { mutableStateOf<List<ClassStudent>>(emptyList()) }
    var attendances by remember { mutableStateOf<List<Attendance>>(emptyList()) }
    var selectedSessionId by remember { mutableStateOf<String?>(null) }

    var isLoading by remember { mutableStateOf(true) }
    var showNewSessionDialog by remember { mutableStateOf(false) }
    var showNewStudentDialog by remember { mutableStateOf(false) }

    // Session Management Dialogs
    var editingSession by remember { mutableStateOf<ClassSession?>(null) }
    var deletingSession by remember { mutableStateOf<ClassSession?>(null) }
    var isDeletingSession by remember { mutableStateOf(false) }

    // Filters and Search
    var sessionCuatrimestreFilter by remember { mutableIntStateOf(0) } // 0: Todos, 1: 1°, 2: 2°
    var studentSearchQuery by remember { mutableStateOf("") }
    var attendanceSearchQuery by remember { mutableStateOf("") }
    var attendanceStatusFilter by remember { mutableStateOf("all") } // "all", "present", "absent", "unrecorded"

    val scope = rememberCoroutineScope()

    val refreshData = {
        scope.launch {
            isLoading = true
            val sess = teacherRepository.getClassSessions(classId)
            val studs = teacherRepository.getClassStudents(classId)
            sessions = sess
            students = studs
            val initialSessId = selectedSessionId?.takeIf { id -> sess.any { it.id == id } } ?: sess.firstOrNull()?.id
            selectedSessionId = initialSessId
            if (initialSessId != null) {
                attendances = teacherRepository.getAttendanceForSession(initialSessId)
            } else {
                attendances = emptyList()
            }
            isLoading = false
        }
    }

    LaunchedEffect(classId) {
        refreshData()
    }

    LaunchedEffect(selectedSessionId) {
        val currSessId = selectedSessionId
        if (currSessId != null) {
            attendances = teacherRepository.getAttendanceForSession(currSessId)
        }
    }

    var sessionViewMode by remember { mutableStateOf("calendar") } // "calendar" or "list"
    val defaultTodayStr = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }
    var selectedCalendarDate by remember { mutableStateOf(defaultTodayStr) }
    var newSessionPreloadDate by remember { mutableStateOf(defaultTodayStr) }

    // Modal: Nueva Sesión
    if (showNewSessionDialog) {
        var sessionDate by remember { mutableStateOf(newSessionPreloadDate) }
        var cuatrimestre by remember { mutableIntStateOf(1) }
        var preloadBaseCriteria by remember { mutableStateOf(true) }
        var isSubmitting by remember { mutableStateOf(false) }
        var createError by remember { mutableStateOf<String?>(null) }

        AlertDialog(
            onDismissRequest = { if (!isSubmitting) showNewSessionDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.CalendarToday, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Nueva Fecha de Clase",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text(
                        text = "Registrá una fecha de clase para tomar asistencia y evaluar criterios.",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )

                    // Quick date presets
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val todayVal = LocalDate.now().toString()
                        val yesterdayVal = LocalDate.now().minusDays(1).toString()

                        Surface(
                            onClick = { sessionDate = todayVal },
                            shape = RoundedCornerShape(8.dp),
                            color = if (sessionDate == todayVal) PrimaryIndigo else Color(0xFFF1F5F9)
                        ) {
                            Text(
                                text = "Hoy ($todayVal)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (sessionDate == todayVal) Color.White else TextPrimary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                            )
                        }

                        Surface(
                            onClick = { sessionDate = yesterdayVal },
                            shape = RoundedCornerShape(8.dp),
                            color = if (sessionDate == yesterdayVal) PrimaryIndigo else Color(0xFFF1F5F9)
                        ) {
                            Text(
                                text = "Ayer ($yesterdayVal)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (sessionDate == yesterdayVal) Color.White else TextPrimary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                            )
                        }
                    }

                    OutlinedTextField(
                        value = sessionDate,
                        onValueChange = { sessionDate = it },
                        label = { Text("Fecha (AAAA-MM-DD)") },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Column {
                        Text(
                            text = "Cuatrimestre",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilterChip(
                                selected = cuatrimestre == 1,
                                onClick = { cuatrimestre = 1 },
                                label = { Text("1° Cuatrimestre", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            )
                            FilterChip(
                                selected = cuatrimestre == 2,
                                onClick = { cuatrimestre = 2 },
                                label = { Text("2° Cuatrimestre", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // Card: Precargar criterios base
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFEEF2FF),
                        border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryIndigo.copy(alpha = 0.25f)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { preloadBaseCriteria = !preloadBaseCriteria }
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = preloadBaseCriteria,
                                onCheckedChange = { preloadBaseCriteria = it }
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Column {
                                Text(
                                    text = "Precargar criterios base",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = PrimaryIndigo
                                )
                                Text(
                                    text = "Participación, Actividades, Carpeta y Conducta (10 pts c/u)",
                                    fontSize = 10.sp,
                                    color = TextSecondary
                                )
                            }
                        }
                    }

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
                        isSubmitting = true
                        createError = null
                        scope.launch {
                            val res = teacherRepository.createSession(
                                classId = classId,
                                date = sessionDate,
                                cuatrimestre = cuatrimestre,
                                preloadBaseCriteria = preloadBaseCriteria
                            )
                            isSubmitting = false
                            if (res.isSuccess) {
                                showNewSessionDialog = false
                                selectedCalendarDate = sessionDate
                                refreshData()
                            } else {
                                createError = res.exceptionOrNull()?.message ?: "Error al crear la sesión"
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = !isSubmitting && sessionDate.isNotBlank()
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Crear Sesión", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showNewSessionDialog = false },
                    enabled = !isSubmitting
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Modificar Sesión
    editingSession?.let { session ->
        var editDate by remember { mutableStateOf(session.date ?: "") }
        var editCuatrimestre by remember { mutableIntStateOf(session.cuatrimestre ?: 1) }
        var isUpdating by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { if (!isUpdating) editingSession = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.EditCalendar, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Modificar Sesión", fontWeight = FontWeight.Black, fontSize = 18.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text(
                        text = "Modificá la fecha o cuatrimestre asignado a esta clase.",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )

                    OutlinedTextField(
                        value = editDate,
                        onValueChange = { editDate = it },
                        label = { Text("Fecha (AAAA-MM-DD)") },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Column {
                        Text(
                            text = "Cuatrimestre",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilterChip(
                                selected = editCuatrimestre == 1,
                                onClick = { editCuatrimestre = 1 },
                                label = { Text("1° Cuatrimestre", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            )
                            FilterChip(
                                selected = editCuatrimestre == 2,
                                onClick = { editCuatrimestre = 2 },
                                label = { Text("2° Cuatrimestre", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (editDate.isNotBlank()) {
                            isUpdating = true
                            scope.launch {
                                teacherRepository.updateSession(session.id, editDate, editCuatrimestre)
                                isUpdating = false
                                editingSession = null
                                refreshData()
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = !isUpdating && editDate.isNotBlank()
                ) {
                    if (isUpdating) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Guardar Cambios", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { editingSession = null },
                    enabled = !isUpdating
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Confirmar Eliminación de Sesión
    deletingSession?.let { session ->
        AlertDialog(
            onDismissRequest = { if (!isDeletingSession) deletingSession = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.WarningAmber, contentDescription = null, tint = StatusError)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("¿Eliminar Sesión?", fontWeight = FontWeight.Black, fontSize = 18.sp, color = StatusError)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Estás a punto de eliminar la sesión del día ${session.date ?: "Sin fecha"}.",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Esta acción borrará permanentemente todos los criterios evaluados, notas y asistencias registradas en esta fecha de clase.",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isDeletingSession = true
                        scope.launch {
                            teacherRepository.deleteSession(session.id)
                            isDeletingSession = false
                            deletingSession = null
                            if (selectedSessionId == session.id) {
                                selectedSessionId = null
                            }
                            refreshData()
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = StatusError),
                    enabled = !isDeletingSession
                ) {
                    if (isDeletingSession) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Eliminar Sesión", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { deletingSession = null },
                    enabled = !isDeletingSession
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Agregar Alumno
    if (showNewStudentDialog) {
        var studentName by remember { mutableStateOf("") }
        var studentDni by remember { mutableStateOf("") }
        var isSubmitting by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { if (!isSubmitting) showNewStudentDialog = false },
            title = {
                Text(
                    text = "Agregar Alumno a la Clase",
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text(
                        text = "Ingresá el nombre completo y el DNI para habilitar el reporte a tutores.",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )

                    OutlinedTextField(
                        value = studentName,
                        onValueChange = { studentName = it },
                        label = { Text("Nombre Completo") },
                        placeholder = { Text("Ej: Lucas Gómez") },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = studentDni,
                        onValueChange = { studentDni = it },
                        label = { Text("DNI (Opcional)") },
                        placeholder = { Text("Ej: 45123456") },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isSubmitting = true
                        scope.launch {
                            teacherRepository.addStudentToClass(
                                classId = classId,
                                studentName = studentName,
                                dni = studentDni.ifBlank { null }
                            )
                            isSubmitting = false
                            showNewStudentDialog = false
                            refreshData()
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = !isSubmitting && studentName.isNotBlank()
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Agregar Alumno", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showNewStudentDialog = false },
                    enabled = !isSubmitting
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
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "Volver",
                            tint = TextPrimary
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = className,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        shortCode?.let { code ->
                            Text(
                                text = "CÓDIGO DE CLASE: $code",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = PrimaryIndigo,
                                letterSpacing = 1.sp
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
                    // TAB 0: SESIONES DE CLASE
                    val filteredSessions = remember(sessions, sessionCuatrimestreFilter) {
                        when (sessionCuatrimestreFilter) {
                            1 -> sessions.filter { (it.cuatrimestre ?: 1) == 1 }
                            2 -> sessions.filter { (it.cuatrimestre ?: 1) == 2 }
                            else -> sessions
                        }
                    }

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(vertical = 16.dp)
                    ) {
                        item {
                            Button(
                                onClick = {
                                    newSessionPreloadDate = selectedCalendarDate
                                    showNewSessionDialog = true
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                            ) {
                                Icon(Icons.Rounded.Add, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Crear Nueva Sesión", fontWeight = FontWeight.Bold)
                            }
                        }

                        // Selector de Vista: [ 📅 Calendario  |  📋 Lista ]
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Surface(
                                    onClick = { sessionViewMode = "calendar" },
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (sessionViewMode == "calendar") PrimaryIndigo else Color.White,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (sessionViewMode == "calendar") PrimaryIndigo else Color(0xFFE2E8F0)),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(vertical = 9.dp),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            Icons.Rounded.CalendarMonth,
                                            contentDescription = null,
                                            tint = if (sessionViewMode == "calendar") Color.White else PrimaryIndigo,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            "Calendario",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = if (sessionViewMode == "calendar") Color.White else TextPrimary
                                        )
                                    }
                                }

                                Surface(
                                    onClick = { sessionViewMode = "list" },
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (sessionViewMode == "list") PrimaryIndigo else Color.White,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (sessionViewMode == "list") PrimaryIndigo else Color(0xFFE2E8F0)),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(vertical = 9.dp),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            Icons.Rounded.ViewList,
                                            contentDescription = null,
                                            tint = if (sessionViewMode == "list") Color.White else PrimaryIndigo,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            "Lista (${sessions.size})",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = if (sessionViewMode == "list") Color.White else TextPrimary
                                        )
                                    }
                                }
                            }
                        }

                        if (sessionViewMode == "calendar") {
                            item {
                                CalendarSessionsView(
                                    sessions = sessions,
                                    selectedDate = selectedCalendarDate,
                                    onSelectDate = { selectedCalendarDate = it },
                                    onOpenSession = { session ->
                                        onSelectSession(session.id, session.date ?: "", session.cuatrimestre ?: 1)
                                    },
                                    onCreateSessionForDate = { date ->
                                        newSessionPreloadDate = date
                                        showNewSessionDialog = true
                                    },
                                    onEditSession = { session -> editingSession = session },
                                    onDeleteSession = { session -> deletingSession = session }
                                )
                            }
                        } else {
                            // Cuatrimestre Filter Chips
                            if (sessions.isNotEmpty()) {
                                item {
                                    LazyRow(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        val filterItems = listOf("Todas las Sesiones" to 0, "1° Cuatrimestre" to 1, "2° Cuatrimestre" to 2)
                                        items(filterItems) { (label, cIdx) ->
                                            val isSel = sessionCuatrimestreFilter == cIdx
                                            Surface(
                                                onClick = { sessionCuatrimestreFilter = cIdx },
                                                shape = RoundedCornerShape(10.dp),
                                                color = if (isSel) PrimaryIndigo else Color.White,
                                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isSel) PrimaryIndigo else Color(0xFFE2E8F0))
                                            ) {
                                                Text(
                                                    text = label,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (isSel) Color.White else TextPrimary,
                                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                        if (filteredSessions.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 40.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = if (sessions.isEmpty()) "No hay sesiones creadas todavía." else "No hay sesiones en este cuatrimestre.",
                                        fontSize = 14.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        } else {
                            items(items = filteredSessions, key = { it.id }) { session ->
                                Card(
                                    onClick = {
                                        onSelectSession(session.id, session.date ?: "", session.cuatrimestre ?: 1)
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = "Sesión ${session.date ?: "Sin fecha"}",
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = TextPrimary,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                                            ) {
                                                Surface(
                                                    color = Color(0xFFEFF6FF),
                                                    shape = RoundedCornerShape(6.dp)
                                                ) {
                                                    Text(
                                                        text = "${session.cuatrimestre ?: 1}° Cuatrimestre",
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = PrimaryIndigo,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis,
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                                    )
                                                }
                                                Text(
                                                    text = "Tocar para calificar",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Medium,
                                                    color = PrimaryIndigo,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }

                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            IconButton(
                                                onClick = { editingSession = session },
                                                modifier = Modifier.size(34.dp)
                                            ) {
                                                Icon(
                                                    Icons.Rounded.Edit,
                                                    contentDescription = "Editar Sesión",
                                                    tint = TextSecondary,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }

                                            IconButton(
                                                onClick = { deletingSession = session },
                                                modifier = Modifier.size(34.dp)
                                            ) {
                                                Icon(
                                                    Icons.Rounded.DeleteOutline,
                                                    contentDescription = "Eliminar Sesión",
                                                    tint = StatusError,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }

                                            Box(
                                                modifier = Modifier
                                                    .size(32.dp)
                                                    .background(PrimaryIndigo.copy(alpha = 0.1f), RoundedCornerShape(10.dp)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    Icons.AutoMirrored.Rounded.ArrowForward,
                                                    contentDescription = null,
                                                    tint = PrimaryIndigo,
                                                    modifier = Modifier.size(16.dp)
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

                1 -> {
                    // TAB 1: ALUMNOS
                    val filteredStudents = remember(students, studentSearchQuery) {
                        if (studentSearchQuery.isBlank()) {
                            students
                        } else {
                            students.filter {
                                val name = it.studentName ?: ""
                                val dni = it.dni ?: ""
                                name.contains(studentSearchQuery, ignoreCase = true) || dni.contains(studentSearchQuery)
                            }
                        }
                    }

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(vertical = 16.dp)
                    ) {
                        item {
                            Card(
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFEEF2FF)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(Icons.Rounded.Share, contentDescription = null, tint = PrimaryIndigo, modifier = Modifier.size(18.dp))
                                        Text(
                                            text = "Auto-inscripción de alumnos",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Black,
                                            color = PrimaryIndigo
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Los estudiantes pueden unirse directamente introduciendo el código:",
                                        fontSize = 12.sp,
                                        color = TextSecondary
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Surface(
                                        color = Color.White,
                                        shape = RoundedCornerShape(10.dp),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryIndigo.copy(alpha = 0.3f))
                                    ) {
                                        Text(
                                            text = shortCode ?: "SIN CÓDIGO",
                                            fontSize = 18.sp,
                                            fontWeight = FontWeight.Black,
                                            letterSpacing = 2.sp,
                                            color = PrimaryIndigo,
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                                        )
                                    }
                                }
                            }
                        }

                        item {
                            Button(
                                onClick = { showNewStudentDialog = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                            ) {
                                Icon(Icons.Rounded.PersonAdd, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Agregar Alumno Manualmente", fontWeight = FontWeight.Bold)
                            }
                        }

                        if (students.isNotEmpty()) {
                            item {
                                OutlinedTextField(
                                    value = studentSearchQuery,
                                    onValueChange = { studentSearchQuery = it },
                                    placeholder = { Text("Buscar alumno por nombre o DNI...") },
                                    leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = TextSecondary) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }

                        if (filteredStudents.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 40.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = if (students.isEmpty()) "No hay alumnos inscriptos en esta materia." else "No se encontraron alumnos con esa búsqueda.",
                                        fontSize = 14.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        } else {
                            items(items = filteredStudents, key = { it.id }) { student ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(42.dp)
                                                .clip(CircleShape)
                                                .background(PrimaryIndigo.copy(alpha = 0.12f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = (student.studentName?.firstOrNull() ?: 'E').uppercase(),
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.Black,
                                                color = PrimaryIndigo
                                            )
                                        }

                                        Spacer(modifier = Modifier.width(14.dp))

                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = student.studentName ?: "Estudiante",
                                                fontSize = 15.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = TextPrimary
                                            )
                                            student.dni?.let { dni ->
                                                Text(
                                                    text = "DNI: $dni",
                                                    fontSize = 12.sp,
                                                    color = TextSecondary
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                2 -> {
                    // TAB 2: ASISTENCIA DOCENTE MEJORADA
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                    ) {
                        if (sessions.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Rounded.EventBusy, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(48.dp))
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text(
                                        text = "Primero creá una sesión para poder tomar asistencia.",
                                        fontSize = 14.sp,
                                        color = TextSecondary
                                    )
                                    Spacer(modifier = Modifier.height(14.dp))
                                    Button(
                                        onClick = { showNewSessionDialog = true },
                                        shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                                    ) {
                                        Text("Crear Primera Sesión", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        } else {
                            // Horizontal session selector
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color.White)
                                    .padding(vertical = 10.dp)
                            ) {
                                Text(
                                    text = "Seleccionar Sesión de Clase:",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextSecondary,
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 2.dp)
                                )
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp)
                                ) {
                                    items(items = sessions, key = { it.id }) { session ->
                                        val isSelected = selectedSessionId == session.id
                                        Surface(
                                            shape = RoundedCornerShape(12.dp),
                                            color = if (isSelected) PrimaryIndigo else Color(0xFFF1F5F9),
                                            border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                            modifier = Modifier.clickable {
                                                selectedSessionId = session.id
                                            }
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(
                                                    Icons.Rounded.Event,
                                                    contentDescription = null,
                                                    tint = if (isSelected) Color.White else PrimaryIndigo,
                                                    modifier = Modifier.size(14.dp)
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = session.date ?: "Sesión",
                                                    fontSize = 12.sp,
                                                    fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold,
                                                    color = if (isSelected) Color.White else TextPrimary
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            val presentCount = attendances.count { it.isActuallyPresent }
                            val absentCount = attendances.count { it.isExplicitlyAbsent }
                            val unrecordedCount = maxOf(0, students.size - (presentCount + absentCount))
                            val totalStudents = students.size
                            val pct = if (totalStudents > 0) (presentCount * 100 / totalStudents) else 0

                            // Filtered students for attendance
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
                                    .padding(horizontal = 20.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                                contentPadding = PaddingValues(vertical = 12.dp)
                            ) {
                                // Summary Card
                                item {
                                    Card(
                                        shape = RoundedCornerShape(20.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(16.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column {
                                                    Text(
                                                        text = "Resumen de Asistencia",
                                                        fontSize = 15.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = TextPrimary
                                                    )
                                                    Text(
                                                        text = "$totalStudents alumnos en la clase",
                                                        fontSize = 12.sp,
                                                        color = TextSecondary
                                                    )
                                                }

                                                Surface(
                                                    color = if (pct >= 75) StatusSuccessBg else StatusWarningBg,
                                                    shape = RoundedCornerShape(10.dp),
                                                    border = androidx.compose.foundation.BorderStroke(
                                                        1.dp,
                                                        if (pct >= 75) StatusSuccessBorder else StatusWarningBorder
                                                    )
                                                ) {
                                                    Text(
                                                        text = "$pct%",
                                                        fontSize = 15.sp,
                                                        fontWeight = FontWeight.Black,
                                                        color = if (pct >= 75) StatusSuccess else StatusWarning,
                                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                                    )
                                                }
                                            }

                                            Spacer(modifier = Modifier.height(12.dp))

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

                                            Spacer(modifier = Modifier.height(12.dp))

                                            // Bulk Action Buttons
                                            val currentSess = selectedSessionId
                                            if (currentSess != null) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                                ) {
                                                    Button(
                                                        onClick = {
                                                            scope.launch {
                                                                teacherRepository.markAllPresent(currentSess, students.map { it.id })
                                                                attendances = teacherRepository.getAttendanceForSession(currentSess)
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
                                                            scope.launch {
                                                                teacherRepository.markAllAbsent(currentSess, students.map { it.id })
                                                                attendances = teacherRepository.getAttendanceForSession(currentSess)
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
                                }

                                // Search and status filter
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

                                        // Status filter chips
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
                                            Text(
                                                text = "No se encontraron alumnos con este filtro.",
                                                fontSize = 13.sp,
                                                color = TextSecondary
                                            )
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
                                                        color = TextPrimary
                                                    )
                                                    student.dni?.let {
                                                        Text(
                                                            text = "DNI: $it",
                                                            fontSize = 11.sp,
                                                            color = TextSecondary
                                                        )
                                                    }
                                                }

                                                val sessId = selectedSessionId
                                                Surface(
                                                    onClick = {
                                                        if (sessId != null) {
                                                            val nextStatus = when (state) {
                                                                "unrecorded" -> "present"
                                                                "present" -> "absent"
                                                                else -> "present"
                                                            }
                                                            scope.launch {
                                                                teacherRepository.setAttendanceStatus(student.id, sessId, nextStatus)
                                                                attendances = teacherRepository.getAttendanceForSession(sessId)
                                                            }
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
    }
}

// ==========================================================
// COMPONENTE: VISTA CALENDARIO DE SESIONES
// ==========================================================
@Composable
fun CalendarSessionsView(
    sessions: List<ClassSession>,
    selectedDate: String,
    onSelectDate: (String) -> Unit,
    onOpenSession: (ClassSession) -> Unit,
    onCreateSessionForDate: (String) -> Unit,
    onEditSession: (ClassSession) -> Unit,
    onDeleteSession: (ClassSession) -> Unit
) {
    val today = remember { LocalDate.now() }
    val initialYearMonth = remember(selectedDate) {
        try {
            val parsed = LocalDate.parse(selectedDate)
            YearMonth.of(parsed.year, parsed.month)
        } catch (e: Exception) {
            YearMonth.now()
        }
    }
    var currentYearMonth by remember { mutableStateOf(initialYearMonth) }

    val monthSessions = remember(sessions, currentYearMonth) {
        sessions.filter { sess ->
            try {
                val d = LocalDate.parse(sess.date)
                d.year == currentYearMonth.year && d.monthValue == currentYearMonth.monthValue
            } catch (e: Exception) {
                false
            }
        }
    }

    val selectedDaySessions = remember(sessions, selectedDate) {
        sessions.filter { it.date == selectedDate }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Month Navigation Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { currentYearMonth = currentYearMonth.minusMonths(1) },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Rounded.ChevronLeft, contentDescription = "Mes anterior", tint = TextPrimary)
                    }
                    Text(
                        text = getMonthTitleSpanish(currentYearMonth),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = TextPrimary
                    )
                    IconButton(
                        onClick = { currentYearMonth = currentYearMonth.plusMonths(1) },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Rounded.ChevronRight, contentDescription = "Mes siguiente", tint = TextPrimary)
                    }
                }

                Surface(
                    onClick = {
                        val nowMonth = YearMonth.now()
                        currentYearMonth = nowMonth
                        onSelectDate(today.toString())
                    },
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFEFF6FF),
                    border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryIndigo.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(Icons.Rounded.Today, contentDescription = null, tint = PrimaryIndigo, modifier = Modifier.size(14.dp))
                        Text("Hoy", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = PrimaryIndigo)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Day of week labels
            val dayLabels = listOf("Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom")
            Row(modifier = Modifier.fillMaxWidth()) {
                dayLabels.forEach { label ->
                    Text(
                        text = label,
                        modifier = Modifier.weight(1f),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF64748B)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Days Grid
            val firstDay = currentYearMonth.atDay(1)
            val paddingDays = firstDay.dayOfWeek.value - 1
            val daysInMonth = currentYearMonth.lengthOfMonth()
            val totalCells = paddingDays + daysInMonth
            val numRows = (totalCells + 6) / 7

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                for (row in 0 until numRows) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        for (col in 0 until 7) {
                            val cellIndex = row * 7 + col
                            if (cellIndex < paddingDays || cellIndex >= totalCells) {
                                Spacer(modifier = Modifier.weight(1f))
                            } else {
                                val dayNum = cellIndex - paddingDays + 1
                                val dateStr = String.format(Locale.US, "%04d-%02d-%02d", currentYearMonth.year, currentYearMonth.monthValue, dayNum)
                                val dayDate = currentYearMonth.atDay(dayNum)
                                val hasSession = sessions.any { it.date == dateStr }
                                val isSelected = selectedDate == dateStr
                                val isToday = dayDate == today

                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .aspectRatio(1f)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(
                                            when {
                                                isSelected -> PrimaryIndigo
                                                hasSession -> Color(0xFFEEF2FF)
                                                isToday -> Color(0xFFF1F5F9)
                                                else -> Color.Transparent
                                            }
                                        )
                                        .then(
                                            if (isSelected) Modifier
                                            else if (hasSession) Modifier.border(1.dp, PrimaryIndigo.copy(alpha = 0.5f), RoundedCornerShape(10.dp))
                                            else if (isToday) Modifier.border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(10.dp))
                                            else Modifier
                                        )
                                        .clickable { onSelectDate(dateStr) },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.Center
                                    ) {
                                        Text(
                                            text = "$dayNum",
                                            fontSize = 13.sp,
                                            fontWeight = if (hasSession || isSelected) FontWeight.Black else FontWeight.Medium,
                                            color = when {
                                                isSelected -> Color.White
                                                hasSession -> PrimaryIndigo
                                                else -> TextPrimary
                                            }
                                        )
                                        if (hasSession) {
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Box(
                                                modifier = Modifier
                                                    .size(4.dp)
                                                    .clip(CircleShape)
                                                    .background(if (isSelected) Color.White else PrimaryIndigo)
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

    Spacer(modifier = Modifier.height(14.dp))

    // Selected Date Card / Action Panel
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Rounded.Event,
                    contentDescription = null,
                    tint = PrimaryIndigo,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = formatSpanishFullDate(selectedDate),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = TextPrimary
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (selectedDaySessions.isNotEmpty()) {
                selectedDaySessions.forEach { sess ->
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color(0xFFF8FAFC),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Sesión ${sess.date ?: ""}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                        color = TextPrimary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Surface(
                                        color = Color(0xFFEFF6FF),
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier.padding(top = 4.dp)
                                    ) {
                                        Text(
                                            text = "${sess.cuatrimestre ?: 1}° Cuatrimestre",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = PrimaryIndigo,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                        )
                                    }
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    IconButton(
                                        onClick = { onEditSession(sess) },
                                        modifier = Modifier.size(34.dp)
                                    ) {
                                        Icon(Icons.Rounded.Edit, contentDescription = "Editar", tint = TextSecondary, modifier = Modifier.size(18.dp))
                                    }
                                    IconButton(
                                        onClick = { onDeleteSession(sess) },
                                        modifier = Modifier.size(34.dp)
                                    ) {
                                        Icon(Icons.Rounded.DeleteOutline, contentDescription = "Eliminar", tint = StatusError, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Button(
                                onClick = { onOpenSession(sess) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                            ) {
                                Text("Abrir y Calificar Sesión", fontWeight = FontWeight.Bold)
                                Spacer(modifier = Modifier.width(6.dp))
                                Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            } else {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFFF8FAFC),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "No hay clase registrada para esta fecha",
                            fontSize = 13.sp,
                            color = TextSecondary,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = { onCreateSessionForDate(selectedDate) },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                        ) {
                            Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Crear Sesión para este día", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }

    // Resumen de sesiones del mes
    if (monthSessions.isNotEmpty()) {
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = "TODAS LAS CLASES DE ESTE MES (${monthSessions.size})",
            fontSize = 11.sp,
            fontWeight = FontWeight.Black,
            color = Color(0xFF64748B),
            letterSpacing = 0.5.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        monthSessions.forEach { sess ->
            Card(
                onClick = { onOpenSession(sess) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFEEF2FF)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Rounded.CalendarToday, contentDescription = null, tint = PrimaryIndigo, modifier = Modifier.size(18.dp))
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Sesión ${sess.date ?: ""}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = TextPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "${sess.cuatrimestre ?: 1}° Cuatrimestre",
                                fontSize = 11.sp,
                                color = TextSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = { onEditSession(sess) },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Rounded.Edit, contentDescription = "Editar", tint = TextSecondary, modifier = Modifier.size(16.dp))
                        }
                        IconButton(
                            onClick = { onDeleteSession(sess) },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Rounded.DeleteOutline, contentDescription = "Eliminar", tint = StatusError, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
    }
}

fun formatSpanishFullDate(dateStr: String): String {
    return try {
        val date = LocalDate.parse(dateStr)
        val dayName = when (date.dayOfWeek.value) {
            1 -> "Lunes"
            2 -> "Martes"
            3 -> "Miércoles"
            4 -> "Jueves"
            5 -> "Viernes"
            6 -> "Sábado"
            else -> "Domingo"
        }
        val monthName = when (date.monthValue) {
            1 -> "Enero"
            2 -> "Febrero"
            3 -> "Marzo"
            4 -> "Abril"
            5 -> "Mayo"
            6 -> "Junio"
            7 -> "Julio"
            8 -> "Agosto"
            9 -> "Septiembre"
            10 -> "Octubre"
            11 -> "Noviembre"
            else -> "Diciembre"
        }
        "$dayName ${date.dayOfMonth} de $monthName, ${date.year}"
    } catch (e: Exception) {
        dateStr
    }
}

fun getMonthTitleSpanish(yearMonth: YearMonth): String {
    val monthName = when (yearMonth.monthValue) {
        1 -> "Enero"
        2 -> "Febrero"
        3 -> "Marzo"
        4 -> "Abril"
        5 -> "Mayo"
        6 -> "Junio"
        7 -> "Julio"
        8 -> "Agosto"
        9 -> "Septiembre"
        10 -> "Octubre"
        11 -> "Noviembre"
        else -> "Diciembre"
    }
    return "$monthName ${yearMonth.year}"
}
