package com.notyx.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notyx.app.data.models.GamificationStats
import com.notyx.app.data.repository.StudentRepository
import com.notyx.app.ui.theme.PrimaryIndigo
import com.notyx.app.ui.theme.TextPrimary
import com.notyx.app.ui.theme.TextSecondary
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random

@Composable
fun MiniGamesSection(
    classStudentId: String,
    studentName: String,
    stats: GamificationStats,
    studentRepository: StudentRepository,
    onCoinsEarned: (coins: Int, xp: Int) -> Unit
) {
    var activeGame by remember { mutableStateOf<String?>(null) } // null = Hub, "math_blitz", "memory_match", "pyramyx"

    when (activeGame) {
        "math_blitz" -> {
            MathBlitzGameScreen(
                classStudentId = classStudentId,
                studentRepository = studentRepository,
                onExit = { activeGame = null },
                onReward = { coins, xp ->
                    onCoinsEarned(coins, xp)
                }
            )
        }
        "memory_match" -> {
            MemoryMatchGameScreen(
                classStudentId = classStudentId,
                studentRepository = studentRepository,
                onExit = { activeGame = null },
                onReward = { coins, xp ->
                    onCoinsEarned(coins, xp)
                }
            )
        }
        "pyramyx" -> {
            PyramyxGameScreen(
                classStudentId = classStudentId,
                studentRepository = studentRepository,
                onExit = { activeGame = null },
                onReward = { coins, xp ->
                    onCoinsEarned(coins, xp)
                }
            )
        }
        else -> {
            GamesHubScreen(
                studentName = studentName,
                coins = stats.notyxCoins,
                onSelectGame = { gameId -> activeGame = gameId }
            )
        }
    }
}

// =========================================================================
// 1. GAMES HUB
// =========================================================================
@Composable
fun GamesHubScreen(
    studentName: String,
    coins: Int,
    onSelectGame: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        // Banner Superior de la Arena
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFFEA580C), Color(0xFFD97706), Color(0xFFF59E0B))
                            )
                        )
                        .padding(20.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Surface(
                                    shape = CircleShape,
                                    color = Color.White.copy(alpha = 0.2f),
                                    modifier = Modifier.size(44.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text("🎮", fontSize = 24.sp)
                                    }
                                }
                                Column {
                                    Text(
                                        text = "Arena Notyx Play",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White
                                    )
                                    Text(
                                        text = "Entrena tu mente y gana Notyx Coins",
                                        fontSize = 11.sp,
                                        color = Color.White.copy(alpha = 0.85f)
                                    )
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = Color.White
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text("🪙", fontSize = 14.sp)
                                    Text(
                                        text = "$coins",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 14.sp,
                                        color = Color(0xFFB45309)
                                    )
                                }
                            }
                        }

                        Text(
                            text = "¡Hola, $studentName! Juega los minijuegos para ganar monedas y comprar recompensas y Pokémon exclusivos en el Bazar.",
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                }
            }
        }

        // Listado de Minijuegos
        item {
            Text(
                text = "MINIJUEGOS DISPONIBLES",
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                color = TextSecondary,
                letterSpacing = 1.sp
            )
        }

        // Juego 1: Math Blitz
        item {
            GameCard(
                title = "Math Blitz ⚡",
                subtitle = "Cálculo mental ultra rápido",
                description = "Resuelve la mayor cantidad de operaciones matemáticas en 30 segundos. ¡Rachas otorgan bonus de monedas!",
                badgeText = "30 Segundos",
                rewardText = "Hasta 15 Coins 🪙",
                gradient = listOf(Color(0xFFFFF7ED), Color(0xFFFFEDD5)),
                borderColor = Color(0xFFFDBA74),
                iconBg = Color(0xFFEA580C),
                icon = { Icon(Icons.Rounded.Bolt, contentDescription = null, tint = Color.White) },
                onClick = { onSelectGame("math_blitz") }
            )
        }

        // Juego 2: Memory Match
        item {
            GameCard(
                title = "Memory Match 🧩",
                subtitle = "Memoria visual y concentración",
                description = "Encuentra todas las parejas de cartas en el menor tiempo y movimientos posibles.",
                badgeText = "Agilidad Mental",
                rewardText = "Hasta 12 Coins 🪙",
                gradient = listOf(Color(0xFFEEF2FF), Color(0xFFE0E7FF)),
                borderColor = Color(0xFFA5B4FC),
                iconBg = Color(0xFF4F46E5),
                icon = { Icon(Icons.Rounded.Extension, contentDescription = null, tint = Color.White) },
                onClick = { onSelectGame("memory_match") }
            )
        }

        // Juego 3: Pyramyx
        item {
            GameCard(
                title = "Pyramyx 📐",
                subtitle = "Pirámide lógica de sumas",
                description = "Descubre los números ocultos. Cada bloque es la suma de los dos bloques que lo sostienen.",
                badgeText = "Deducción Lógica",
                rewardText = "Hasta 10 Coins 🪙",
                gradient = listOf(Color(0xFFECFDF5), Color(0xFFD1FAE5)),
                borderColor = Color(0xFF6EE7B7),
                iconBg = Color(0xFF059669),
                icon = { Icon(Icons.Rounded.Calculate, contentDescription = null, tint = Color.White) },
                onClick = { onSelectGame("pyramyx") }
            )
        }
    }
}

@Composable
fun GameCard(
    title: String,
    subtitle: String,
    description: String,
    badgeText: String,
    rewardText: String,
    gradient: List<Color>,
    borderColor: Color,
    iconBg: Color,
    icon: @Composable () -> Unit,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = androidx.compose.foundation.BorderStroke(1.5.dp, borderColor)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.linearGradient(gradient))
                .padding(18.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = iconBg,
                            modifier = Modifier.size(46.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) { icon() }
                        }
                        Column {
                            Text(title, fontWeight = FontWeight.Black, fontSize = 16.sp, color = TextPrimary)
                            Text(subtitle, fontSize = 11.sp, color = TextSecondary)
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color.White.copy(alpha = 0.8f)
                    ) {
                        Text(
                            text = badgeText,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }

                Text(description, fontSize = 12.sp, color = Color(0xFF475569), lineHeight = 16.sp)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFFEF3C7)
                    ) {
                        Text(
                            text = rewardText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFB45309),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Jugar ahora", fontSize = 12.sp, fontWeight = FontWeight.Black, color = iconBg)
                        Icon(Icons.Rounded.ArrowForward, contentDescription = null, tint = iconBg, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

// =========================================================================
// 2. MATH BLITZ GAME (CONTRARRELOJ 30S)
// =========================================================================
@Composable
fun MathBlitzGameScreen(
    classStudentId: String,
    studentRepository: StudentRepository,
    onExit: () -> Unit,
    onReward: (coins: Int, xp: Int) -> Unit
) {
    val scope = rememberCoroutineScope()
    var difficulty by remember { mutableStateOf("easy") } // easy, medium, hard
    var timeLeft by remember { mutableIntStateOf(30) }
    var status by remember { mutableStateOf("ready") } // ready, playing, finished
    var score by remember { mutableIntStateOf(0) }
    var currentStreak by remember { mutableIntStateOf(0) }
    var problemText by remember { mutableStateOf("") }
    var expectedAnswer by remember { mutableIntStateOf(0) }
    var userInput by remember { mutableStateOf("") }
    var earnedCoins by remember { mutableIntStateOf(0) }
    var earnedXP by remember { mutableIntStateOf(0) }

    fun generateProblem() {
        val max = when (difficulty) {
            "easy" -> 10
            "medium" -> 35
            else -> 80
        }
        val op = when (difficulty) {
            "easy" -> if (Random.nextBoolean()) "+" else "-"
            "medium" -> listOf("+", "-", "*").random()
            else -> listOf("+", "-", "*").random()
        }

        val a = Random.nextInt(1, max + 1)
        val b = if (op == "*") Random.nextInt(2, if (difficulty == "medium") 6 else 10) else Random.nextInt(1, max + 1)

        val (first, second) = if (op == "-" && a < b) b to a else a to b
        val res = when (op) {
            "+" -> first + second
            "-" -> first - second
            "*" -> first * second
            else -> first + second
        }
        val symbol = if (op == "*") "×" else op
        problemText = "$first $symbol $second"
        expectedAnswer = res
        userInput = ""
    }

    fun startGame() {
        score = 0
        currentStreak = 0
        timeLeft = 30
        status = "playing"
        generateProblem()
    }

    // Timer de 30 segundos
    LaunchedEffect(status, timeLeft) {
        if (status == "playing") {
            if (timeLeft > 0) {
                delay(1000)
                timeLeft -= 1
            } else {
                status = "finished"
                val coins = when {
                    score >= 12 -> 15
                    score >= 8 -> 10
                    score >= 4 -> 6
                    score >= 1 -> 3
                    else -> 1
                }
                val xp = (score * 12).coerceAtLeast(15)
                earnedCoins = coins
                earnedXP = xp
                scope.launch {
                    studentRepository.saveGameProgress(classStudentId, "Math Blitz", difficulty, score, coins)
                }
                onReward(coins, xp)
            }
        }
    }

    fun checkAnswer(valStr: String) {
        val parsed = valStr.toIntOrNull()
        if (parsed != null && parsed == expectedAnswer) {
            score += 1
            currentStreak += 1
            generateProblem()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Barra Superior
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onExit) {
                Icon(Icons.Rounded.ArrowBack, contentDescription = "Volver")
            }
            Text("Math Blitz ⚡", fontWeight = FontWeight.Black, fontSize = 18.sp, color = TextPrimary)
            Surface(
                color = if (timeLeft <= 5) Color(0xFFFEE2E2) else Color(0xFFFEF3C7),
                shape = RoundedCornerShape(10.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(Icons.Rounded.Timer, contentDescription = null, tint = if (timeLeft <= 5) Color(0xFFDC2626) else Color(0xFFB45309), modifier = Modifier.size(16.dp))
                    Text(
                        text = "${timeLeft}s",
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        color = if (timeLeft <= 5) Color(0xFFDC2626) else Color(0xFFB45309)
                    )
                }
            }
        }

        when (status) {
            "ready" -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text("⚡", fontSize = 48.sp)
                        Text("Reto de Cálculo Mental", fontWeight = FontWeight.Black, fontSize = 20.sp, color = TextPrimary)
                        Text(
                            "Tienes 30 segundos para resolver todas las operaciones que puedas. ¡Elige tu nivel de dificultad!",
                            textAlign = TextAlign.Center,
                            fontSize = 13.sp,
                            color = TextSecondary
                        )

                        // Selector de Dificultad
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(
                                "easy" to "Fácil (1-10)",
                                "medium" to "Medio (×)",
                                "hard" to "Pro (Difícil)"
                            ).forEach { (diff, label) ->
                                val isSel = difficulty == diff
                                FilterChip(
                                    selected = isSel,
                                    onClick = { difficulty = diff },
                                    label = { Text(label, fontWeight = if (isSel) FontWeight.Black else FontWeight.Normal, fontSize = 11.sp) }
                                )
                            }
                        }

                        Button(
                            onClick = { startGame() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C))
                        ) {
                            Text("¡Empezar a Jugar!", fontWeight = FontWeight.Black, fontSize = 16.sp)
                        }
                    }
                }
            }

            "playing" -> {
                // Racha y Puntaje
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(color = Color(0xFFDCFCE7), shape = RoundedCornerShape(10.dp)) {
                        Text("Aciertos: $score", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFF15803D), modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
                    }
                    Surface(color = Color(0xFFFFEDD5), shape = RoundedCornerShape(10.dp)) {
                        Text("Racha: 🔥 $currentStreak", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFFC2410C), modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
                    }
                }

                // Operación en Grande
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(130.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = androidx.compose.foundation.BorderStroke(2.dp, Color(0xFFFED7AA))
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = problemText,
                                fontSize = 42.sp,
                                fontWeight = FontWeight.Black,
                                color = TextPrimary
                            )
                            Text(
                                text = if (userInput.isEmpty()) "= ?" else "= $userInput",
                                fontSize = 26.sp,
                                fontWeight = FontWeight.Black,
                                color = if (userInput.isEmpty()) TextSecondary else Color(0xFFEA580C)
                            )
                        }
                    }
                }

                // Teclado Numérico Táctil Rápido
                val keys = listOf(
                    listOf("1", "2", "3"),
                    listOf("4", "5", "6"),
                    listOf("7", "8", "9"),
                    listOf("C", "0", "✓")
                )

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    keys.forEach { rowKeys ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            rowKeys.forEach { k ->
                                Button(
                                    onClick = {
                                        when (k) {
                                            "C" -> userInput = ""
                                            "✓" -> checkAnswer(userInput)
                                            else -> {
                                                val next = userInput + k
                                                userInput = next
                                                checkAnswer(next)
                                            }
                                        }
                                    },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(54.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = when (k) {
                                            "C" -> Color(0xFFF1F5F9)
                                            "✓" -> Color(0xFF10B981)
                                            else -> Color.White
                                        },
                                        contentColor = when (k) {
                                            "C" -> Color(0xFF64748B)
                                            "✓" -> Color.White
                                            else -> TextPrimary
                                        }
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                                ) {
                                    Text(k, fontSize = 20.sp, fontWeight = FontWeight.Black)
                                }
                            }
                        }
                    }
                }
            }

            "finished" -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = androidx.compose.foundation.BorderStroke(2.dp, Color(0xFFF59E0B))
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text("🏆", fontSize = 48.sp)
                        Text("¡Tiempo Agotado!", fontWeight = FontWeight.Black, fontSize = 22.sp, color = TextPrimary)

                        Text(
                            text = "Lograste $score aciertos en 30 segundos",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary
                        )

                        // Recompensa
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = Color(0xFFFEF3C7),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceAround,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Monedas Ganadas", fontSize = 11.sp, color = Color(0xFF92400E))
                                    Text("+$earnedCoins Coins 🪙", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFFB45309))
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Experiencia", fontSize = 11.sp, color = Color(0xFF92400E))
                                    Text("+$earnedXP XP ⭐", fontSize = 18.sp, fontWeight = FontWeight.Black, color = PrimaryIndigo)
                                }
                            }
                        }

                        Button(
                            onClick = { startGame() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C))
                        ) {
                            Text("Jugar otra vez", fontWeight = FontWeight.Black, fontSize = 15.sp)
                        }

                        OutlinedButton(
                            onClick = onExit,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Volver a la Arena", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

// =========================================================================
// 3. MEMORY MATCH GAME (MEMOTEST)
// =========================================================================
data class MemoryCardItem(
    val id: Int,
    val icon: String,
    var isFlipped: Boolean = false,
    var isMatched: Boolean = false
)

@Composable
fun MemoryMatchGameScreen(
    classStudentId: String,
    studentRepository: StudentRepository,
    onExit: () -> Unit,
    onReward: (coins: Int, xp: Int) -> Unit
) {
    val scope = rememberCoroutineScope()
    val baseIcons = listOf("⚡", "🔥", "💧", "🌿", "🌟", "🛡️", "⚔️", "🏆")
    var cards by remember { mutableStateOf<List<MemoryCardItem>>(emptyList()) }
    var selectedCards by remember { mutableStateOf<List<Int>>(emptyList()) }
    var moves by remember { mutableIntStateOf(0) }
    var matches by remember { mutableIntStateOf(0) }
    var isWon by remember { mutableStateOf(false) }

    fun initGame() {
        val pairs = (baseIcons + baseIcons).shuffled()
        cards = pairs.mapIndexed { index, icon ->
            MemoryCardItem(id = index, icon = icon)
        }
        selectedCards = emptyList()
        moves = 0
        matches = 0
        isWon = false
    }

    LaunchedEffect(Unit) {
        initGame()
    }

    fun onCardClick(cardId: Int) {
        if (selectedCards.size >= 2) return
        val card = cards.firstOrNull { it.id == cardId } ?: return
        if (card.isFlipped || card.isMatched) return

        val newCards = cards.map {
            if (it.id == cardId) it.copy(isFlipped = true) else it
        }
        cards = newCards

        val newSelected = selectedCards + cardId
        selectedCards = newSelected

        if (newSelected.size == 2) {
            moves += 1
            val c1 = cards.first { it.id == newSelected[0] }
            val c2 = cards.first { it.id == newSelected[1] }

            if (c1.icon == c2.icon) {
                // Match
                matches += 1
                cards = cards.map {
                    if (it.id == c1.id || it.id == c2.id) it.copy(isMatched = true) else it
                }
                selectedCards = emptyList()
                if (matches == baseIcons.size) {
                    isWon = true
                    val coins = 12
                    val xp = 70
                    scope.launch {
                        studentRepository.saveGameProgress(classStudentId, "Memory Match", "normal", moves, coins)
                    }
                    onReward(coins, xp)
                }
            } else {
                // No match, voltear tras retardo
                scope.launch {
                    delay(700)
                    cards = cards.map {
                        if (it.id == c1.id || it.id == c2.id) it.copy(isFlipped = false) else it
                    }
                    selectedCards = emptyList()
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Barra Superior
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onExit) {
                Icon(Icons.Rounded.ArrowBack, contentDescription = "Volver")
            }
            Text("Memory Match 🧩", fontWeight = FontWeight.Black, fontSize = 18.sp, color = TextPrimary)
            IconButton(onClick = { initGame() }) {
                Icon(Icons.Rounded.Refresh, contentDescription = "Reiniciar")
            }
        }

        // Estadísticas de la Partida
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            Surface(color = Color(0xFFEEF2FF), shape = RoundedCornerShape(10.dp)) {
                Text("Movimientos: $moves", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = PrimaryIndigo, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
            }
            Surface(color = Color(0xFFDCFCE7), shape = RoundedCornerShape(10.dp)) {
                Text("Parejas: $matches / ${baseIcons.size}", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF15803D), modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
            }
        }

        if (isWon) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(2.dp, Color(0xFF10B981))
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("🎉", fontSize = 48.sp)
                    Text("¡Excelente Memoria!", fontWeight = FontWeight.Black, fontSize = 20.sp, color = TextPrimary)
                    Text("Completaste el tablero en solo $moves movimientos.", fontSize = 13.sp, color = TextSecondary)
                    Surface(color = Color(0xFFFEF3C7), shape = RoundedCornerShape(12.dp)) {
                        Text("¡Ganaste +12 Notyx Coins 🪙 y +70 XP ⭐!", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFFB45309), modifier = Modifier.padding(10.dp))
                    }
                    Button(
                        onClick = { initGame() },
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Jugar otra partida", fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            // Tablero de 16 cartas (4x4)
            LazyVerticalGrid(
                columns = GridCells.Fixed(4),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(cards, key = { it.id }) { card ->
                    Card(
                        modifier = Modifier
                            .aspectRatio(1f)
                            .clickable { onCardClick(card.id) },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = when {
                                card.isMatched -> Color(0xFFDCFCE7)
                                card.isFlipped -> Color.White
                                else -> Color(0xFF4F46E5)
                            }
                        ),
                        border = androidx.compose.foundation.BorderStroke(
                            1.5.dp,
                            if (card.isMatched) Color(0xFF86EFAC) else Color(0xFFE0E7FF)
                        )
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            if (card.isFlipped || card.isMatched) {
                                Text(card.icon, fontSize = 28.sp)
                            } else {
                                Text("?", fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
}

// =========================================================================
// 4. PYRAMYX GAME (PIRÁMIDE DE NÚMEROS)
// =========================================================================
@Composable
fun PyramyxGameScreen(
    classStudentId: String,
    studentRepository: StudentRepository,
    onExit: () -> Unit,
    onReward: (coins: Int, xp: Int) -> Unit
) {
    val scope = rememberCoroutineScope()
    // Base de 3 números: b0, b1, b2
    // Nivel 2: m0 = b0 + b1, m1 = b1 + b2
    // Cima: top = m0 + m1
    var b0 by remember { mutableIntStateOf(3) }
    var b1 by remember { mutableIntStateOf(5) }
    var b2 by remember { mutableIntStateOf(2) }

    val m0 = b0 + b1
    val m1 = b1 + b2
    val top = m0 + m1

    var hiddenPos by remember { mutableIntStateOf(1) } // 0: b0, 1: b1, 2: b2, 3: m0, 4: m1, 5: top
    var userInput by remember { mutableStateOf("") }
    var isSolved by remember { mutableStateOf(false) }
    var solvedCount by remember { mutableIntStateOf(0) }

    fun nextPuzzle() {
        b0 = Random.nextInt(2, 9)
        b1 = Random.nextInt(2, 9)
        b2 = Random.nextInt(2, 9)
        hiddenPos = listOf(1, 3, 4, 5).random()
        userInput = ""
        isSolved = false
    }

    LaunchedEffect(Unit) {
        nextPuzzle()
    }

    val targetValue = when (hiddenPos) {
        0 -> b0
        1 -> b1
        2 -> b2
        3 -> m0
        4 -> m1
        else -> top
    }

    fun verify() {
        val parsed = userInput.toIntOrNull()
        if (parsed == targetValue) {
            isSolved = true
            solvedCount += 1
            val coins = 8
            val xp = 50
            scope.launch {
                studentRepository.saveGameProgress(classStudentId, "Pyramyx", "normal", solvedCount, coins)
            }
            onReward(coins, xp)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onExit) {
                Icon(Icons.Rounded.ArrowBack, contentDescription = "Volver")
            }
            Text("Pyramyx 📐", fontWeight = FontWeight.Black, fontSize = 18.sp, color = TextPrimary)
            Surface(color = Color(0xFFDCFCE7), shape = RoundedCornerShape(10.dp)) {
                Text("Resueltas: $solvedCount", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF15803D), modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
            }
        }

        Text(
            text = "Cada bloque es igual a la suma de los dos bloques sobre los que se apoya. ¡Descubre el valor faltante (?)!",
            fontSize = 12.sp,
            color = TextSecondary,
            textAlign = TextAlign.Center
        )

        // Visualización de la Pirámide
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Nivel 1: Cima
            PyramidBlock(
                text = if (hiddenPos == 5) if (isSolved) "$top" else "?" else "$top",
                isTarget = hiddenPos == 5,
                isSolved = isSolved
            )

            // Nivel 2: Intermedio
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PyramidBlock(text = if (hiddenPos == 3) if (isSolved) "$m0" else "?" else "$m0", isTarget = hiddenPos == 3, isSolved = isSolved)
                PyramidBlock(text = if (hiddenPos == 4) if (isSolved) "$m1" else "?" else "$m1", isTarget = hiddenPos == 4, isSolved = isSolved)
            }

            // Nivel 3: Base
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PyramidBlock(text = if (hiddenPos == 0) if (isSolved) "$b0" else "?" else "$b0", isTarget = hiddenPos == 0, isSolved = isSolved)
                PyramidBlock(text = if (hiddenPos == 1) if (isSolved) "$b1" else "?" else "$b1", isTarget = hiddenPos == 1, isSolved = isSolved)
                PyramidBlock(text = if (hiddenPos == 2) if (isSolved) "$b2" else "?" else "$b2", isTarget = hiddenPos == 2, isSolved = isSolved)
            }
        }

        if (isSolved) {
            Surface(color = Color(0xFFDCFCE7), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("🎉 ¡Correcto!", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color(0xFF15803D))
                    Text("+8 Notyx Coins 🪙 y +50 XP ⭐", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFFB45309))
                    Button(
                        onClick = { nextPuzzle() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Siguiente Pirámide ➡️", fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            // Entrada de respuesta
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = userInput,
                    onValueChange = { userInput = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Tu respuesta...", fontSize = 13.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
                Button(
                    onClick = { verify() },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669))
                ) {
                    Text("Comprobar", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun PyramidBlock(
    text: String,
    isTarget: Boolean,
    isSolved: Boolean
) {
    Surface(
        modifier = Modifier.size(width = 72.dp, height = 52.dp),
        shape = RoundedCornerShape(12.dp),
        color = when {
            isTarget && isSolved -> Color(0xFFDCFCE7)
            isTarget -> Color(0xFFFEF3C7)
            else -> Color(0xFFF1F5F9)
        },
        border = androidx.compose.foundation.BorderStroke(
            1.5.dp,
            if (isTarget) Color(0xFFF59E0B) else Color(0xFFCBD5E1)
        )
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = text,
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = if (isTarget) Color(0xFFB45309) else TextPrimary
            )
        }
    }
}
