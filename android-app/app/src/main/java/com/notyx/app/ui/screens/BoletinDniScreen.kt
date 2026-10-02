package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notyx.app.data.models.DetailedGradeItem
import com.notyx.app.data.models.TutorReportData
import com.notyx.app.data.repository.StudentRepository
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BoletinDniScreen(
    initialDni: String = "",
    studentRepository: StudentRepository,
    onBack: () -> Unit
) {
    var dniInput by remember { mutableStateOf(initialDni) }
    var isLoading by remember { mutableStateOf(false) }
    var reportData by remember { mutableStateOf<TutorReportData?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var selectedTab by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    val searchDni: (String) -> Unit = { dniToSearch ->
        val clean = dniToSearch.trim()
        if (clean.isNotEmpty()) {
            isLoading = true
            errorMessage = null
            scope.launch {
                val result = studentRepository.getTutorReportByDni(clean)
                isLoading = false
                if (result.isSuccess) {
                    reportData = result.getOrNull()
                } else {
                    reportData = null
                    errorMessage = result.exceptionOrNull()?.localizedMessage ?: "No se encontró ningún estudiante con el DNI ingresado"
                }
            }
        }
    }

    LaunchedEffect(initialDni) {
        if (initialDni.isNotBlank()) {
            searchDni(initialDni)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Boletín de Calificaciones",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        Text(
                            text = "Consulta oficial de trayectoria escolar por DNI",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BgLightSecondary)
            )
        },
        containerColor = BgLightSecondary
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // DNI Search Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderLight)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = "Buscar Alumno por DNI",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black,
                        color = TextPrimary
                    )
                    Text(
                        text = "Ingresá el número de documento para emitir el boletín con notas y asistencias.",
                        fontSize = 12.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = dniInput,
                            onValueChange = {
                                dniInput = it
                                errorMessage = null
                            },
                            placeholder = { Text("Número de DNI (sin puntos)") },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = PrimaryIndigo,
                                unfocusedBorderColor = BorderMedium
                            )
                        )

                        Button(
                            onClick = { searchDni(dniInput) },
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                            modifier = Modifier.height(54.dp),
                            enabled = !isLoading && dniInput.isNotBlank()
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                            } else {
                                Icon(Icons.Rounded.Search, contentDescription = null)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Consultar", fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Surface(
                            color = StatusErrorBg,
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, StatusErrorBorder)
                        ) {
                            Text(
                                text = errorMessage ?: "",
                                color = StatusError,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }

            // Report Results
            reportData?.let { report ->
                // Academic Header Card
                val isPromoted = report.averageScore >= 7.0 && report.attendancePct >= 75
                val isRegular = report.averageScore >= 4.0 && report.attendancePct >= 60

                val conditionText = when {
                    isPromoted -> "PROMOCIONADO"
                    isRegular -> "REGULAR"
                    else -> "EN RIESGO"
                }
                val conditionColor = when {
                    isPromoted -> StatusSuccess
                    isRegular -> StatusWarning
                    else -> StatusError
                }
                val conditionBg = when {
                    isPromoted -> StatusSuccessBg
                    isRegular -> StatusWarningBg
                    else -> StatusErrorBg
                }
                val conditionBorder = when {
                    isPromoted -> StatusSuccessBorder
                    isRegular -> StatusWarningBorder
                    else -> StatusErrorBorder
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.5.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderLight)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = report.studentName,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "DNI ${report.dni} • ${report.className ?: "Curso Regular"}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextSecondary
                                )
                            }

                            Surface(
                                color = conditionBg,
                                shape = RoundedCornerShape(12.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, conditionBorder)
                            ) {
                                Text(
                                    text = conditionText,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = conditionColor,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(18.dp))
                        HorizontalDivider(color = BorderLight)
                        Spacer(modifier = Modifier.height(16.dp))

                        // Metric Trio
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("PROMEDIO", fontSize = 10.sp, fontWeight = FontWeight.Black, color = TextMuted)
                                Text(
                                    text = String.format("%.1f", report.averageScore),
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black,
                                    color = PrimaryIndigo
                                )
                            }

                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("ASISTENCIA", fontSize = 10.sp, fontWeight = FontWeight.Black, color = TextMuted)
                                Text(
                                    text = "${report.attendancePct}%",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black,
                                    color = if (report.attendancePct >= 75) StatusSuccess else StatusError
                                )
                                Text(
                                    text = "${report.presentCount} pres • ${report.absentCount} aus",
                                    fontSize = 10.sp,
                                    color = TextSecondary
                                )
                            }

                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("EVALUACIONES", fontSize = 10.sp, fontWeight = FontWeight.Black, color = TextMuted)
                                Text(
                                    text = "${report.grades.size}",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black,
                                    color = TextPrimary
                                )
                            }
                        }
                    }
                }

                // Cuatrimestre Selector Tabs
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFFE2E8F0).copy(alpha = 0.6f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(4.dp)
                    ) {
                        val tabs = listOf("1° Cuatrimestre", "2° Cuatrimestre", "Asistencias")
                        tabs.forEachIndexed { index, tabTitle ->
                            val isSelected = selectedTab == index
                            Surface(
                                onClick = { selectedTab = index },
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) Color.White else Color.Transparent,
                                shadowElevation = if (isSelected) 2.dp else 0.dp,
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    text = tabTitle,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold,
                                    color = if (isSelected) PrimaryIndigo else TextSecondary,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 10.dp)
                                )
                            }
                        }
                    }
                }

                // Tab Content
                val q1Grades = report.grades.filter { (it.cuatrimestre ?: 1) == 1 }
                val q2Grades = report.grades.filter { (it.cuatrimestre ?: 1) == 2 }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 24.dp)
                ) {
                    when (selectedTab) {
                        0 -> {
                            if (q1Grades.isEmpty()) {
                                item {
                                    EmptyStateBox("No hay calificaciones registradas para el 1° Cuatrimestre.")
                                }
                            } else {
                                items(q1Grades) { grade ->
                                    GradeItemCard(grade = grade)
                                }
                            }
                        }
                        1 -> {
                            if (q2Grades.isEmpty()) {
                                item {
                                    EmptyStateBox("No hay calificaciones registradas para el 2° Cuatrimestre.")
                                }
                            } else {
                                items(q2Grades) { grade ->
                                    GradeItemCard(grade = grade)
                                }
                            }
                        }
                        2 -> {
                            if (report.attendances.isEmpty()) {
                                item {
                                    EmptyStateBox("No hay registros de asistencia para este estudiante.")
                                }
                            } else {
                                items(report.attendances) { att ->
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, BorderLight),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(14.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column {
                                                Text(
                                                    text = att.sessionTitle,
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = TextPrimary
                                                )
                                                Text(
                                                    text = "Fecha: ${att.date}",
                                                    fontSize = 11.sp,
                                                    color = TextSecondary
                                                )
                                            }

                                            Surface(
                                                color = if (att.isPresent) StatusSuccessBg else StatusErrorBg,
                                                shape = RoundedCornerShape(8.dp),
                                                border = androidx.compose.foundation.BorderStroke(
                                                    1.dp,
                                                    if (att.isPresent) StatusSuccessBorder else StatusErrorBorder
                                                )
                                            ) {
                                                Text(
                                                    text = if (att.isPresent) "PRESENTE" else "AUSENTE",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Black,
                                                    color = if (att.isPresent) StatusSuccess else StatusError,
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
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

@Composable
fun GradeItemCard(grade: DetailedGradeItem) {
    val scoreColor = when {
        grade.score >= 7.0 -> StatusSuccess
        grade.score >= 4.0 -> StatusWarning
        else -> StatusError
    }
    val scoreBg = when {
        grade.score >= 7.0 -> StatusSuccessBg
        grade.score >= 4.0 -> StatusWarningBg
        else -> StatusErrorBg
    }
    val scoreBorder = when {
        grade.score >= 7.0 -> StatusSuccessBorder
        grade.score >= 4.0 -> StatusWarningBorder
        else -> StatusErrorBorder
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderLight),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = grade.criteriaName,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                grade.sessionTitle?.let {
                    Text(
                        text = "$it • ${grade.date ?: ""}",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
            }

            Surface(
                color = scoreBg,
                shape = RoundedCornerShape(10.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, scoreBorder)
            ) {
                Text(
                    text = "${grade.score} / ${grade.maxScore.toInt()}",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Black,
                    color = scoreColor,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }
    }
}

@Composable
fun EmptyStateBox(message: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderLight)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Rounded.MenuBook,
                contentDescription = null,
                tint = TextMuted,
                modifier = Modifier.size(36.dp)
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = message,
                fontSize = 13.sp,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )
        }
    }
}
