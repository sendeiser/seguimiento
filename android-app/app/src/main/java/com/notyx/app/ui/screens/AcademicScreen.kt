package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notyx.app.data.models.AttendanceRecord
import com.notyx.app.data.models.DetailedGradeItem
import com.notyx.app.data.models.Profile
import com.notyx.app.data.repository.StudentRepository
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademicScreen(
    currentProfile: Profile?,
    studentRepository: StudentRepository
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var grades by remember { mutableStateOf<List<DetailedGradeItem>>(emptyList()) }
    var attendances by remember { mutableStateOf<List<AttendanceRecord>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(currentProfile?.id) {
        if (currentProfile != null) {
            isLoading = true
            grades = studentRepository.getDetailedGrades(currentProfile.id)
            attendances = studentRepository.getAttendanceHistory(currentProfile.id)
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BgLightSecondary)
                    .padding(horizontal = 20.dp, vertical = 12.dp)
            ) {
                Text(
                    text = "Seguimiento Académico",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    color = TextPrimary
                )
                Text(
                    text = "Calificaciones y Asistencia",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(14.dp))

                // Custom Tab Selector
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFFE2E8F0).copy(alpha = 0.5f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(4.dp)
                    ) {
                        TabButton(
                            title = "Calificaciones",
                            icon = Icons.Rounded.School,
                            isSelected = selectedTab == 0,
                            modifier = Modifier.weight(1f),
                            onClick = { selectedTab = 0 }
                        )
                        TabButton(
                            title = "Asistencia",
                            icon = Icons.Rounded.EventAvailable,
                            isSelected = selectedTab == 1,
                            modifier = Modifier.weight(1f),
                            onClick = { selectedTab = 1 }
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
                0 -> GradesTab(grades = grades, padding = padding)
                1 -> AttendanceTab(attendances = attendances, padding = padding)
            }
        }
    }
}

@Composable
fun TabButton(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = if (isSelected) Color.White else Color.Transparent,
        shadowElevation = if (isSelected) 2.dp else 0.dp,
        modifier = modifier
    ) {
        Row(
            modifier = Modifier
                .padding(vertical = 10.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isSelected) PrimaryIndigo else TextSecondary,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) PrimaryIndigo else TextSecondary
            )
        }
    }
}

@Composable
fun GradesTab(grades: List<DetailedGradeItem>, padding: PaddingValues) {
    val averageScore = if (grades.isNotEmpty()) {
        grades.map { it.score }.average()
    } else 0.0

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        // Summary Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(26.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "PROMEDIO GENERAL",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.sp,
                                color = TextMuted
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = String.format("%.1f", averageScore),
                                fontSize = 36.sp,
                                fontWeight = FontWeight.Black,
                                color = when {
                                    averageScore >= 7.0 -> StatusSuccess
                                    averageScore >= 4.0 -> StatusWarning
                                    else -> StatusError
                                }
                            )
                        }

                        Surface(
                            color = when {
                                averageScore >= 7.0 -> StatusSuccess.copy(alpha = 0.12f)
                                averageScore >= 4.0 -> StatusWarning.copy(alpha = 0.12f)
                                else -> StatusError.copy(alpha = 0.12f)
                            },
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text(
                                text = when {
                                    averageScore >= 7.0 -> "PROMOCIONADO"
                                    averageScore >= 4.0 -> "REGULAR"
                                    else -> "EN RIESGO"
                                },
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = when {
                                    averageScore >= 7.0 -> StatusSuccess
                                    averageScore >= 4.0 -> StatusWarning
                                    else -> StatusError
                                },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = "Total de evaluaciones registradas: ${grades.size}",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                }
            }
        }

        item {
            Text(
                text = "Desglose de Calificaciones",
                fontSize = 18.sp,
                fontWeight = FontWeight.Black,
                color = TextPrimary,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        if (grades.isEmpty()) {
            item {
                EmptyStateCard(
                    message = "Aún no hay calificaciones registradas para este estudiante.",
                    icon = Icons.Rounded.School
                )
            }
        } else {
            items(grades) { grade ->
                val progress = (grade.score / grade.maxScore).toFloat().coerceIn(0f, 1f)
                val scoreColor = when {
                    grade.score >= 7.0 -> StatusSuccess
                    grade.score >= 4.0 -> StatusWarning
                    else -> StatusError
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = grade.criteriaName,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                grade.sessionTitle?.let {
                                    Text(
                                        text = it,
                                        fontSize = 12.sp,
                                        color = TextSecondary
                                    )
                                }
                            }

                            // Score Badge
                            Surface(
                                color = scoreColor.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = "${grade.score} / ${grade.maxScore.toInt()}",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Black,
                                    color = scoreColor,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Progress bar
                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = scoreColor,
                            trackColor = Color(0xFFF1F5F9)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AttendanceTab(attendances: List<AttendanceRecord>, padding: PaddingValues) {
    val total = attendances.size
    val presentCount = attendances.count { it.isPresent }
    val absentCount = total - presentCount
    val attendancePct = if (total > 0) (presentCount.toFloat() / total.toFloat() * 100).toInt() else 100

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        // Attendance Summary Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(26.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "TASA DE ASISTENCIA",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.sp,
                                color = TextMuted
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "$attendancePct%",
                                fontSize = 36.sp,
                                fontWeight = FontWeight.Black,
                                color = if (attendancePct >= 75) StatusSuccess else StatusError
                            )
                        }

                        Surface(
                            color = if (attendancePct >= 75) StatusSuccess.copy(alpha = 0.12f) else StatusError.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text(
                                text = if (attendancePct >= 75) "CONDICIÓN REGULAR" else "ALERTA ASISTENCIA",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = if (attendancePct >= 75) StatusSuccess else StatusError,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(StatusSuccess))
                            Text("Presentes: $presentCount", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(StatusError))
                            Text("Ausencias: $absentCount", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }
                }
            }
        }

        item {
            Text(
                text = "Historial por Sesión",
                fontSize = 18.sp,
                fontWeight = FontWeight.Black,
                color = TextPrimary,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        if (attendances.isEmpty()) {
            item {
                EmptyStateCard(
                    message = "No hay registros de asistencia para mostrar.",
                    icon = Icons.Rounded.EventAvailable
                )
            }
        } else {
            items(attendances) { record ->
                Card(
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
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (record.isPresent) StatusSuccess.copy(alpha = 0.12f)
                                        else StatusError.copy(alpha = 0.12f)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (record.isPresent) Icons.Rounded.Check else Icons.Rounded.Close,
                                    contentDescription = null,
                                    tint = if (record.isPresent) StatusSuccess else StatusError,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column {
                                Text(
                                    text = record.sessionTitle,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = record.date,
                                    fontSize = 12.sp,
                                    color = TextSecondary
                                )
                            }
                        }

                        Surface(
                            color = if (record.isPresent) StatusSuccess.copy(alpha = 0.1f) else StatusError.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                text = if (record.isPresent) "PRESENTE" else "AUSENTE",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = if (record.isPresent) StatusSuccess else StatusError,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EmptyStateCard(message: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = TextMuted,
                modifier = Modifier.size(40.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = message,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = TextSecondary
            )
        }
    }
}
