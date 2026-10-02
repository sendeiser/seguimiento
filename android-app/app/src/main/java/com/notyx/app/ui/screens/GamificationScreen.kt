package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notyx.app.data.models.Badge
import com.notyx.app.data.models.GamificationStats
import com.notyx.app.data.models.Profile
import com.notyx.app.data.repository.StudentRepository
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GamificationScreen(
    currentProfile: Profile?,
    studentRepository: StudentRepository,
    onNavigateToShop: () -> Unit
) {
    var stats by remember { mutableStateOf(GamificationStats()) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(currentProfile?.id) {
        if (currentProfile != null) {
            isLoading = true
            stats = studentRepository.getStudentStats(currentProfile.id)
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Gamificación Notyx",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        Text(
                            text = "Nivel, Rango, Desafíos y Logros",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextSecondary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BgLightSecondary)
            )
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
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(top = 8.dp, bottom = 24.dp)
            ) {
                // 1. HERO PLAYER CARD
                item {
                    HeroPlayerCard(stats = stats, currentProfile = currentProfile)
                }

                // 2. CASA HERÁLDICA (CLASS HOUSES)
                item {
                    HouseCard(stats = stats)
                }

                // 3. STATS TRIO
                item {
                    StatsTrioCard(stats = stats, onNavigateToShop = onNavigateToShop)
                }

                // 4. MISIONES Y DESAFÍOS
                item {
                    MissionsSection()
                }

                // 5. VITRINA DE INSIGNIAS Y LOGROS
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Insignias y Logros",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        val unlockedCount = stats.badges.count { it.unlocked }
                        Surface(
                            color = PrimaryIndigoLight,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "$unlockedCount / ${stats.badges.size} desbloqueados",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = PrimaryIndigo,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                items(stats.badges) { badge ->
                    BadgeCard(badge = badge)
                }
            }
        }
    }
}

@Composable
fun HeroPlayerCard(stats: GamificationStats, currentProfile: Profile?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(22.dp)) {
            // Top Row: Avatar + Name + Rank Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    listOf(Color(0xFF4F46E5), Color(0xFF9333EA))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Person,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(30.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column {
                        Text(
                            text = currentProfile?.fullName ?: "Estudiante",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                        Text(
                            text = "Nivel ${stats.currentLevel} • Aventurero",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8)
                        )
                    }
                }

                Surface(
                    color = Color(stats.rankColor).copy(alpha = 0.25f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(stats.rankColor))
                ) {
                    Text(
                        text = stats.rankName.uppercase(),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.5.sp,
                        color = Color(stats.rankColor),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // XP PROGRESS BAR
            val xpProgress = if (stats.nextLevelXP > 0) {
                (stats.currentLevelXP.toFloat() / stats.nextLevelXP.toFloat()).coerceIn(0f, 1f)
            } else 0f

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Rounded.Star,
                        contentDescription = null,
                        tint = Color(0xFFA855F7),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Experiencia (XP)",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFCBD5E1)
                    )
                }
                Text(
                    text = "${stats.currentLevelXP} / ${stats.nextLevelXP} XP",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFFA855F7)
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            LinearProgressIndicator(
                progress = { xpProgress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = Color(0xFFA855F7),
                trackColor = Color(0xFF1E293B)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // HP VITALITY BAR
            val hpProgress = (stats.hp.toFloat() / stats.maxHp.toFloat()).coerceIn(0f, 1f)
            val hpColor = when {
                stats.hp >= 60 -> Color(0xFF10B981)
                stats.hp >= 30 -> Color(0xFFF59E0B)
                else -> Color(0xFFEF4444)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Rounded.Favorite,
                        contentDescription = null,
                        tint = hpColor,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Vitalidad (HP)",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFCBD5E1)
                    )
                }
                Text(
                    text = "${stats.hp} / ${stats.maxHp} HP",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = hpColor
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            LinearProgressIndicator(
                progress = { hpProgress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = hpColor,
                trackColor = Color(0xFF1E293B)
            )
        }
    }
}

@Composable
fun HouseCard(stats: GamificationStats) {
    val house = stats.house
    if (house != null) {
        val houseColor = when {
            house.name.contains("Drag", ignoreCase = true) -> HouseDragons
            house.name.contains("Lobo", ignoreCase = true) -> HouseWolves
            else -> HouseEagles
        }
        val houseBg = when {
            house.name.contains("Drag", ignoreCase = true) -> HouseDragonsBg
            house.name.contains("Lobo", ignoreCase = true) -> HouseWolvesBg
            else -> HouseEaglesBg
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = houseBg),
            border = androidx.compose.foundation.BorderStroke(1.5.dp, houseColor.copy(alpha = 0.35f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = house.icon ?: "🛡️",
                        fontSize = 32.sp
                    )
                    Spacer(modifier = Modifier.width(14.dp))
                    Column {
                        Text(
                            text = "CASA DE CLASE",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp,
                            color = houseColor
                        )
                        Text(
                            text = house.name,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        Text(
                            text = "Equipo asignado en el aula",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }
                }

                Surface(
                    color = houseColor,
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text(
                        text = "MI CASA",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }
        }
    } else {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = androidx.compose.foundation.BorderStroke(1.dp, BorderLight)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = "🏰", fontSize = 26.sp)
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "Casa de Clase Pendiente",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Tu docente te asignará una casa (Dragones, Lobos o Águilas) próximamente.",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}

@Composable
fun StatsTrioCard(stats: GamificationStats, onNavigateToShop: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Racha Actual
        Card(
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = androidx.compose.foundation.BorderStroke(1.dp, BorderLight),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(text = "🔥", fontSize = 22.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${stats.streak}",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = StreakOrange
                )
                Text(
                    text = "Racha Actual",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary
                )
            }
        }

        // Racha Máxima
        Card(
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = androidx.compose.foundation.BorderStroke(1.dp, BorderLight),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(text = "🛡️", fontSize = 22.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${maxOf(stats.streak, 3)}",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = PrimaryIndigo
                )
                Text(
                    text = "Racha Récord",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary
                )
            }
        }

        // Notyx Coins (Clickable to shop)
        Card(
            onClick = onNavigateToShop,
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = AccentAmberLight),
            border = androidx.compose.foundation.BorderStroke(1.dp, AccentAmber.copy(alpha = 0.4f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(text = "🪙", fontSize = 22.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${stats.notyxCoins}",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = AccentAmberDark
                )
                Text(
                    text = "Ver Bazar ➜",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = AccentAmberDark
                )
            }
        }
    }
}

@Composable
fun MissionsSection() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderLight)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Misiones Semanales",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Black,
                    color = TextPrimary
                )
                Surface(
                    color = StatusSuccessBg,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "RECOMPENSAS ACTIVAS",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        color = StatusSuccess,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            MissionItem(
                title = "Asistencia Impecable",
                description = "Asistí a todas las clases de la semana sin ausencias",
                rewardXp = 60,
                rewardCoins = 30,
                isCompleted = true
            )

            HorizontalDivider(color = BorderLight, modifier = Modifier.padding(vertical = 10.dp))

            MissionItem(
                title = "Excelencia en Evaluaciones",
                description = "Obtené una calificación igual o superior a 8.0 en la sesión",
                rewardXp = 80,
                rewardCoins = 45,
                isCompleted = false
            )

            HorizontalDivider(color = BorderLight, modifier = Modifier.padding(vertical = 10.dp))

            MissionItem(
                title = "Coleccionista del Bazar",
                description = "Canjeá una skin temática o capturá un compañero Pokémon",
                rewardXp = 50,
                rewardCoins = 25,
                isCompleted = false
            )
        }
    }
}

@Composable
fun MissionItem(
    title: String,
    description: String,
    rewardXp: Int,
    rewardCoins: Int,
    isCompleted: Boolean
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = description,
                fontSize = 11.sp,
                color = TextSecondary,
                modifier = Modifier.padding(top = 2.dp, bottom = 4.dp)
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "+$rewardXp XP",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF8B5CF6)
                )
                Text(
                    text = "+$rewardCoins Monedas 🪙",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = AccentAmberDark
                )
            }
        }

        Surface(
            color = if (isCompleted) StatusSuccessBg else Color(0xFFF1F5F9),
            shape = RoundedCornerShape(10.dp),
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                if (isCompleted) StatusSuccessBorder else BorderLight
            )
        ) {
            Text(
                text = if (isCompleted) "Completada" else "En progreso",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = if (isCompleted) StatusSuccess else TextSecondary,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}

@Composable
fun BadgeCard(badge: Badge) {
    val isUnlocked = badge.unlocked

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isUnlocked) Color.White else Color(0xFFF8FAFC)
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isUnlocked) PrimaryIndigo.copy(alpha = 0.2f) else BorderLight
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isUnlocked) 1.5.dp else 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(
                        if (isUnlocked) PrimaryIndigoLight else Color(0xFFE2E8F0)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when (badge.iconName) {
                        "Flame" -> Icons.Rounded.Whatshot
                        "Whatshot" -> Icons.Rounded.Whatshot
                        "Star" -> Icons.Rounded.Star
                        "EmojiEvents" -> Icons.Rounded.EmojiEvents
                        "TrendingUp" -> Icons.AutoMirrored.Rounded.TrendingUp
                        "Favorite" -> Icons.Rounded.Favorite
                        else -> Icons.Rounded.Flag
                    },
                    contentDescription = null,
                    tint = if (isUnlocked) PrimaryIndigo else Color(0xFF94A3B8),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = badge.label,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = if (isUnlocked) TextPrimary else TextMuted
                )
                Text(
                    text = badge.description,
                    fontSize = 12.sp,
                    color = if (isUnlocked) TextSecondary else TextMuted
                )
            }

            Surface(
                color = if (isUnlocked) StatusSuccessBg else Color(0xFFF1F5F9),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = if (isUnlocked) "DESBLOQUEADO" else "BLOQUEADO",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    color = if (isUnlocked) StatusSuccess else Color(0xFF94A3B8),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}
