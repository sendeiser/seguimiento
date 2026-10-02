package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
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
import com.notyx.app.data.models.Badge
import com.notyx.app.data.models.EnrolledClassItem
import com.notyx.app.data.models.GamificationStats
import com.notyx.app.data.models.Profile
import com.notyx.app.data.repository.StudentRepository
import com.notyx.app.ui.components.CoinBalanceBadge
import com.notyx.app.ui.components.StudentCardView
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun DashboardScreen(
    currentProfile: Profile?,
    studentRepository: StudentRepository,
    onNavigateToAcademic: () -> Unit,
    onNavigateToGamification: () -> Unit = {},
    onNavigateToRanking: () -> Unit,
    onNavigateToShop: () -> Unit,
    onSelectClass: (classId: String, className: String, teacherName: String?) -> Unit
) {
    var stats by remember { mutableStateOf(GamificationStats()) }
    var enrolledClasses by remember { mutableStateOf<List<EnrolledClassItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    var showJoinDialog by remember { mutableStateOf(false) }
    var joinCode by remember { mutableStateOf("") }
    var isJoining by remember { mutableStateOf(false) }
    var joinErrorMessage by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()

    val loadData = {
        if (currentProfile != null) {
            scope.launch {
                isLoading = true
                stats = studentRepository.getStudentStats(currentProfile.id)
                enrolledClasses = studentRepository.getEnrolledClasses(currentProfile.id)
                isLoading = false
            }
        }
    }

    LaunchedEffect(currentProfile?.id) {
        loadData()
    }

    if (showJoinDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!isJoining) {
                    showJoinDialog = false
                    joinErrorMessage = null
                }
            },
            title = {
                Text(
                    text = "Unirse a una Clase",
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp
                )
            },
            text = {
                Column {
                    Text(
                        text = "Pedile a tu profesor el código de 5 caracteres de la materia para inscribirte.",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    OutlinedTextField(
                        value = joinCode,
                        onValueChange = {
                            if (it.length <= 5) joinCode = it.uppercase()
                        },
                        label = { Text("Código de Clase") },
                        placeholder = { Text("Ej: 7X8K2") },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    joinErrorMessage?.let { error ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = error,
                            color = StatusError,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val studentId = currentProfile?.id
                        val studentName = currentProfile?.fullName ?: "Estudiante"
                        if (studentId != null && joinCode.isNotBlank()) {
                            isJoining = true
                            joinErrorMessage = null
                            scope.launch {
                                val result = studentRepository.joinClassByCode(studentId, studentName, joinCode)
                                isJoining = false
                                result.fold(
                                    onSuccess = {
                                        showJoinDialog = false
                                        joinCode = ""
                                        loadData()
                                    },
                                    onFailure = { ex ->
                                        joinErrorMessage = ex.message ?: "Error al inscribirse"
                                    }
                                )
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = !isJoining && joinCode.isNotBlank()
                ) {
                    if (isJoining) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Inscribirse", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showJoinDialog = false
                        joinErrorMessage = null
                    },
                    enabled = !isJoining
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
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BgLightSecondary)
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = PrimaryIndigo,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.size(36.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Rounded.School, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Notyx",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        color = TextPrimary
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = { loadData() }) {
                        Icon(Icons.Rounded.Refresh, contentDescription = "Actualizar", tint = TextSecondary)
                    }
                    CoinBalanceBadge(coins = stats.notyxCoins)
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
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(22.dp)
            ) {
                // Header Greeting
                Column {
                    Text(
                        text = "¡Hola de nuevo!",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSecondary
                    )
                    Text(
                        text = currentProfile?.fullName ?: "Estudiante",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        color = TextPrimary
                    )
                }

                // Main Gamified Student Card
                StudentCardView(
                    studentName = currentProfile?.fullName ?: "Estudiante",
                    stats = stats
                )

                // Quick Navigation Cards
                Text(
                    text = "Accesos Rápidos",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = TextPrimary
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    ActionCard(
                        title = "Boletín",
                        subtitle = "Notas y faltas",
                        icon = Icons.AutoMirrored.Rounded.MenuBook,
                        iconBg = Color(0xFFEFF6FF),
                        iconTint = PrimaryIndigo,
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToAcademic
                    )

                    ActionCard(
                        title = "RPG & Casas",
                        subtitle = "Nivel y logros",
                        icon = Icons.Rounded.Whatshot,
                        iconBg = Color(0xFFF5F3FF),
                        iconTint = Color(0xFF7C3AED),
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToGamification
                    )

                    ActionCard(
                        title = "Bazar",
                        subtitle = "Skins y Poke",
                        icon = Icons.Rounded.ShoppingBag,
                        iconBg = Color(0xFFFDF2F8),
                        iconTint = SkinCyberpunk,
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToShop
                    )
                }

                // Mis Materias Section
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Mis Materias",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )

                        TextButton(
                            onClick = {
                                joinErrorMessage = null
                                showJoinDialog = true
                            },
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(Icons.Rounded.Add, contentDescription = null, tint = PrimaryIndigo, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Unirse",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = PrimaryIndigo
                            )
                        }
                    }

                    if (enrolledClasses.isEmpty()) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "Aún no estás inscripto en ninguna materia",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "Pedile el código a tu docente para empezar a sumar puntos y notas.",
                                    fontSize = 12.sp,
                                    color = TextSecondary,
                                    modifier = Modifier.padding(top = 4.dp, bottom = 14.dp)
                                )
                                Button(
                                    onClick = {
                                        joinErrorMessage = null
                                        showJoinDialog = true
                                    },
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                                ) {
                                    Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Ingresar Código de Clase", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    } else {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(14.dp),
                            contentPadding = PaddingValues(horizontal = 2.dp, vertical = 2.dp)
                        ) {
                            items(items = enrolledClasses, key = { it.id }) { cls ->
                                Card(
                                    onClick = { onSelectClass(cls.id, cls.name, cls.teacherName) },
                                    modifier = Modifier.width(220.dp),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(16.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Surface(
                                                color = Color(0xFFEEF2FF),
                                                shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.size(36.dp)
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Icon(
                                                        Icons.Rounded.School,
                                                        contentDescription = null,
                                                        tint = PrimaryIndigo,
                                                        modifier = Modifier.size(20.dp)
                                                    )
                                                }
                                            }

                                            cls.shortCode?.let { code ->
                                                Surface(
                                                    color = Color(0xFFF1F5F9),
                                                    shape = RoundedCornerShape(8.dp)
                                                ) {
                                                    Text(
                                                        text = code,
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.Black,
                                                        letterSpacing = 1.sp,
                                                        color = Color(0xFF475569),
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                                    )
                                                }
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(12.dp))

                                        Text(
                                            text = cls.name,
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary,
                                            maxLines = 1
                                        )
                                        Text(
                                            text = cls.teacherName?.let { "Prof. $it" } ?: "Docente",
                                            fontSize = 12.sp,
                                            color = TextSecondary,
                                            maxLines = 1
                                        )

                                        Spacer(modifier = Modifier.height(12.dp))

                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Text(
                                                text = "Ver evaluaciones",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = PrimaryIndigo
                                            )
                                            Icon(
                                                Icons.AutoMirrored.Rounded.ArrowForward,
                                                contentDescription = null,
                                                tint = PrimaryIndigo,
                                                modifier = Modifier.size(14.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Badges and Achievements Gallery
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Insignias y Logros",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        val unlockedCount = stats.badges.count { it.unlocked }
                        Text(
                            text = "$unlockedCount / ${stats.badges.size} Desbloqueados",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryIndigo
                        )
                    }

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(horizontal = 2.dp, vertical = 4.dp)
                    ) {
                        items(stats.badges) { badge ->
                            BadgeItem(badge = badge)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ActionCard(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconBg: Color,
    iconTint: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.5.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Surface(
                color = iconBg,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.size(40.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(imageVector = icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(22.dp))
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(subtitle, fontSize = 11.sp, color = TextSecondary)
        }
    }
}

@Composable
fun BadgeItem(badge: Badge) {
    val icon = when (badge.iconName) {
        "Flag" -> Icons.Rounded.Flag
        "Flame" -> Icons.Rounded.Whatshot
        "Whatshot" -> Icons.Rounded.Whatshot
        "Star" -> Icons.Rounded.Star
        "EmojiEvents" -> Icons.Rounded.EmojiEvents
        "TrendingUp" -> Icons.AutoMirrored.Rounded.TrendingUp
        "Favorite" -> Icons.Rounded.Favorite
        else -> Icons.Rounded.EmojiEvents
    }

    val activeColor = when (badge.id) {
        "first_blood" -> Color(0xFF3B82F6)
        "streak_3" -> Color(0xFFF97316)
        "streak_5" -> Color(0xFFEF4444)
        "perfect_score" -> AccentAmber
        "perfectionist" -> Color(0xFFA855F7)
        "resilience" -> StatusSuccess
        "phoenix" -> Color(0xFFF43F5E)
        else -> PrimaryIndigo
    }

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (badge.unlocked) Color.White else Color(0xFFF8FAFC)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (badge.unlocked) 2.dp else 0.dp),
        modifier = Modifier
            .width(135.dp)
            .border(
                width = 1.dp,
                color = if (badge.unlocked) activeColor.copy(alpha = 0.3f) else BorderLight,
                shape = RoundedCornerShape(20.dp)
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(
                        if (badge.unlocked) activeColor.copy(alpha = 0.15f)
                        else Color(0xFFE2E8F0)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (badge.unlocked) activeColor else TextMuted,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = badge.label,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = if (badge.unlocked) TextPrimary else TextMuted,
                maxLines = 1
            )
            Text(
                text = badge.description,
                fontSize = 9.sp,
                color = TextSecondary,
                lineHeight = 11.sp,
                maxLines = 2
            )
        }
    }
}
