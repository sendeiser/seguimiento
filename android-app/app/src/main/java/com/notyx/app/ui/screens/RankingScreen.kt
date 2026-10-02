package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notyx.app.data.models.RankingStudent
import com.notyx.app.data.repository.StudentRepository
import com.notyx.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RankingScreen(
    studentRepository: StudentRepository
) {
    var rankingList by remember { mutableStateOf<List<RankingStudent>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        isLoading = true
        rankingList = studentRepository.getGlobalRanking()
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Ranking Global",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = TextPrimary
                    )
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
                verticalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(vertical = 16.dp)
            ) {
                // Top 3 Podium Card (if we have at least 3 students)
                if (rankingList.size >= 3) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(28.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "PODIO DE HONOR",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = 1.sp,
                                    color = AccentAmber
                                )
                                Spacer(modifier = Modifier.height(18.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly,
                                    verticalAlignment = Alignment.Bottom
                                ) {
                                    // 2nd place (Plata)
                                    PodiumPillar(
                                        student = rankingList[1],
                                        place = 2,
                                        badgeColor = Color(0xFF94A3B8),
                                        height = 110.dp
                                    )
                                    // 1st place (Oro)
                                    PodiumPillar(
                                        student = rankingList[0],
                                        place = 1,
                                        badgeColor = AccentAmber,
                                        height = 140.dp
                                    )
                                    // 3rd place (Bronce)
                                    PodiumPillar(
                                        student = rankingList[2],
                                        place = 3,
                                        badgeColor = Color(0xFFB45309),
                                        height = 95.dp
                                    )
                                }
                            }
                        }
                    }
                }

                // Full Ranking List Header
                item {
                    Text(
                        text = "Tabla de Posiciones",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        color = TextPrimary,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }

                // Students List
                items(rankingList) { student ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Position number badge
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        when (student.rankPosition) {
                                            1 -> AccentAmber.copy(alpha = 0.2f)
                                            2 -> Color(0xFF94A3B8).copy(alpha = 0.2f)
                                            3 -> Color(0xFFB45309).copy(alpha = 0.2f)
                                            else -> Color(0xFFF1F5F9)
                                        }
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "#${student.rankPosition}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Black,
                                    color = when (student.rankPosition) {
                                        1 -> AccentAmber
                                        2 -> Color(0xFF64748B)
                                        3 -> Color(0xFFB45309)
                                        else -> TextSecondary
                                    }
                                )
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = student.name,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "${student.rankName} • Nivel ${student.level}",
                                    fontSize = 12.sp,
                                    color = TextSecondary
                                )
                            }

                            Text(
                                text = "${student.xp} XP",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Black,
                                color = PrimaryIndigo
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PodiumPillar(
    student: RankingStudent,
    place: Int,
    badgeColor: Color,
    height: androidx.compose.ui.unit.Dp
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(86.dp)
    ) {
        // Place badge
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(badgeColor),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "$place",
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = student.name.split(" ").firstOrNull() ?: student.name,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary,
            maxLines = 1
        )
        Text(
            text = "${student.xp} XP",
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            color = PrimaryIndigo
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Pillar block
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(height)
                .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                .background(badgeColor.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Rounded.EmojiEvents,
                contentDescription = null,
                tint = badgeColor,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}
