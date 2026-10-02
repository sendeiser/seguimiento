package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notyx.app.data.models.TutorReportData
import com.notyx.app.data.repository.StudentRepository
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TutorPortalScreen(
    studentRepository: StudentRepository,
    onBack: () -> Unit
) {
    var dniInput by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var reportData by remember { mutableStateOf<TutorReportData?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var selectedTab by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    val searchDni = {
        if (dniInput.trim().isNotEmpty()) {
            isLoading = true
            errorMessage = null
            scope.launch {
                val result = studentRepository.getTutorReportByDni(dniInput.trim())
                isLoading = false
                if (result.isSuccess) {
                    reportData = result.getOrNull()
                } else {
                    reportData = null
                    errorMessage = result.exceptionOrNull()?.localizedMessage ?: "No se encontró información"
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Portal de Tutores",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        color = TextPrimary
                    )
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
            // DNI Search Input Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = "Consultar Boletín por DNI",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Ingresá el DNI del alumno para ver sus notas y asistencias.",
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
                            onValueChange = { dniInput = it; errorMessage = null },
                            placeholder = { Text("Número de DNI") },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.weight(1f)
                        )

                        Button(
                            onClick = { searchDni() },
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                            modifier = Modifier.height(52.dp),
                            enabled = !isLoading && dniInput.isNotBlank()
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                            } else {
                                Icon(Icons.Rounded.Search, contentDescription = null)
                            }
                        }
                    }

                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = errorMessage ?: "",
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Report Results
            reportData?.let { report ->
                // Summary Header
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(26.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = report.studentName,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "DNI: ${report.dni}",
                                    fontSize = 13.sp,
                                    color = TextSecondary
                                )
                            }

                            Surface(
                                color = when {
                                    report.averageScore >= 7.0 -> StatusSuccess.copy(alpha = 0.12f)
                                    report.averageScore >= 4.0 -> StatusWarning.copy(alpha = 0.12f)
                                    else -> StatusError.copy(alpha = 0.12f)
                                },
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = when {
                                        report.averageScore >= 7.0 -> "PROMOCIONADO"
                                        report.averageScore >= 4.0 -> "REGULAR"
                                        else -> "EN RIESGO"
                                    },
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black,
                                    color = when {
                                        report.averageScore >= 7.0 -> StatusSuccess
                                        report.averageScore >= 4.0 -> StatusWarning
                                        else -> StatusError
                                    },
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("PROMEDIO", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                                Text(
                                    text = String.format("%.1f", report.averageScore),
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    color = PrimaryIndigo
                                )
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("ASISTENCIA", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                                Text(
                                    text = "${report.attendancePct}%",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    color = if (report.attendancePct >= 75) StatusSuccess else StatusError
                                )
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("NOTAS REGISTRADAS", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                                Text(
                                    text = "${report.grades.size}",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    color = TextPrimary
                                )
                            }
                        }
                    }
                }

                // Tab Selector (Notas / Asistencias)
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFFE2E8F0).copy(alpha = 0.5f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(4.dp)) {
                        TabButton(
                            title = "Calificaciones",
                            icon = Icons.Rounded.School,
                            isSelected = selectedTab == 0,
                            modifier = Modifier.weight(1f),
                            onClick = { selectedTab = 0 }
                        )
                        TabButton(
                            title = "Asistencias",
                            icon = Icons.Rounded.CheckCircle,
                            isSelected = selectedTab == 1,
                            modifier = Modifier.weight(1f),
                            onClick = { selectedTab = 1 }
                        )
                    }
                }

                // List of items
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 20.dp)
                ) {
                    if (selectedTab == 0) {
                        items(report.grades) { grade ->
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
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(grade.criteriaName, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        grade.sessionTitle?.let { Text(it, fontSize = 11.sp, color = TextSecondary) }
                                    }
                                    Text(
                                        "${grade.score} / ${grade.maxScore.toInt()}",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Black,
                                        color = if (grade.score >= 7) StatusSuccess else if (grade.score >= 4) StatusWarning else StatusError
                                    )
                                }
                            }
                        }
                    } else {
                        items(report.attendances) { att ->
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
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(att.sessionTitle, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        Text(att.date, fontSize = 11.sp, color = TextSecondary)
                                    }
                                    Surface(
                                        color = if (att.isPresent) StatusSuccess.copy(alpha = 0.1f) else StatusError.copy(alpha = 0.1f),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text(
                                            text = if (att.isPresent) "PRESENTE" else "AUSENTE",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Black,
                                            color = if (att.isPresent) StatusSuccess else StatusError,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
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
