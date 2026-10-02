package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import com.notyx.app.data.local.ClassPreferences
import com.notyx.app.data.models.*
import com.notyx.app.data.repository.ShopRepository
import com.notyx.app.data.repository.StudentRepository
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentClassPortalScreen(
    classId: String,
    shortCode: String,
    className: String,
    studentRepository: StudentRepository,
    shopRepository: ShopRepository,
    classPreferences: ClassPreferences,
    onBack: () -> Unit
) {
    var studentsInClass by remember { mutableStateOf<List<ClassStudent>>(emptyList()) }
    var selectedStudent by remember { mutableStateOf<ClassStudent?>(null) }
    var showStudentPicker by remember { mutableStateOf(false) }
    var studentFilter by remember { mutableStateOf("") }

    var grades by remember { mutableStateOf<List<DetailedGradeItem>>(emptyList()) }
    var attendances by remember { mutableStateOf<List<AttendanceRecord>>(emptyList()) }
    var stats by remember { mutableStateOf(GamificationStats()) }
    var rewards by remember { mutableStateOf<List<Reward>>(emptyList()) }
    var myPurchases by remember { mutableStateOf<List<StudentPurchase>>(emptyList()) }
    var myPokemon by remember { mutableStateOf<List<StudentPokemonStoreItem>>(emptyList()) }
    var daySessions by remember { mutableStateOf<List<DaySessionSummary>>(emptyList()) }

    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableIntStateOf(0) }
    var selectedCuatrimestreFilter by remember { mutableIntStateOf(0) } // 0: Todos, 1: 1°, 2: 2°
    var selectedShopCategory by remember { mutableStateOf("all") }

    // Dialogs & Pokemon Bazar Filters
    var rewardToBuy by remember { mutableStateOf<Reward?>(null) }
    var isBuyingReward by remember { mutableStateOf(false) }
    var pokemonToBuy by remember { mutableStateOf<PokemonItem?>(null) }
    var isBuyingPokemon by remember { mutableStateOf(false) }
    var pokemonSearchQuery by remember { mutableStateOf("") }
    var pokemonTypeFilter by remember { mutableStateOf("all") }
    var shopFeedbackMessage by remember { mutableStateOf<String?>(null) }

    // Matriz de Todos los Alumnos (Estilo Web)
    var classMatrix by remember { mutableStateOf(FullClassMatrix()) }
    var isLoadingMatrix by remember { mutableStateOf(false) }
    var matrixSearchQuery by remember { mutableStateOf("") }
    var matrixViewMode by remember { mutableStateOf("matrix") } // "matrix" = Todos, "single" = Mi Detalle
    var selectedDayFilterSessionId by remember { mutableStateOf<String?>(null) } // null = todas las clases

    // PokeAPI Dinámica
    var pokeApiPokemon by remember { mutableStateOf<List<PokemonItem>>(emptyList()) }
    var isLoadingPokeApi by remember { mutableStateOf(false) }
    var pokeApiPage by remember { mutableIntStateOf(1) }
    var searchedPokeApiPokemon by remember { mutableStateOf<PokemonItem?>(null) }
    var isSearchingPokeApi by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    val refreshStudentData = { studentId: String ->
        scope.launch {
            val g = studentRepository.getClassSessionsWithGrades(classId, studentId)
            val att = studentRepository.getAttendanceHistory(studentId, classId)
            val st = studentRepository.getStudentStats(studentId)
            val rew = shopRepository.getRewards()
            val pur = shopRepository.getMyPurchases(studentId)
            val poke = shopRepository.getMyPokemon(studentId)
            val ds = studentRepository.getStudentDaySessions(classId, studentId)

            grades = g
            attendances = att
            stats = st
            rewards = rew
            myPurchases = pur
            myPokemon = poke
            daySessions = ds
        }
    }

    val loadClassData = {
        scope.launch {
            isLoading = true
            // Cargar recompensas de la tienda de inmediato
            rewards = shopRepository.getRewards()

            // Cargar la matriz completa de la clase para la tabla ejecutiva
            isLoadingMatrix = true
            val matrix = studentRepository.getFullClassMatrix(classId)
            classMatrix = matrix
            isLoadingMatrix = false

            val list = studentRepository.getClassStudents(classId)
            studentsInClass = list

            val saved = classPreferences.getSavedClasses().firstOrNull { it.classId == classId }
            if (saved?.studentId != null) {
                val matched = list.firstOrNull { it.id == saved.studentId }
                if (matched != null) {
                    selectedStudent = matched
                    refreshStudentData(matched.id)
                } else {
                    selectedStudent = list.firstOrNull()
                    selectedStudent?.let { refreshStudentData(it.id) }
                }
            } else if (list.isNotEmpty()) {
                if (list.size == 1) {
                    selectedStudent = list.first()
                    classPreferences.updateSelectedStudent(classId, list.first().id, list.first().studentName ?: "")
                    refreshStudentData(list.first().id)
                } else {
                    // Pre-seleccionar el primer alumno para que no quede vacía la tabla/tienda
                    selectedStudent = list.first()
                    refreshStudentData(list.first().id)
                    showStudentPicker = true
                }
            }
            isLoading = false
        }
    }

    LaunchedEffect(classId) {
        loadClassData()
    }

    LaunchedEffect(pokemonTypeFilter, pokeApiPage, selectedShopCategory, selectedTab) {
        if (selectedTab == 2 && selectedShopCategory == "pokemon") {
            isLoadingPokeApi = true
            val fetched = shopRepository.fetchPokemonFromPokeApi(
                page = pokeApiPage,
                pageSize = 24,
                type = pokemonTypeFilter
            )
            pokeApiPokemon = if (pokeApiPage == 1) fetched else (pokeApiPokemon + fetched).distinctBy { it.id }
            isLoadingPokeApi = false
        }
    }

    LaunchedEffect(pokemonSearchQuery) {
        val q = pokemonSearchQuery.trim()
        if (q.length >= 3) {
            isSearchingPokeApi = true
            val res = shopRepository.searchPokemonOnPokeApi(q)
            searchedPokeApiPokemon = res
            isSearchingPokeApi = false
        } else {
            searchedPokeApiPokemon = null
            isSearchingPokeApi = false
        }
    }


    // Modal para seleccionar estudiante
    if (showStudentPicker) {
        AlertDialog(
            onDismissRequest = {
                if (selectedStudent != null) showStudentPicker = false
            },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.PersonSearch, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("¿Quién sos?", fontWeight = FontWeight.Black, fontSize = 20.sp)
                }
            },
            text = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Seleccioná tu nombre en la lista de $className para ver tus notas, puntos y bazar:",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = studentFilter,
                        onValueChange = { studentFilter = it },
                        placeholder = { Text("Buscar por nombre o DNI...") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) }
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    val filteredStudents = studentsInClass.filter {
                        val name = it.studentName ?: ""
                        val dni = it.dni ?: ""
                        name.contains(studentFilter, ignoreCase = true) || dni.contains(studentFilter)
                    }

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 280.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(items = filteredStudents, key = { it.id }) { s ->
                            val isChosen = selectedStudent?.id == s.id
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedStudent = s
                                        classPreferences.updateSelectedStudent(
                                            classId = classId,
                                            studentId = s.id,
                                            studentName = s.studentName ?: "Estudiante"
                                        )
                                        showStudentPicker = false
                                        refreshStudentData(s.id)
                                    },
                                shape = RoundedCornerShape(12.dp),
                                color = if (isChosen) PrimaryIndigoLight else Color(0xFFF8FAFC),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (isChosen) PrimaryIndigo else Color(0xFFE2E8F0)
                                )
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(if (isChosen) PrimaryIndigo else Color(0xFFE2E8F0)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = (s.studentName?.firstOrNull() ?: 'A').uppercase(),
                                            fontWeight = FontWeight.Black,
                                            color = if (isChosen) Color.White else TextPrimary
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            text = s.studentName ?: "Estudiante",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = TextPrimary
                                        )
                                        s.dni?.let {
                                            Text(text = "DNI: $it", fontSize = 11.sp, color = TextSecondary)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                if (selectedStudent != null) {
                    TextButton(onClick = { showStudentPicker = false }) {
                        Text("Cerrar", color = TextSecondary)
                    }
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal de Confirmación de Canje en la Tienda
    rewardToBuy?.let { reward ->
        val canAfford = stats.notyxCoins >= reward.costCoins
        AlertDialog(
            onDismissRequest = { if (!isBuyingReward) rewardToBuy = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.ShoppingBag, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Canjear Recompensa", fontWeight = FontWeight.Black, fontSize = 18.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = reward.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = TextPrimary
                    )
                    reward.description?.let {
                        Text(text = it, fontSize = 13.sp, color = TextSecondary)
                    }
                    Surface(
                        color = Color(0xFFFEF3C7),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Costo:", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF92400E))
                            Text("🪙 ${reward.costCoins} Notyx Coins", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFFB45309))
                        }
                    }
                    if (!canAfford) {
                        Text(
                            text = "No tenés suficientes Notyx Coins (tenés ${stats.notyxCoins} Coins).",
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
                        val student = selectedStudent
                        if (student != null && canAfford) {
                            isBuyingReward = true
                            scope.launch {
                                val res = shopRepository.buyReward(
                                    studentId = student.studentId,
                                    rewardId = reward.id,
                                    classStudentId = student.id
                                )
                                isBuyingReward = false
                                rewardToBuy = null
                                res.fold(
                                    onSuccess = {
                                        shopFeedbackMessage = "¡Canje de '${reward.name}' exitoso!"
                                        refreshStudentData(student.id)
                                    },
                                    onFailure = { ex ->
                                        shopFeedbackMessage = "Error al canjear: ${ex.message}"
                                    }
                                )
                            }
                        }
                    },
                    enabled = canAfford && !isBuyingReward,
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (isBuyingReward) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Confirmar Canje", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { rewardToBuy = null },
                    enabled = !isBuyingReward
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal de Confirmación de Captura en el Bazar Pokémon
    pokemonToBuy?.let { pokemon ->
        val canAfford = stats.notyxCoins >= pokemon.costCoins
        AlertDialog(
            onDismissRequest = { if (!isBuyingPokemon) pokemonToBuy = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Star, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Capturar Pokémon", fontWeight = FontWeight.Black, fontSize = 18.sp)
                }
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    pokemon.sprite?.let { url ->
                        AsyncImage(
                            model = url,
                            contentDescription = pokemon.name,
                            modifier = Modifier.size(100.dp)
                        )
                    }
                    Text(
                        text = pokemon.name,
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = TextPrimary
                    )
                    Surface(
                        color = Color(0xFFFEF3C7),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Costo:", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF92400E))
                            Text("🪙 ${pokemon.costCoins} Notyx Coins", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFFB45309))
                        }
                    }
                    if (!canAfford) {
                        Text(
                            text = "No tenés suficientes Notyx Coins (tenés ${stats.notyxCoins} Coins).",
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
                        val student = selectedStudent
                        if (student != null && canAfford) {
                            isBuyingPokemon = true
                            scope.launch {
                                val res = shopRepository.capturePokemon(
                                    studentId = student.studentId,
                                    pokemon = pokemon,
                                    classStudentId = student.id
                                )
                                isBuyingPokemon = false
                                pokemonToBuy = null
                                res.fold(
                                    onSuccess = {
                                        shopFeedbackMessage = "¡Felicidades! Capturaste a '${pokemon.name}'"
                                        refreshStudentData(student.id)
                                    },
                                    onFailure = { ex ->
                                        shopFeedbackMessage = "Error al capturar: ${ex.message}"
                                    }
                                )
                            }
                        }
                    },
                    enabled = canAfford && !isBuyingPokemon,
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (isBuyingPokemon) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Confirmar Captura", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { pokemonToBuy = null },
                    enabled = !isBuyingPokemon
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    val avgScore = if (grades.isNotEmpty()) grades.map { it.score }.average() else 0.0
    val totalAtt = attendances.size
    val presentAtt = attendances.count { it.isPresent }
    val attPct = if (totalAtt > 0) (presentAtt.toDouble() / totalAtt) * 100.0 else 100.0

    val conditionText = when {
        totalAtt == 0 && grades.isEmpty() -> "INICIANDO"
        avgScore >= 7.0 && attPct >= 80.0 -> "PROMOCIONADO"
        avgScore >= 6.0 && attPct >= 60.0 -> "REGULAR"
        else -> "EN RIESGO"
    }

    val conditionColor = when (conditionText) {
        "PROMOCIONADO" -> Color(0xFF15803D)
        "REGULAR" -> Color(0xFFB45309)
        "EN RIESGO" -> Color(0xFFB91C1C)
        else -> PrimaryIndigo
    }
    val conditionBg = when (conditionText) {
        "PROMOCIONADO" -> Color(0xFFDCFCE7)
        "REGULAR" -> Color(0xFFFEF3C7)
        "EN RIESGO" -> Color(0xFFFEE2E2)
        else -> PrimaryIndigoLight
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
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "Volver",
                            tint = TextPrimary
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = className,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                color = Color(0xFFEEF2FF),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "CÓDIGO: $shortCode",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = PrimaryIndigo,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    // Chip de Monedas Notyx en TopBar (1 tap para ir a Tienda)
                    Surface(
                        onClick = { selectedTab = 2 },
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFFEF3C7),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFCD34D))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("🪙", fontSize = 14.sp)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "${stats.notyxCoins}",
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp,
                                color = Color(0xFFB45309)
                            )
                        }
                    }
                }

                // Selector de Estudiante
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 2.dp),
                    color = Color(0xFFF8FAFC),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showStudentPicker = true }
                            .padding(horizontal = 12.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Rounded.AccountCircle,
                                contentDescription = null,
                                tint = PrimaryIndigo,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = selectedStudent?.studentName ?: "Seleccionar alumno",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }
                        Text(
                            text = "Cambiar",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryIndigo
                        )
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Barra de Pestañas Desplazable: Resumen, Clases & Notas, Bazar, Mi Colección, Juegos, Asistencias
                ScrollableTabRow(
                    selectedTabIndex = selectedTab,
                    edgePadding = 12.dp,
                    containerColor = Color.White,
                    contentColor = PrimaryIndigo
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("Resumen", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                        icon = { Icon(Icons.Rounded.Dashboard, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("Clases & Notas", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                        icon = { Icon(Icons.Rounded.TableChart, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        text = { Text("Bazar Pokémon", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                        icon = { Icon(Icons.Rounded.ShoppingBag, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 3,
                        onClick = { selectedTab = 3 },
                        text = { Text("Mi Colección (${myPokemon.size})", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                        icon = { Icon(Icons.Rounded.CatchingPokemon, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 4,
                        onClick = { selectedTab = 4 },
                        text = { Text("Juegos 🎮", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                        icon = { Icon(Icons.Rounded.SportsEsports, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 5,
                        onClick = { selectedTab = 5 },
                        text = { Text("Asistencias", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                        icon = { Icon(Icons.Rounded.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
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
            ) {
                // Notificación de Feedback si hubo canje
                shopFeedbackMessage?.let { msg ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFDCFCE7),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF86EFAC))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = msg, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF15803D))
                            IconButton(onClick = { shopFeedbackMessage = null }, modifier = Modifier.size(20.dp)) {
                                Icon(Icons.Rounded.Close, contentDescription = null, tint = Color(0xFF15803D), modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }

                when (selectedTab) {
                    // ==========================================
                    // TAB 0: DASHBOARD Y TARJETAS (ESTILO WEB)
                    // ==========================================
                    0 -> {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                            contentPadding = PaddingValues(vertical = 14.dp)
                        ) {
                            // 1. Hero Card RPG del Estudiante
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
                                                    listOf(Color(0xFF1E1B4B), Color(0xFF3730A3), Color(0xFF4F46E5))
                                                )
                                            )
                                            .padding(20.dp)
                                    ) {
                                        Column {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Box(
                                                        modifier = Modifier
                                                            .size(52.dp)
                                                            .clip(CircleShape)
                                                            .background(Color.White.copy(alpha = 0.15f))
                                                            .border(2.dp, Color.White.copy(alpha = 0.3f), CircleShape),
                                                        contentAlignment = Alignment.Center
                                                    ) {
                                                        Text(
                                                            text = (selectedStudent?.studentName?.firstOrNull() ?: 'E').uppercase(),
                                                            fontSize = 22.sp,
                                                            fontWeight = FontWeight.Black,
                                                            color = Color.White
                                                        )
                                                    }
                                                    Spacer(modifier = Modifier.width(12.dp))
                                                    Column {
                                                        Text(
                                                            text = selectedStudent?.studentName ?: "Estudiante",
                                                            fontSize = 18.sp,
                                                            fontWeight = FontWeight.Black,
                                                            color = Color.White
                                                        )
                                                        Surface(
                                                            color = Color(0xFFFDE047),
                                                            shape = RoundedCornerShape(6.dp)
                                                        ) {
                                                            Text(
                                                                text = "NIVEL ${stats.currentLevel}",
                                                                fontSize = 11.sp,
                                                                fontWeight = FontWeight.Black,
                                                                color = Color(0xFF713F12),
                                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                            )
                                                        }
                                                    }
                                                }

                                                // Monedas Notyx
                                                Surface(
                                                    onClick = { selectedTab = 2 },
                                                    shape = RoundedCornerShape(12.dp),
                                                    color = Color.White.copy(alpha = 0.18f)
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text("🪙", fontSize = 16.sp)
                                                        Spacer(modifier = Modifier.width(4.dp))
                                                        Text(
                                                            text = "${stats.notyxCoins}",
                                                            fontWeight = FontWeight.Black,
                                                            fontSize = 14.sp,
                                                            color = Color.White
                                                        )
                                                    }
                                                }
                                            }

                                            Spacer(modifier = Modifier.height(16.dp))

                                            // Barra de XP
                                            val xpProg = if (stats.nextLevelXP > 0) (stats.currentLevelXP.toFloat() / stats.nextLevelXP.toFloat()).coerceIn(0f, 1f) else 0f
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text("Experiencia (XP)", fontSize = 12.sp, color = Color.White.copy(alpha = 0.85f), fontWeight = FontWeight.Bold)
                                                Text("${stats.currentLevelXP} / ${stats.nextLevelXP} XP", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Black)
                                            }
                                            Spacer(modifier = Modifier.height(6.dp))
                                            LinearProgressIndicator(
                                                progress = { xpProg },
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(8.dp)
                                                    .clip(RoundedCornerShape(4.dp)),
                                                color = Color(0xFF38BDF8),
                                                trackColor = Color.White.copy(alpha = 0.2f)
                                            )

                                            Spacer(modifier = Modifier.height(12.dp))

                                            // Barra de Vitalidad HP
                                            val hpProg = if (stats.maxHp > 0) (stats.hp.toFloat() / stats.maxHp.toFloat()).coerceIn(0f, 1f) else 1f
                                            val hpPercent = (hpProg * 100).toInt()
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text("Vitalidad Académica (HP)", fontSize = 12.sp, color = Color.White.copy(alpha = 0.85f), fontWeight = FontWeight.Bold)
                                                Text("$hpPercent% HP", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Black)
                                            }
                                            Spacer(modifier = Modifier.height(6.dp))
                                            LinearProgressIndicator(
                                                progress = { hpProg },
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(8.dp)
                                                    .clip(RoundedCornerShape(4.dp)),
                                                color = if (hpPercent >= 60) Color(0xFF4ADE80) else Color(0xFFF87171),
                                                trackColor = Color.White.copy(alpha = 0.2f)
                                            )

                                            Spacer(modifier = Modifier.height(14.dp))

                                            // Rachas y Escudo
                                            val hasShield = stats.streak >= 3 || stats.hp > 80
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                                            ) {
                                                Surface(
                                                    modifier = Modifier.weight(1f),
                                                    color = Color.White.copy(alpha = 0.12f),
                                                    shape = RoundedCornerShape(10.dp)
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(8.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text("🔥", fontSize = 16.sp)
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Column {
                                                            Text("${stats.streak} Días", fontSize = 12.sp, fontWeight = FontWeight.Black, color = Color.White)
                                                            Text("Racha Asistencia", fontSize = 9.sp, color = Color.White.copy(alpha = 0.75f))
                                                        }
                                                    }
                                                }

                                                Surface(
                                                    modifier = Modifier.weight(1f),
                                                    color = Color.White.copy(alpha = 0.12f),
                                                    shape = RoundedCornerShape(10.dp)
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(8.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text("🛡️", fontSize = 16.sp)
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Column {
                                                            Text(if (hasShield) "Activo" else "Inactivo", fontSize = 12.sp, fontWeight = FontWeight.Black, color = Color.White)
                                                            Text("Escudo Protector", fontSize = 9.sp, color = Color.White.copy(alpha = 0.75f))
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // 2. Tarjeta de Casa de Clase (si existe)
                            stats.house?.let { house ->
                                item {
                                    val (houseIcon, houseGradient, houseColor) = when {
                                        house.name.contains("Drag", ignoreCase = true) -> Triple("🐉", listOf(Color(0xFF881337), Color(0xFFE11D48)), Color(0xFFE11D48))
                                        house.name.contains("Lobo", ignoreCase = true) -> Triple("🐺", listOf(Color(0xFF1E3A8A), Color(0xFF2563EB)), Color(0xFF2563EB))
                                        else -> Triple("🦅", listOf(Color(0xFF064E3B), Color(0xFF059669)), Color(0xFF059669))
                                    }

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
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(44.dp)
                                                        .clip(CircleShape)
                                                        .background(Brush.linearGradient(houseGradient)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(text = houseIcon, fontSize = 22.sp)
                                                }
                                                Spacer(modifier = Modifier.width(12.dp))
                                                Column {
                                                    Text(
                                                        text = "CASA ${house.name.uppercase()}",
                                                        fontWeight = FontWeight.Black,
                                                        fontSize = 15.sp,
                                                        color = TextPrimary
                                                    )
                                                    Text(text = "Escuadrón de Clase", fontSize = 11.sp, color = TextSecondary)
                                                }
                                            }

                                            Surface(
                                                color = houseColor.copy(alpha = 0.12f),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Text(
                                                    text = "${stats.xp} PTS",
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 13.sp,
                                                    color = houseColor,
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // 3. Tarjetas de Métricas Académicas (Grid)
                            item {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    // Tarjeta: Promedio
                                    Card(
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(14.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Text("PROMEDIO", fontSize = 10.sp, fontWeight = FontWeight.Black, color = TextMuted)
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = if (grades.isNotEmpty()) String.format("%.1f", avgScore) else "--",
                                                fontSize = 24.sp,
                                                fontWeight = FontWeight.Black,
                                                color = if (avgScore >= 6.0) Color(0xFF16A34A) else Color(0xFFDC2626)
                                            )
                                            Text(
                                                text = if (avgScore >= 6.0) "Aprobado" else "En riesgo",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (avgScore >= 6.0) Color(0xFF16A34A) else Color(0xFFDC2626)
                                            )
                                        }
                                    }

                                    // Tarjeta: Asistencia
                                    Card(
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(14.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Text("ASISTENCIA", fontSize = 10.sp, fontWeight = FontWeight.Black, color = TextMuted)
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = "${attPct.toInt()}%",
                                                fontSize = 24.sp,
                                                fontWeight = FontWeight.Black,
                                                color = if (attPct >= 60.0) PrimaryIndigo else Color(0xFFDC2626)
                                            )
                                            Text(
                                                text = "$presentAtt de $totalAtt clases",
                                                fontSize = 10.sp,
                                                color = TextSecondary
                                            )
                                        }
                                    }

                                    // Tarjeta: Condición
                                    Card(
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(14.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Text("CONDICIÓN", fontSize = 10.sp, fontWeight = FontWeight.Black, color = TextMuted)
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Surface(
                                                color = conditionBg,
                                                shape = RoundedCornerShape(6.dp)
                                            ) {
                                                Text(
                                                    text = conditionText,
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Black,
                                                    color = conditionColor,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                                )
                                            }
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = "${grades.size} Notas",
                                                fontSize = 10.sp,
                                                color = TextSecondary
                                            )
                                        }
                                    }
                                }
                            }

                            // 4. Tarjetas de Accesos Rápidos (Tabla, Bazar, Colección, Juegos)
                            item {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        // Acceso a Tabla
                                        Surface(
                                            onClick = { selectedTab = 1 },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(16.dp),
                                            color = Color(0xFFEFF6FF),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBFDBFE))
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(14.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(Icons.Rounded.TableChart, contentDescription = null, tint = PrimaryIndigo)
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Column {
                                                    Text("Clases & Notas", fontWeight = FontWeight.Black, fontSize = 13.sp, color = TextPrimary)
                                                    Text("Ver planilla y días", fontSize = 10.sp, color = TextSecondary)
                                                }
                                            }
                                        }

                                        // Acceso a Tienda
                                        Surface(
                                            onClick = { selectedTab = 2 },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(16.dp),
                                            color = Color(0xFFFEF3C7),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFCD34D))
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(14.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(Icons.Rounded.ShoppingBag, contentDescription = null, tint = Color(0xFFB45309))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Column {
                                                    Text("Bazar Pokémon", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFF92400E))
                                                    Text("Canjear Coins", fontSize = 10.sp, color = Color(0xFFB45309))
                                                }
                                            }
                                        }
                                    }

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        // Acceso a Colección
                                        Surface(
                                            onClick = { selectedTab = 3 },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(16.dp),
                                            color = Color(0xFFEEF2FF),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFC7D2FE))
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(14.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(Icons.Rounded.CatchingPokemon, contentDescription = null, tint = Color(0xFF4338CA))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Column {
                                                    Text("Mi Colección", fontWeight = FontWeight.Black, fontSize = 13.sp, color = TextPrimary)
                                                    Text("${myPokemon.size} Pokémon", fontSize = 10.sp, color = Color(0xFF4338CA), fontWeight = FontWeight.Bold)
                                                }
                                            }
                                        }

                                        // Acceso a Juegos Arena
                                        Surface(
                                            onClick = { selectedTab = 4 },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(16.dp),
                                            color = Color(0xFFFFEDD5),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFED7AA))
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(14.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(Icons.Rounded.SportsEsports, contentDescription = null, tint = Color(0xFFEA580C))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Column {
                                                    Text("Juegos 🎮", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFF9A3412))
                                                    Text("Gana Notyx Coins", fontSize = 10.sp, color = Color(0xFFEA580C))
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ==========================================================
                    // TAB 1: TABLA COMPLETA DE CALIFICACIONES (ESTILO WEB)
                    // ==========================================================
                    1 -> {
                        val visibleSessions = remember(classMatrix, selectedCuatrimestreFilter, selectedDayFilterSessionId) {
                            val cuatFiltered = when (selectedCuatrimestreFilter) {
                                1 -> classMatrix.sessionsWithCriteria.filter {
                                    val cuat = it.session.cuatrimestre ?: (it.session.date?.let { d ->
                                        val m = d.split("-").getOrNull(1)?.toIntOrNull() ?: 1
                                        if (m >= 7) 2 else 1
                                    } ?: 1)
                                    cuat == 1
                                }
                                2 -> classMatrix.sessionsWithCriteria.filter {
                                    val cuat = it.session.cuatrimestre ?: (it.session.date?.let { d ->
                                        val m = d.split("-").getOrNull(1)?.toIntOrNull() ?: 1
                                        if (m >= 7) 2 else 1
                                    } ?: 1)
                                    cuat == 2
                                }
                                else -> classMatrix.sessionsWithCriteria
                            }
                            if (selectedDayFilterSessionId != null) {
                                cuatFiltered.filter { it.session.id == selectedDayFilterSessionId }
                            } else {
                                cuatFiltered
                            }
                        }

                        val criteriaWithSession = remember(visibleSessions) {
                            visibleSessions.flatMap { sessCrit ->
                                sessCrit.criteria.map { crit ->
                                    Triple(crit, sessCrit.session.date ?: "Clase", sessCrit.session.cuatrimestre ?: 1)
                                }
                            }
                        }

                        val filteredStudentRows = remember(classMatrix.studentRows, matrixSearchQuery) {
                            if (matrixSearchQuery.isBlank()) {
                                classMatrix.studentRows
                            } else {
                                classMatrix.studentRows.filter {
                                    it.studentName.contains(matrixSearchQuery, ignoreCase = true)
                                }
                            }
                        }

                        val filteredGrades = when (selectedCuatrimestreFilter) {
                            1 -> grades.filter { it.cuatrimestre == 1 }
                            2 -> grades.filter { it.cuatrimestre == 2 }
                            else -> grades
                        }

                        val filteredDaySessions = remember(daySessions, selectedCuatrimestreFilter) {
                            when (selectedCuatrimestreFilter) {
                                1 -> daySessions.filter { it.cuatrimestre == 1 }
                                2 -> daySessions.filter { it.cuatrimestre == 2 }
                                else -> daySessions
                            }
                        }

                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(vertical = 14.dp)
                        ) {
                            // 1. Selector de Modo: Tabla General (Todos los alumnos) vs Mis Clases por Día
                            item {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color.White,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(4.dp),
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Surface(
                                            onClick = { matrixViewMode = "matrix" },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(10.dp),
                                            color = if (matrixViewMode == "matrix") PrimaryIndigo else Color.Transparent
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(vertical = 8.dp),
                                                horizontalArrangement = Arrangement.Center,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(
                                                    Icons.Rounded.TableChart,
                                                    contentDescription = null,
                                                    tint = if (matrixViewMode == "matrix") Color.White else TextSecondary,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = "Planilla General (${classMatrix.studentRows.size})",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (matrixViewMode == "matrix") Color.White else TextSecondary
                                                )
                                            }
                                        }

                                        Surface(
                                            onClick = { matrixViewMode = "single" },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(10.dp),
                                            color = if (matrixViewMode == "single") PrimaryIndigo else Color.Transparent
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(vertical = 8.dp),
                                                horizontalArrangement = Arrangement.Center,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(
                                                    Icons.Rounded.CalendarToday,
                                                    contentDescription = null,
                                                    tint = if (matrixViewMode == "single") Color.White else TextSecondary,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = "Mis Clases por Día",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (matrixViewMode == "single") Color.White else TextSecondary
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // 2. Filtros de Cuatrimestre
                            item {
                                LazyRow(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    val cuatItems = listOf("Todas las Notas" to 0, "1° Cuatrimestre" to 1, "2° Cuatrimestre" to 2)
                                    items(cuatItems) { (label, cIdx) ->
                                        val isSel = selectedCuatrimestreFilter == cIdx
                                        Surface(
                                            onClick = { selectedCuatrimestreFilter = cIdx },
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

                            // 3. VISTA SEGÚN MODO SELECCIONADO
                            if (matrixViewMode == "matrix") {
                                // Filtro por Día de Clase Individual
                                if (classMatrix.sessionsWithCriteria.isNotEmpty()) {
                                    item {
                                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Text(
                                                text = "Filtrar por Fecha de Clase:",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = TextSecondary
                                            )
                                            LazyRow(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                                            ) {
                                                item {
                                                    val isAll = selectedDayFilterSessionId == null
                                                    Surface(
                                                        onClick = { selectedDayFilterSessionId = null },
                                                        shape = RoundedCornerShape(10.dp),
                                                        color = if (isAll) PrimaryIndigo else Color.White,
                                                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isAll) PrimaryIndigo else Color(0xFFE2E8F0))
                                                    ) {
                                                        Row(
                                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Icon(
                                                                Icons.Rounded.FilterAlt,
                                                                contentDescription = null,
                                                                tint = if (isAll) Color.White else PrimaryIndigo,
                                                                modifier = Modifier.size(13.dp)
                                                            )
                                                            Spacer(modifier = Modifier.width(4.dp))
                                                            Text(
                                                                text = "Todas las Clases",
                                                                fontSize = 11.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                color = if (isAll) Color.White else TextPrimary
                                                            )
                                                        }
                                                    }
                                                }

                                                val sessionsForFilter = classMatrix.sessionsWithCriteria
                                                items(items = sessionsForFilter, key = { it.session.id }) { sc ->
                                                    val isSel = selectedDayFilterSessionId == sc.session.id
                                                    val dateLabel = sc.session.date ?: "Clase"
                                                    Surface(
                                                        onClick = {
                                                            selectedDayFilterSessionId = if (isSel) null else sc.session.id
                                                        },
                                                        shape = RoundedCornerShape(10.dp),
                                                        color = if (isSel) PrimaryIndigo else Color.White,
                                                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isSel) PrimaryIndigo else Color(0xFFE2E8F0))
                                                    ) {
                                                        Row(
                                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Icon(
                                                                Icons.Rounded.Event,
                                                                contentDescription = null,
                                                                tint = if (isSel) Color.White else TextSecondary,
                                                                modifier = Modifier.size(13.dp)
                                                            )
                                                            Spacer(modifier = Modifier.width(4.dp))
                                                            Text(
                                                                text = dateLabel,
                                                                fontSize = 11.sp,
                                                                fontWeight = if (isSel) FontWeight.Black else FontWeight.Bold,
                                                                color = if (isSel) Color.White else TextPrimary
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                item {
                                    OutlinedTextField(
                                        value = matrixSearchQuery,
                                        onValueChange = { matrixSearchQuery = it },
                                        placeholder = { Text("Buscar alumno en la tabla...", fontSize = 13.sp) },
                                        leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = TextSecondary) },
                                        singleLine = true,
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }

                                if (isLoadingMatrix) {
                                    item {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(32.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            CircularProgressIndicator(color = PrimaryIndigo)
                                        }
                                    }
                                } else if (filteredStudentRows.isEmpty()) {
                                    item {
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(16.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color.White)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(32.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Icon(Icons.Rounded.GroupOff, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(40.dp))
                                                Spacer(modifier = Modifier.height(8.dp))
                                                Text("No se encontraron alumnos", fontWeight = FontWeight.Bold, color = TextPrimary)
                                            }
                                        }
                                    }
                                } else {
                                    // LA TABLA MATRIZ GENERAL CON FECHAS Y ESPACIADO ÓPTIMO
                                    item {
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(18.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color.White),
                                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                        ) {
                                            Column(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .horizontalScroll(rememberScrollState())
                                            ) {
                                                // Encabezado de la Matriz con Fecha de Sesión y Nombre de Criterio
                                                Surface(
                                                    color = Color(0xFFF1F5F9),
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    Row(
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        modifier = Modifier.padding(vertical = 8.dp)
                                                    ) {
                                                        // Columna Alumno
                                                        Box(
                                                            modifier = Modifier
                                                                .width(165.dp)
                                                                .padding(horizontal = 12.dp)
                                                        ) {
                                                            Text(
                                                                text = "ALUMNO",
                                                                fontSize = 11.sp,
                                                                fontWeight = FontWeight.Black,
                                                                color = Color(0xFF334155),
                                                                letterSpacing = 0.5.sp
                                                            )
                                                        }

                                                        // Columnas de Criterios con Fecha de Sesión visible
                                                        criteriaWithSession.forEach { (crit, sessionDate, cuat) ->
                                                            Column(
                                                                modifier = Modifier
                                                                    .width(115.dp)
                                                                    .padding(horizontal = 4.dp),
                                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                                verticalArrangement = Arrangement.spacedBy(2.dp)
                                                            ) {
                                                                // Fecha de la Clase
                                                                Surface(
                                                                    color = Color(0xFFEEF2FF),
                                                                    shape = RoundedCornerShape(6.dp),
                                                                    border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryIndigo.copy(alpha = 0.2f))
                                                                ) {
                                                                    Text(
                                                                        text = sessionDate,
                                                                        fontSize = 9.sp,
                                                                        fontWeight = FontWeight.Black,
                                                                        color = PrimaryIndigo,
                                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                                    )
                                                                }

                                                                // Nombre del Criterio
                                                                Text(
                                                                    text = crit.name,
                                                                    fontSize = 11.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    color = Color(0xFF334155),
                                                                    maxLines = 1,
                                                                    textAlign = TextAlign.Center
                                                                )

                                                                // Puntaje Máximo
                                                                Text(
                                                                    text = "Máx: ${crit.safeMaxScore.toInt()} pts",
                                                                    fontSize = 9.sp,
                                                                    fontWeight = FontWeight.Medium,
                                                                    color = Color(0xFF64748B)
                                                                )
                                                            }
                                                        }

                                                        // Columna Total
                                                        Box(
                                                            modifier = Modifier
                                                                .width(95.dp)
                                                                .padding(horizontal = 6.dp),
                                                            contentAlignment = Alignment.Center
                                                        ) {
                                                            Text(
                                                                text = "TOTAL / %",
                                                                fontSize = 11.sp,
                                                                fontWeight = FontWeight.Black,
                                                                color = PrimaryIndigo
                                                            )
                                                        }
                                                    }
                                                }

                                                HorizontalDivider(color = Color(0xFFE2E8F0))

                                                // Filas de los Alumnos
                                                filteredStudentRows.forEachIndexed { idx, row ->
                                                    val isSelected = selectedStudent?.id == row.classStudentId
                                                    val rowBg = if (isSelected) Color(0xFFEFF6FF) else if (idx % 2 == 0) Color.White else Color(0xFFF8FAFC)

                                                    Row(
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        modifier = Modifier
                                                            .background(rowBg)
                                                            .clickable {
                                                                val matched = studentsInClass.firstOrNull { it.id == row.classStudentId }
                                                                if (matched != null) {
                                                                    selectedStudent = matched
                                                                    refreshStudentData(matched.id)
                                                                }
                                                            }
                                                            .padding(vertical = 10.dp)
                                                    ) {
                                                        // Columna Alumno
                                                        Row(
                                                            modifier = Modifier
                                                                .width(165.dp)
                                                                .padding(horizontal = 10.dp),
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            val rankBadge = when (row.rank) {
                                                                1 -> "🥇"
                                                                2 -> "🥈"
                                                                3 -> "🥉"
                                                                else -> "#${row.rank}"
                                                            }
                                                            Text(
                                                                text = rankBadge,
                                                                fontSize = if (row.rank <= 3) 14.sp else 11.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                modifier = Modifier.width(26.dp)
                                                            )
                                                            Column(modifier = Modifier.weight(1f)) {
                                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                                    Text(
                                                                        text = row.studentName,
                                                                        fontSize = 12.sp,
                                                                        fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold,
                                                                        color = if (isSelected) PrimaryIndigo else TextPrimary,
                                                                        maxLines = 1
                                                                    )
                                                                    if (isSelected) {
                                                                        Spacer(modifier = Modifier.width(4.dp))
                                                                        Surface(
                                                                            color = PrimaryIndigo,
                                                                            shape = RoundedCornerShape(4.dp)
                                                                        ) {
                                                                            Text(
                                                                                text = "Tú",
                                                                                fontSize = 8.sp,
                                                                                fontWeight = FontWeight.Black,
                                                                                color = Color.White,
                                                                                modifier = Modifier.padding(horizontal = 3.dp, vertical = 1.dp)
                                                                            )
                                                                        }
                                                                    }
                                                                }
                                                                Text(
                                                                    text = "Nv. ${row.level}",
                                                                    fontSize = 9.sp,
                                                                    color = TextSecondary
                                                                )
                                                            }
                                                        }

                                                        // Celdas de Calificaciones
                                                        criteriaWithSession.forEach { (crit, _, _) ->
                                                            val score = row.gradesByCriteriaId[crit.id]
                                                            Box(
                                                                modifier = Modifier
                                                                    .width(115.dp)
                                                                    .padding(horizontal = 4.dp),
                                                                contentAlignment = Alignment.Center
                                                            ) {
                                                                if (score != null) {
                                                                    val cap = crit.safeMaxScore
                                                                    val pct = if (cap > 0) score / cap else 0.0
                                                                    val (badgeBg, badgeText, badgeBorder) = when {
                                                                        pct >= 0.7 -> Triple(Color(0xFFDCFCE7), Color(0xFF166534), Color(0xFF86EFAC))
                                                                        pct >= 0.4 -> Triple(Color(0xFFFEF3C7), Color(0xFF92400E), Color(0xFFFDE68A))
                                                                        else -> Triple(Color(0xFFFEE2E2), Color(0xFF991B1B), Color(0xFFFECACA))
                                                                    }

                                                                    Surface(
                                                                        color = badgeBg,
                                                                        shape = RoundedCornerShape(8.dp),
                                                                        border = androidx.compose.foundation.BorderStroke(1.dp, badgeBorder),
                                                                        modifier = Modifier.padding(vertical = 2.dp)
                                                                    ) {
                                                                        Text(
                                                                            text = String.format("%.1f", score),
                                                                            fontSize = 12.sp,
                                                                            fontWeight = FontWeight.Black,
                                                                            color = badgeText,
                                                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                                                        )
                                                                    }
                                                                } else {
                                                                    Text(
                                                                        text = "―",
                                                                        fontSize = 12.sp,
                                                                        fontWeight = FontWeight.Bold,
                                                                        color = Color(0xFF94A3B8)
                                                                    )
                                                                }
                                                            }
                                                        }

                                                        // Columna Total y Porcentaje
                                                        Column(
                                                            modifier = Modifier
                                                                .width(95.dp)
                                                                .padding(horizontal = 6.dp),
                                                            horizontalAlignment = Alignment.CenterHorizontally
                                                        ) {
                                                            Text(
                                                                text = String.format("%.1f", row.totalScore),
                                                                fontSize = 12.sp,
                                                                fontWeight = FontWeight.Black,
                                                                color = PrimaryIndigo
                                                            )
                                                            Surface(
                                                                color = if (row.percentage >= 70) Color(0xFFDCFCE7) else if (row.percentage >= 40) Color(0xFFFEF3C7) else Color(0xFFFEE2E2),
                                                                shape = RoundedCornerShape(4.dp)
                                                            ) {
                                                                Text(
                                                                    text = "${row.percentage}%",
                                                                    fontSize = 10.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    color = if (row.percentage >= 70) Color(0xFF166534) else if (row.percentage >= 40) Color(0xFF92400E) else Color(0xFF991B1B),
                                                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                                                )
                                                            }
                                                        }
                                                    }

                                                    if (idx < filteredStudentRows.lastIndex) {
                                                        HorizontalDivider(color = Color(0xFFF1F5F9))
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                // VISTA CONSOLIDADA DE SESIONES POR DÍA (TODAS LAS NOTAS DE ESE MISMO DÍA JUNTAS)
                                if (filteredDaySessions.isEmpty()) {
                                    item {
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(18.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color.White),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(32.dp),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    "No hay clases registradas en este período",
                                                    color = TextSecondary,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Medium
                                                )
                                            }
                                        }
                                    }
                                } else {
                                    filteredDaySessions.forEach { daySess ->
                                        item {
                                            Card(
                                                modifier = Modifier.fillMaxWidth(),
                                                shape = RoundedCornerShape(18.dp),
                                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                                            ) {
                                                Column(
                                                    modifier = Modifier.padding(16.dp),
                                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                                ) {
                                                    // Header del Día: Fecha, Título, Badge de Asistencia y Cuatrimestre
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Row(
                                                            verticalAlignment = Alignment.CenterVertically,
                                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                                        ) {
                                                            Surface(
                                                                shape = RoundedCornerShape(10.dp),
                                                                color = Color(0xFFEFF6FF),
                                                                modifier = Modifier.size(38.dp)
                                                            ) {
                                                                Box(contentAlignment = Alignment.Center) {
                                                                    Icon(
                                                                        Icons.Rounded.CalendarMonth,
                                                                        contentDescription = null,
                                                                        tint = PrimaryIndigo,
                                                                        modifier = Modifier.size(20.dp)
                                                                    )
                                                                }
                                                            }
                                                            Column {
                                                                Text(
                                                                    text = daySess.displayDate,
                                                                    fontWeight = FontWeight.Black,
                                                                    fontSize = 14.sp,
                                                                    color = TextPrimary
                                                                )
                                                                Text(
                                                                    text = daySess.sessionTitle,
                                                                    fontSize = 11.sp,
                                                                    color = TextSecondary
                                                                )
                                                            }
                                                        }

                                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                            Surface(
                                                                color = when (daySess.isPresent) {
                                                                    true -> Color(0xFFDCFCE7)
                                                                    false -> Color(0xFFFEE2E2)
                                                                    else -> Color(0xFFF1F5F9)
                                                                },
                                                                shape = RoundedCornerShape(8.dp)
                                                            ) {
                                                                Text(
                                                                    text = when (daySess.isPresent) {
                                                                        true -> "PRESENTE"
                                                                        false -> "AUSENTE"
                                                                        else -> "S/D"
                                                                    },
                                                                    fontSize = 10.sp,
                                                                    fontWeight = FontWeight.Black,
                                                                    color = when (daySess.isPresent) {
                                                                        true -> Color(0xFF15803D)
                                                                        false -> Color(0xFFB91C1C)
                                                                        else -> Color(0xFF64748B)
                                                                    },
                                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                                                )
                                                            }

                                                            Surface(
                                                                color = Color(0xFFF8FAFC),
                                                                shape = RoundedCornerShape(8.dp),
                                                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                                                            ) {
                                                                Text(
                                                                    text = "${daySess.cuatrimestre}° C",
                                                                    fontSize = 10.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    color = Color(0xFF475569),
                                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                                                )
                                                            }
                                                        }
                                                    }

                                                    // Rendimiento del Día
                                                    if (daySess.maxScore > 0) {
                                                        val pct = daySess.percentage
                                                        val pctColor = if (pct >= 70) Color(0xFF15803D) else if (pct >= 40) Color(0xFFB45309) else Color(0xFFB91C1C)
                                                        Surface(
                                                            modifier = Modifier.fillMaxWidth(),
                                                            shape = RoundedCornerShape(12.dp),
                                                            color = Color(0xFFF8FAFC)
                                                        ) {
                                                            Row(
                                                                modifier = Modifier
                                                                    .fillMaxWidth()
                                                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                                verticalAlignment = Alignment.CenterVertically
                                                            ) {
                                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                                    Surface(
                                                                        color = pctColor.copy(alpha = 0.12f),
                                                                        shape = RoundedCornerShape(6.dp)
                                                                    ) {
                                                                        Text(
                                                                            text = "${pct.toInt()}%",
                                                                            fontWeight = FontWeight.Black,
                                                                            fontSize = 12.sp,
                                                                            color = pctColor,
                                                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                                        )
                                                                    }
                                                                    Text(
                                                                        text = "Rendimiento del Día",
                                                                        fontSize = 12.sp,
                                                                        fontWeight = FontWeight.Bold,
                                                                        color = TextPrimary
                                                                    )
                                                                }

                                                                Text(
                                                                    text = "${String.format("%.1f", daySess.totalScore)} / ${daySess.maxScore.toInt()} pts",
                                                                    fontWeight = FontWeight.Black,
                                                                    fontSize = 13.sp,
                                                                    color = pctColor
                                                                )
                                                            }
                                                        }
                                                    }

                                                    if (daySess.grades.isEmpty()) {
                                                        Text(
                                                            text = "Sin evaluaciones registradas en esta clase.",
                                                            fontSize = 11.sp,
                                                            color = TextSecondary,
                                                            modifier = Modifier.padding(vertical = 2.dp)
                                                        )
                                                    } else {
                                                        Column(
                                                            modifier = Modifier.fillMaxWidth(),
                                                            verticalArrangement = Arrangement.spacedBy(6.dp)
                                                        ) {
                                                            Text(
                                                                text = "NOTAS Y CRITERIOS DE ESTA CLASE (${daySess.grades.size})",
                                                                fontSize = 10.sp,
                                                                fontWeight = FontWeight.Black,
                                                                color = Color(0xFF64748B),
                                                                letterSpacing = 0.5.sp
                                                            )

                                                            daySess.grades.forEach { gradeItem ->
                                                                val isPass = gradeItem.score >= 6.0
                                                                Surface(
                                                                    shape = RoundedCornerShape(10.dp),
                                                                    color = Color(0xFFF1F5F9).copy(alpha = 0.7f),
                                                                    modifier = Modifier.fillMaxWidth()
                                                                ) {
                                                                    Row(
                                                                        modifier = Modifier
                                                                            .fillMaxWidth()
                                                                            .padding(horizontal = 12.dp, vertical = 8.dp),
                                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                                        verticalAlignment = Alignment.CenterVertically
                                                                    ) {
                                                                        Column(modifier = Modifier.weight(1f)) {
                                                                            Text(
                                                                                text = gradeItem.criteriaName,
                                                                                fontWeight = FontWeight.Bold,
                                                                                fontSize = 12.sp,
                                                                                color = TextPrimary
                                                                            )
                                                                            Text(
                                                                                text = "Máx: ${gradeItem.maxScore.toInt()} pts",
                                                                                fontSize = 10.sp,
                                                                                color = TextSecondary
                                                                            )
                                                                        }

                                                                        Row(
                                                                            verticalAlignment = Alignment.CenterVertically,
                                                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                                                        ) {
                                                                            Text(
                                                                                text = String.format("%.1f", gradeItem.score),
                                                                                fontWeight = FontWeight.Black,
                                                                                fontSize = 14.sp,
                                                                                color = if (isPass) Color(0xFF15803D) else Color(0xFFB91C1C)
                                                                            )

                                                                            Surface(
                                                                                color = if (isPass) Color(0xFFDCFCE7) else Color(0xFFFEE2E2),
                                                                                shape = RoundedCornerShape(6.dp)
                                                                            ) {
                                                                                Text(
                                                                                    text = if (isPass) "APROBADO" else "DESAPROBADO",
                                                                                    fontSize = 9.sp,
                                                                                    fontWeight = FontWeight.Black,
                                                                                    color = if (isPass) Color(0xFF15803D) else Color(0xFFB91C1C),
                                                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
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

                                    // Resumen General al pie
                                    item {
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(14.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                                        ) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(14.dp),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                val totalEval = filteredDaySessions.sumOf { it.totalScore }
                                                val maxEval = filteredDaySessions.sumOf { it.maxScore }
                                                val avg = if (maxEval > 0) (totalEval / maxEval) * 100.0 else 0.0
                                                Column {
                                                    Text(
                                                        text = "Total Clases: ${filteredDaySessions.size}",
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 12.sp,
                                                        color = TextPrimary
                                                    )
                                                    Text(
                                                        text = "Asistidas: ${filteredDaySessions.count { it.isPresent == true }} de ${filteredDaySessions.size}",
                                                        fontSize = 10.sp,
                                                        color = TextSecondary
                                                    )
                                                }
                                                Surface(
                                                    color = if (avg >= 70) Color(0xFFDCFCE7) else if (avg >= 40) Color(0xFFFEF3C7) else Color(0xFFFEE2E2),
                                                    shape = RoundedCornerShape(8.dp)
                                                ) {
                                                    Text(
                                                        text = "Promedio: ${String.format("%.1f", avg)}%",
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.Black,
                                                        color = if (avg >= 70) Color(0xFF15803D) else if (avg >= 40) Color(0xFFB45309) else Color(0xFFB91C1C),
                                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ==========================================================
                    // TAB 2: TIENDA & BAZAR DE RECOMPENSAS
                    // ==========================================================
                    2 -> {
                        val filteredRewards = when (selectedShopCategory) {
                            "passes" -> rewards.filter { it.category == "item" || it.category == "game_pass" || it.category == "powerup" || it.category == "permission" }
                            "skins" -> rewards.filter { it.category == "cosmetic" }
                            else -> rewards
                        }

                        val purchasedRewardIds = myPurchases.map { it.rewardId }.toSet()
                        val baseCatalogPokemon = remember { shopRepository.getCatalogPokemon() }
                        val ownedPokemonIds = remember(myPokemon) { myPokemon.map { it.pokemonId }.toSet() }

                        val filteredPokemon = remember(baseCatalogPokemon, pokeApiPokemon, searchedPokeApiPokemon, pokemonSearchQuery, pokemonTypeFilter) {
                            val combined = mutableListOf<PokemonItem>()
                            searchedPokeApiPokemon?.let { combined.add(it) }
                            combined.addAll(pokeApiPokemon)
                            combined.addAll(baseCatalogPokemon)
                            val distinct = combined.distinctBy { it.id }

                            distinct.filter { poke ->
                                val matchesQuery = if (pokemonSearchQuery.isBlank()) true else poke.name.contains(pokemonSearchQuery, ignoreCase = true) || poke.id.toString() == pokemonSearchQuery.trim()
                                val matchesType = if (pokemonTypeFilter == "all") true else poke.types.any { it.equals(pokemonTypeFilter, ignoreCase = true) }
                                matchesQuery && matchesType
                            }
                        }


                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                            contentPadding = PaddingValues(vertical = 14.dp)
                        ) {
                            // Tarjeta de Balance de Notyx Coins
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.Transparent)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(
                                                Brush.linearGradient(
                                                    listOf(Color(0xFFB45309), Color(0xFFD97706), Color(0xFFF59E0B))
                                                )
                                            )
                                            .padding(20.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column {
                                                Text(
                                                    text = "TU SALDO DE NOTYX COINS",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Black,
                                                    color = Color.White.copy(alpha = 0.85f),
                                                    letterSpacing = 1.sp
                                                )
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text(
                                                    text = "🪙 ${stats.notyxCoins} Coins",
                                                    fontSize = 26.sp,
                                                    fontWeight = FontWeight.Black,
                                                    color = Color.White
                                                )
                                                Text(
                                                    text = "Canjeá tus puntos por pases, skins y Pokémon en el Bazar",
                                                    fontSize = 11.sp,
                                                    color = Color.White.copy(alpha = 0.9f)
                                                )
                                            }
                                            Box(
                                                modifier = Modifier
                                                    .size(54.dp)
                                                    .clip(CircleShape)
                                                    .background(Color.White.copy(alpha = 0.2f)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Rounded.Storefront,
                                                    contentDescription = null,
                                                    tint = Color.White,
                                                    modifier = Modifier.size(30.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // Selector de Secciones: Todos / Pases / Skins / Bazar Pokémon
                            item {
                                LazyRow(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    val categories = listOf(
                                        "all" to "Todos los Pases",
                                        "passes" to "Pases y Permisos",
                                        "skins" to "Skins",
                                        "pokemon" to "Bazar Pokémon ⚡"
                                    )
                                    items(categories) { (catKey, catLabel) ->
                                        val isSel = selectedShopCategory == catKey
                                        Surface(
                                            onClick = { selectedShopCategory = catKey },
                                            shape = RoundedCornerShape(10.dp),
                                            color = if (isSel) PrimaryIndigo else Color.White,
                                            border = androidx.compose.foundation.BorderStroke(1.dp, if (isSel) PrimaryIndigo else Color(0xFFE2E8F0))
                                        ) {
                                            Text(
                                                text = catLabel,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isSel) Color.White else TextPrimary,
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                            )
                                        }
                                    }
                                }
                            }

                            // ==========================================
                            // VISTA DEL BAZAR POKÉMON
                            // ==========================================
                            if (selectedShopCategory == "pokemon") {
                                item {
                                    Column(modifier = Modifier.fillMaxWidth()) {
                                        OutlinedTextField(
                                            value = pokemonSearchQuery,
                                            onValueChange = { pokemonSearchQuery = it },
                                            placeholder = { Text("Buscar Pokémon (ej: Pikachu, Charizard, 150)") },
                                            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = TextSecondary) },
                                            trailingIcon = {
                                                if (isSearchingPokeApi) {
                                                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = PrimaryIndigo)
                                                } else if (pokemonSearchQuery.isNotEmpty()) {
                                                    IconButton(onClick = { pokemonSearchQuery = "" }) {
                                                        Icon(Icons.Rounded.Clear, contentDescription = "Limpiar", tint = TextSecondary, modifier = Modifier.size(18.dp))
                                                    }
                                                }
                                            },
                                            singleLine = true,
                                            shape = RoundedCornerShape(14.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        )

                                        Spacer(modifier = Modifier.height(8.dp))

                                        val pokemonTypes = listOf(
                                            "all" to "Todos",
                                            "fire" to "Fuego 🔥",
                                            "water" to "Agua 💧",
                                            "grass" to "Planta 🌿",
                                            "electric" to "Eléctrico ⚡",
                                            "psychic" to "Psíquico 🔮",
                                            "ice" to "Hielo ❄️",
                                            "dragon" to "Dragón 🐉",
                                            "ghost" to "Fantasma 👻",
                                            "fighting" to "Lucha 🥊",
                                            "ground" to "Tierra 🏜️",
                                            "rock" to "Roca 🪨",
                                            "steel" to "Acero ⚙️",
                                            "fairy" to "Hada ✨",
                                            "normal" to "Normal ⭐"
                                        )

                                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            items(pokemonTypes) { (tKey, tLabel) ->
                                                val isTSelected = pokemonTypeFilter == tKey
                                                Surface(
                                                    onClick = { pokemonTypeFilter = tKey },
                                                    shape = RoundedCornerShape(8.dp),
                                                    color = if (isTSelected) PrimaryIndigo.copy(alpha = 0.15f) else Color(0xFFF1F5F9),
                                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (isTSelected) PrimaryIndigo else Color.Transparent)
                                                ) {
                                                    Text(
                                                        text = tLabel,
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = if (isTSelected) PrimaryIndigo else Color(0xFF475569),
                                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                                    )
                                                }
                                            }
                                        }

                                        if (myPokemon.isNotEmpty()) {
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Surface(
                                                color = Color(0xFFEFF6FF),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = PrimaryIndigo, modifier = Modifier.size(16.dp))
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Text(
                                                        text = "Tenés ${myPokemon.size} Pokémon capturados en tu colección",
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = PrimaryIndigo
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                if (filteredPokemon.isEmpty()) {
                                    item {
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(16.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color.White)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(32.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Icon(Icons.Rounded.CatchingPokemon, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(40.dp))
                                                Spacer(modifier = Modifier.height(8.dp))
                                                Text("No se encontraron Pokémon con ese criterio", fontWeight = FontWeight.Bold, color = TextPrimary)
                                            }
                                        }
                                    }
                                } else {
                                    // Grid 2 columnas para el Bazar Pokémon
                                    val chunked = filteredPokemon.chunked(2)
                                    items(chunked) { rowItems ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            rowItems.forEach { poke ->
                                                val isOwned = ownedPokemonIds.contains(poke.id)
                                                val canAfford = stats.notyxCoins >= poke.costCoins

                                                Card(
                                                    modifier = Modifier.weight(1f),
                                                    shape = RoundedCornerShape(16.dp),
                                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                                ) {
                                                    Column(
                                                        modifier = Modifier.padding(12.dp),
                                                        horizontalAlignment = Alignment.CenterHorizontally
                                                    ) {
                                                        Box(
                                                            modifier = Modifier
                                                                .size(80.dp)
                                                                .clip(RoundedCornerShape(14.dp))
                                                                .background(Color(0xFFF8FAFC)),
                                                            contentAlignment = Alignment.Center
                                                        ) {
                                                            AsyncImage(
                                                                model = poke.sprite,
                                                                contentDescription = poke.name,
                                                                modifier = Modifier.size(70.dp),
                                                                contentScale = ContentScale.Fit
                                                            )
                                                        }

                                                        Spacer(modifier = Modifier.height(6.dp))

                                                        Text(
                                                            text = poke.name,
                                                            fontSize = 14.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = TextPrimary
                                                        )

                                                        Text(
                                                            text = poke.types.joinToString(" • ") { it.replaceFirstChar { c -> c.uppercase() } },
                                                            fontSize = 10.sp,
                                                            color = TextSecondary
                                                        )

                                                        Spacer(modifier = Modifier.height(6.dp))

                                                        Surface(
                                                            color = Color(0xFFFEF3C7),
                                                            shape = RoundedCornerShape(6.dp)
                                                        ) {
                                                            Text(
                                                                text = "🪙 ${poke.costCoins}",
                                                                fontWeight = FontWeight.Black,
                                                                fontSize = 12.sp,
                                                                color = Color(0xFFB45309),
                                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                            )
                                                        }

                                                        Spacer(modifier = Modifier.height(8.dp))

                                                        if (isOwned) {
                                                            Surface(
                                                                color = Color(0xFFDCFCE7),
                                                                shape = RoundedCornerShape(8.dp),
                                                                modifier = Modifier.fillMaxWidth()
                                                            ) {
                                                                Row(
                                                                    modifier = Modifier
                                                                        .fillMaxWidth()
                                                                        .padding(vertical = 6.dp),
                                                                    horizontalArrangement = Arrangement.Center,
                                                                    verticalAlignment = Alignment.CenterVertically
                                                                ) {
                                                                    Icon(Icons.Rounded.Check, contentDescription = null, tint = Color(0xFF15803D), modifier = Modifier.size(14.dp))
                                                                    Spacer(modifier = Modifier.width(4.dp))
                                                                    Text("Capturado", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF15803D))
                                                                }
                                                            }
                                                        } else {
                                                            Button(
                                                                onClick = { pokemonToBuy = poke },
                                                                enabled = canAfford,
                                                                shape = RoundedCornerShape(8.dp),
                                                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                                                modifier = Modifier.fillMaxWidth()
                                                            ) {
                                                                Text(
                                                                    text = if (canAfford) "Capturar" else "Faltan ${poke.costCoins - stats.notyxCoins}",
                                                                    fontWeight = FontWeight.Bold,
                                                                    fontSize = 11.sp
                                                                )
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            if (rowItems.size == 1) {
                                                Spacer(modifier = Modifier.weight(1f))
                                            }
                                        }
                                    }

                                    if (isLoadingPokeApi) {
                                        item {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(16.dp),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                CircularProgressIndicator(
                                                    modifier = Modifier.size(28.dp),
                                                    color = PrimaryIndigo,
                                                    strokeWidth = 3.dp
                                                )
                                            }
                                        }
                                    } else {
                                        item {
                                            Surface(
                                                onClick = { pokeApiPage++ },
                                                shape = RoundedCornerShape(12.dp),
                                                color = Color(0xFFEEF2FF),
                                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFC7D2FE)),
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(vertical = 6.dp)
                                            ) {
                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .padding(vertical = 12.dp),
                                                    horizontalArrangement = Arrangement.Center,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Rounded.CatchingPokemon,
                                                        contentDescription = null,
                                                        tint = PrimaryIndigo,
                                                        modifier = Modifier.size(20.dp)
                                                    )
                                                    Spacer(modifier = Modifier.width(8.dp))
                                                    Text(
                                                        text = "Cargar más Pokémon del Universo (+24)",
                                                        fontSize = 13.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = PrimaryIndigo
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {

                                // ==========================================
                                // VISTA DE RECOMPENSAS Y PASES
                                // ==========================================
                                if (filteredRewards.isEmpty()) {
                                    item {
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(16.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color.White)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(32.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Icon(Icons.Rounded.ShoppingBag, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(40.dp))
                                                Spacer(modifier = Modifier.height(8.dp))
                                                Text("No hay recompensas en esta categoría", fontWeight = FontWeight.Bold, color = TextPrimary)
                                            }
                                        }
                                    }
                                } else {
                                    items(items = filteredRewards, key = { it.id }) { reward ->
                                        val isBought = purchasedRewardIds.contains(reward.id)
                                        val canAfford = stats.notyxCoins >= reward.costCoins
                                        val isEquipped = stats.equippedSkin == reward.name

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
                                                            .size(44.dp)
                                                            .clip(CircleShape)
                                                            .background(if (isBought) Color(0xFFDCFCE7) else Color(0xFFEFF6FF)),
                                                        contentAlignment = Alignment.Center
                                                    ) {
                                                        Icon(
                                                            imageVector = if (reward.category == "cosmetic") Icons.Rounded.AutoAwesome else Icons.Rounded.Verified,
                                                            contentDescription = null,
                                                            tint = if (isBought) Color(0xFF15803D) else PrimaryIndigo,
                                                            modifier = Modifier.size(22.dp)
                                                        )
                                                    }

                                                    Spacer(modifier = Modifier.width(12.dp))

                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Text(
                                                            text = reward.name,
                                                            fontSize = 15.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = TextPrimary
                                                        )
                                                        reward.description?.let {
                                                            Text(text = it, fontSize = 12.sp, color = TextSecondary)
                                                        }
                                                    }

                                                    Surface(
                                                        color = Color(0xFFFEF3C7),
                                                        shape = RoundedCornerShape(8.dp)
                                                    ) {
                                                        Text(
                                                            text = "🪙 ${reward.costCoins}",
                                                            fontWeight = FontWeight.Black,
                                                            fontSize = 13.sp,
                                                            color = Color(0xFFB45309),
                                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                                        )
                                                    }
                                                }

                                                Spacer(modifier = Modifier.height(12.dp))

                                                // Botón de Canje o Estado
                                                if (isBought) {
                                                    if (reward.category == "cosmetic") {
                                                        Row(
                                                            modifier = Modifier.fillMaxWidth(),
                                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Surface(
                                                                modifier = Modifier.weight(1f),
                                                                color = Color(0xFFDCFCE7),
                                                                shape = RoundedCornerShape(10.dp)
                                                            ) {
                                                                Row(
                                                                    modifier = Modifier
                                                                        .fillMaxWidth()
                                                                        .padding(vertical = 10.dp),
                                                                    horizontalArrangement = Arrangement.Center,
                                                                    verticalAlignment = Alignment.CenterVertically
                                                                ) {
                                                                    Icon(Icons.Rounded.Check, contentDescription = null, tint = Color(0xFF15803D), modifier = Modifier.size(16.dp))
                                                                    Spacer(modifier = Modifier.width(6.dp))
                                                                    Text(
                                                                        text = if (isEquipped) "Skin en Uso ✦" else "Adquirida",
                                                                        fontWeight = FontWeight.Bold,
                                                                        fontSize = 12.sp,
                                                                        color = Color(0xFF15803D)
                                                                    )
                                                                }
                                                            }

                                                            if (!isEquipped) {
                                                                Button(
                                                                    onClick = {
                                                                        val s = selectedStudent
                                                                        if (s != null) {
                                                                            scope.launch {
                                                                                shopRepository.equipSkin(s.id, reward.id)
                                                                                refreshStudentData(s.id)
                                                                            }
                                                                        }
                                                                    },
                                                                    shape = RoundedCornerShape(10.dp),
                                                                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                                                                ) {
                                                                    Text("Equipar", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                                                }
                                                            }
                                                        }
                                                    } else {
                                                        Surface(
                                                            modifier = Modifier.fillMaxWidth(),
                                                            color = Color(0xFFDCFCE7),
                                                            shape = RoundedCornerShape(10.dp)
                                                        ) {
                                                            Row(
                                                                modifier = Modifier
                                                                    .fillMaxWidth()
                                                                    .padding(vertical = 10.dp),
                                                                horizontalArrangement = Arrangement.Center,
                                                                verticalAlignment = Alignment.CenterVertically
                                                            ) {
                                                                Icon(Icons.Rounded.Check, contentDescription = null, tint = Color(0xFF15803D), modifier = Modifier.size(16.dp))
                                                                Spacer(modifier = Modifier.width(6.dp))
                                                                Text("Recompensa Adquirida", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF15803D))
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    Button(
                                                        onClick = { rewardToBuy = reward },
                                                        enabled = canAfford,
                                                        shape = RoundedCornerShape(10.dp),
                                                        colors = ButtonDefaults.buttonColors(
                                                            containerColor = if (canAfford) PrimaryIndigo else Color(0xFF94A3B8)
                                                        ),
                                                        modifier = Modifier.fillMaxWidth()
                                                    ) {
                                                        Text(
                                                            text = if (canAfford) "Canjear por ${reward.costCoins} Coins" else "Te faltan ${reward.costCoins - stats.notyxCoins} Coins",
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 13.sp
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

                    // ==========================================================
                    // TAB 3: MI COLECCIÓN POKÉMON
                    // ==========================================================
                    3 -> {
                        PokemonCollectionSection(
                            myPokemon = myPokemon,
                            stats = stats,
                            studentName = selectedStudent?.studentName ?: "Entrenador",
                            onNavigateToBazar = { selectedTab = 2 }
                        )
                    }

                    // ==========================================================
                    // TAB 4: ARENA DE JUEGOS
                    // ==========================================================
                    4 -> {
                        MiniGamesSection(
                            classStudentId = selectedStudent?.id ?: "",
                            studentName = selectedStudent?.studentName ?: "Estudiante",
                            stats = stats,
                            studentRepository = studentRepository,
                            onCoinsEarned = { earnedCoins, earnedXp ->
                                stats = stats.copy(
                                    notyxCoins = stats.notyxCoins + earnedCoins,
                                    xp = stats.xp + earnedXp
                                )
                            }
                        )
                    }

                    // ==========================================================
                    // TAB 5: ASISTENCIAS
                    // ==========================================================
                    5 -> {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            contentPadding = PaddingValues(vertical = 14.dp)
                        ) {
                            if (attendances.isEmpty()) {
                                item {
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White)
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(32.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Icon(Icons.Rounded.EventAvailable, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(40.dp))
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Text("Sin registros de asistencia todavía", fontWeight = FontWeight.Bold, color = TextPrimary)
                                        }
                                    }
                                }
                            } else {
                                items(items = attendances, key = { "${it.sessionId}_${it.date}" }) { att ->
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(14.dp),
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
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(34.dp)
                                                        .clip(CircleShape)
                                                        .background(if (att.isPresent) Color(0xFFDCFCE7) else Color(0xFFFEE2E2)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Icon(
                                                        imageVector = if (att.isPresent) Icons.Rounded.Check else Icons.Rounded.Close,
                                                        contentDescription = null,
                                                        tint = if (att.isPresent) Color(0xFF15803D) else Color(0xFFB91C1C),
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(12.dp))
                                                Column {
                                                    Text(text = att.date, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary)
                                                    Text(text = att.sessionTitle, fontSize = 12.sp, color = TextSecondary)
                                                }
                                            }

                                            Surface(
                                                color = if (att.isPresent) Color(0xFFDCFCE7) else Color(0xFFFEE2E2),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Text(
                                                    text = if (att.isPresent) "PRESENTE" else "AUSENTE",
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 11.sp,
                                                    color = if (att.isPresent) Color(0xFF15803D) else Color(0xFFB91C1C),
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
    }
}
