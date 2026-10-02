package com.notyx.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.MonetizationOn
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.Whatshot
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notyx.app.data.models.GamificationStats
import com.notyx.app.ui.theme.*

@Composable
fun StudentCardView(
    studentName: String,
    stats: GamificationStats,
    modifier: Modifier = Modifier
) {
    // Skin border styling
    val borderColor = when (stats.equippedSkin) {
        "Cyberpunk Neon" -> SkinCyberpunk
        "Oro Holográfico" -> SkinGold
        "Galaxia" -> SkinGalaxy
        "Minimalista Oscuro" -> SkinMinimalist
        else -> PrimaryIndigo
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .border(2.dp, borderColor.copy(alpha = 0.6f), RoundedCornerShape(28.dp)),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = BgLightPrimary),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            // Top Row: Avatar & Level
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(listOf(PrimaryIndigo, Color(0xFF818CF8)))
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = studentName.take(1).uppercase(),
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column {
                        Text(
                            text = studentName,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black
                        )
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Surface(
                                color = Color(stats.rankColor).copy(alpha = 0.15f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = stats.rankName.uppercase(),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(stats.rankColor)
                                )
                            }
                            if (stats.equippedSkin != null) {
                                Text(
                                    text = "• ${stats.equippedSkin}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = borderColor
                                )
                            }
                        }
                    }
                }

                // Level Badge
                Surface(
                    color = PrimaryIndigo.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(16.dp),
                    border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(PrimaryIndigo, Color(0xFF818CF8))))
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "NIVEL",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = PrimaryIndigo
                        )
                        Text(
                            text = "${stats.currentLevel}",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = PrimaryIndigo
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // XP Progress Bar
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Progreso de Nivel", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Text(
                        text = "${stats.currentLevelXP} / ${stats.nextLevelXP} XP",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = PrimaryIndigo
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { (stats.currentLevelXP.toFloat() / stats.nextLevelXP.toFloat()).coerceIn(0f, 1f) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                        .clip(RoundedCornerShape(5.dp)),
                    color = PrimaryIndigo,
                    trackColor = Color(0xFFEEF2FF)
                )
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Stats Footer (HP, Racha, Monedas)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                StatPill(
                    icon = Icons.Rounded.Shield,
                    label = "Vida",
                    value = "${stats.hp} HP",
                    color = if (stats.hp > 50) StatusSuccess else StatusError
                )
                StatPill(
                    icon = Icons.Rounded.Whatshot,
                    label = "Racha",
                    value = "${stats.streak} días",
                    color = Color(0xFFEA580C)
                )
                StatPill(
                    icon = Icons.Rounded.MonetizationOn,
                    label = "Coins",
                    value = "${stats.notyxCoins}",
                    color = AccentAmber
                )
            }
        }
    }
}

@Composable
fun StatPill(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    color: Color
) {
    Surface(
        color = color.copy(alpha = 0.08f),
        shape = RoundedCornerShape(14.dp),
        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(color.copy(alpha = 0.2f), color.copy(alpha = 0.1f))))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(imageVector = icon, contentDescription = label, tint = color, modifier = Modifier.size(16.dp))
            Column {
                Text(text = label.uppercase(), fontSize = 8.sp, fontWeight = FontWeight.Black, color = color.copy(alpha = 0.8f))
                Text(text = value, fontSize = 12.sp, fontWeight = FontWeight.Black, color = TextPrimary)
            }
        }
    }
}

@Composable
fun CoinBalanceBadge(coins: Int) {
    Surface(
        color = BgLightPrimary,
        shape = RoundedCornerShape(16.dp),
        shadowElevation = 3.dp,
        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(AccentAmber.copy(alpha = 0.4f), AccentAmber.copy(alpha = 0.1f))))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(26.dp)
                    .clip(CircleShape)
                    .background(AccentAmber),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Rounded.MonetizationOn,
                    contentDescription = "Monedas",
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
            Column {
                Text(text = "SALDO NOTYX", fontSize = 8.sp, fontWeight = FontWeight.Black, color = TextMuted)
                Text(text = "$coins", fontSize = 14.sp, fontWeight = FontWeight.Black, color = AccentAmber)
            }
        }
    }
}
