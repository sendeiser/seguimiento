package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.notyx.app.data.models.PokemonItem
import com.notyx.app.data.models.Profile
import com.notyx.app.data.models.Reward
import com.notyx.app.data.models.StudentPokemonStoreItem
import com.notyx.app.data.models.StudentPurchase
import com.notyx.app.data.repository.ShopRepository
import com.notyx.app.data.repository.StudentRepository
import com.notyx.app.ui.components.CoinBalanceBadge
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShopScreen(
    currentProfile: Profile?,
    shopRepository: ShopRepository,
    studentRepository: StudentRepository
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var rewards by remember { mutableStateOf<List<Reward>>(emptyList()) }
    var purchases by remember { mutableStateOf<List<StudentPurchase>>(emptyList()) }
    var ownedPokemon by remember { mutableStateOf<List<StudentPokemonStoreItem>>(emptyList()) }
    var currentCoins by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }

    // Pokémon Tab State
    var searchQuery by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf("all") }

    val scope = rememberCoroutineScope()

    val refreshData = {
        if (currentProfile != null) {
            scope.launch {
                val r = shopRepository.getRewards()
                val p = shopRepository.getMyPurchases(currentProfile.id)
                val poke = shopRepository.getMyPokemon(currentProfile.id)
                val stats = studentRepository.getStudentStats(currentProfile.id)
                rewards = r
                purchases = p
                ownedPokemon = poke
                currentCoins = stats.notyxCoins
                isLoading = false
            }
        }
    }

    LaunchedEffect(currentProfile?.id) {
        isLoading = true
        refreshData()
    }

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BgLightSecondary)
                    .padding(horizontal = 20.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Bazar & Tienda",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        Text(
                            text = if (currentProfile?.role == "teacher") "Administración de Precios" else "Pases, Skins y Coleccionables",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextSecondary
                        )
                    }

                    if (currentProfile?.role != "teacher") {
                        CoinBalanceBadge(coins = currentCoins)
                    } else {
                        Surface(
                            color = PrimaryIndigo.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                text = "MODO DOCENTE",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = PrimaryIndigo,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Tab Selector
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
                            title = "Pases & Skins",
                            icon = Icons.Rounded.Palette,
                            isSelected = selectedTab == 0,
                            modifier = Modifier.weight(1f),
                            onClick = { selectedTab = 0 }
                        )
                        TabButton(
                            title = "Centro Pokémon",
                            icon = Icons.Rounded.Star,
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
                0 -> SkinsTab(
                    rewards = rewards,
                    purchases = purchases,
                    currentCoins = currentCoins,
                    currentProfile = currentProfile,
                    shopRepository = shopRepository,
                    padding = padding,
                    onRefresh = { refreshData() }
                )
                1 -> PokemonTab(
                    ownedPokemon = ownedPokemon,
                    currentCoins = currentCoins,
                    currentProfile = currentProfile,
                    shopRepository = shopRepository,
                    searchQuery = searchQuery,
                    onSearchQueryChange = { searchQuery = it },
                    selectedType = selectedType,
                    onSelectType = { selectedType = it },
                    padding = padding,
                    onRefresh = { refreshData() }
                )
            }
        }
    }
}

@Composable
fun SkinsTab(
    rewards: List<Reward>,
    purchases: List<StudentPurchase>,
    currentCoins: Int,
    currentProfile: Profile?,
    shopRepository: ShopRepository,
    padding: PaddingValues,
    onRefresh: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var selectedCategory by remember { mutableStateOf("all") }
    var showCreateRewardDialog by remember { mutableStateOf(false) }
    var editingReward by remember { mutableStateOf<Reward?>(null) }
    var rewardToDelete by remember { mutableStateOf<Reward?>(null) }
    var isDeletingReward by remember { mutableStateOf(false) }
    val isTeacher = currentProfile?.role == "teacher"

    val categories = listOf(
        "all" to "Todos",
        "item" to "Pases y Permisos",
        "cosmetic" to "Skins Temáticas"
    )

    val filteredRewards = remember(rewards, selectedCategory) {
        when (selectedCategory) {
            "all" -> rewards
            "item" -> rewards.filter { it.category == "item" || it.category == "game_pass" || it.category == "powerup" || it.category == "permission" }
            "cosmetic" -> rewards.filter { it.category == "cosmetic" }
            else -> rewards
        }
    }

    // Modal: Crear Nuevo Pase / Permiso / Skin (Docente)
    if (showCreateRewardDialog) {
        var nameInput by remember { mutableStateOf("") }
        var descInput by remember { mutableStateOf("") }
        var priceInput by remember { mutableStateOf("100") }
        var categoryInput by remember { mutableStateOf("item") }
        var iconInput by remember { mutableStateOf("🎫") }
        var isSaving by remember { mutableStateOf(false) }
        val emojiPresets = listOf("🎫", "🎧", "⏰", "🚽", "📚", "⭐", "🛡️", "🔥", "🎮", "⚡", "🎁", "☕")

        AlertDialog(
            onDismissRequest = { if (!isSaving) showCreateRewardDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.AddCircle, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Nuevo Pase o Recompensa",
                        fontWeight = FontWeight.Black,
                        fontSize = 19.sp
                    )
                }
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Creá un pase, beneficio o skin para que tus alumnos canjeen con sus monedas Notyx.",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )

                    OutlinedTextField(
                        value = nameInput,
                        onValueChange = { nameInput = it },
                        label = { Text("Nombre del Pase") },
                        placeholder = { Text("Ej: Pase Música con Auriculares") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = descInput,
                        onValueChange = { descInput = it },
                        label = { Text("Descripción / Reglas de uso") },
                        placeholder = { Text("Ej: Permite escuchar música durante trabajos individuales.") },
                        maxLines = 3,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = priceInput,
                            onValueChange = { priceInput = it },
                            label = { Text("Precio (Coins)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        )

                        Column(modifier = Modifier.weight(1f)) {
                            Text("Tipo", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                FilterChip(
                                    selected = categoryInput == "item",
                                    onClick = { categoryInput = "item" },
                                    label = { Text("Pase", fontSize = 11.sp) },
                                    shape = RoundedCornerShape(8.dp)
                                )
                                FilterChip(
                                    selected = categoryInput == "cosmetic",
                                    onClick = { categoryInput = "cosmetic" },
                                    label = { Text("Skin", fontSize = 11.sp) },
                                    shape = RoundedCornerShape(8.dp)
                                )
                            }
                        }
                    }

                    // Selector de Ícono / Emoji
                    Text("Elegir Icono:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(emojiPresets) { emoji ->
                            val isSel = iconInput == emoji
                            Surface(
                                onClick = { iconInput = emoji },
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSel) PrimaryIndigoLight else Color(0xFFF1F5F9),
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isSel) PrimaryIndigo else Color(0xFFCBD5E1))
                            ) {
                                Text(
                                    text = emoji,
                                    fontSize = 18.sp,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val cost = priceInput.toIntOrNull() ?: 100
                        if (nameInput.isNotBlank()) {
                            isSaving = true
                            scope.launch {
                                shopRepository.createReward(
                                    name = nameInput,
                                    description = descInput.ifBlank { null },
                                    costCoins = cost,
                                    category = categoryInput,
                                    icon = iconInput
                                )
                                isSaving = false
                                showCreateRewardDialog = false
                                onRefresh()
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = !isSaving && nameInput.isNotBlank() && priceInput.toIntOrNull() != null
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Crear Pase", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showCreateRewardDialog = false },
                    enabled = !isSaving
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Modificar Pase / Recompensa Completa (Docente)
    editingReward?.let { rewardToEdit ->
        var nameInput by remember { mutableStateOf(rewardToEdit.name) }
        var descInput by remember { mutableStateOf(rewardToEdit.description ?: "") }
        var priceInput by remember { mutableStateOf(rewardToEdit.costCoins.toString()) }
        var categoryInput by remember { mutableStateOf(rewardToEdit.category) }
        var iconInput by remember { mutableStateOf(rewardToEdit.icon ?: "🎫") }
        var isSaving by remember { mutableStateOf(false) }
        val emojiPresets = listOf("🎫", "🎧", "⏰", "🚽", "📚", "⭐", "🛡️", "🔥", "🎮", "⚡", "🎁", "☕")

        AlertDialog(
            onDismissRequest = { if (!isSaving) editingReward = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Edit, contentDescription = null, tint = PrimaryIndigo)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Modificar Pase / Recompensa",
                        fontWeight = FontWeight.Black,
                        fontSize = 19.sp
                    )
                }
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedTextField(
                        value = nameInput,
                        onValueChange = { nameInput = it },
                        label = { Text("Nombre del Pase") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = descInput,
                        onValueChange = { descInput = it },
                        label = { Text("Descripción / Reglas") },
                        maxLines = 3,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = priceInput,
                            onValueChange = { priceInput = it },
                            label = { Text("Precio (Coins)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        )

                        Column(modifier = Modifier.weight(1f)) {
                            Text("Tipo", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                FilterChip(
                                    selected = categoryInput == "item" || categoryInput == "game_pass" || categoryInput == "permission",
                                    onClick = { categoryInput = "item" },
                                    label = { Text("Pase", fontSize = 11.sp) },
                                    shape = RoundedCornerShape(8.dp)
                                )
                                FilterChip(
                                    selected = categoryInput == "cosmetic",
                                    onClick = { categoryInput = "cosmetic" },
                                    label = { Text("Skin", fontSize = 11.sp) },
                                    shape = RoundedCornerShape(8.dp)
                                )
                            }
                        }
                    }

                    // Selector de Ícono
                    Text("Elegir Icono:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(emojiPresets) { emoji ->
                            val isSel = iconInput == emoji
                            Surface(
                                onClick = { iconInput = emoji },
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSel) PrimaryIndigoLight else Color(0xFFF1F5F9),
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isSel) PrimaryIndigo else Color(0xFFCBD5E1))
                            ) {
                                Text(
                                    text = emoji,
                                    fontSize = 18.sp,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val cost = priceInput.toIntOrNull() ?: rewardToEdit.costCoins
                        if (nameInput.isNotBlank()) {
                            isSaving = true
                            scope.launch {
                                shopRepository.updateReward(
                                    rewardId = rewardToEdit.id,
                                    name = nameInput,
                                    description = descInput.ifBlank { null },
                                    costCoins = cost,
                                    category = categoryInput,
                                    icon = iconInput
                                )
                                isSaving = false
                                editingReward = null
                                onRefresh()
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = !isSaving && nameInput.isNotBlank() && priceInput.toIntOrNull() != null
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Guardar Cambios", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { editingReward = null },
                    enabled = !isSaving
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    // Modal: Confirmación de Eliminación de Pase (Docente)
    rewardToDelete?.let { reward ->
        AlertDialog(
            onDismissRequest = { if (!isDeletingReward) rewardToDelete = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.DeleteForever, contentDescription = null, tint = StatusError)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Eliminar Pase",
                        fontWeight = FontWeight.Black,
                        fontSize = 19.sp,
                        color = StatusError
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "¿Estás seguro de que querés eliminar el pase '${reward.name}'?",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = TextPrimary
                    )
                    Text(
                        text = "Esta acción eliminará el pase de la tienda para todos los alumnos.",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isDeletingReward = true
                        scope.launch {
                            shopRepository.deleteReward(reward.id)
                            isDeletingReward = false
                            rewardToDelete = null
                            onRefresh()
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = StatusError),
                    enabled = !isDeletingReward
                ) {
                    if (isDeletingReward) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Sí, Eliminar", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { rewardToDelete = null },
                    enabled = !isDeletingReward
                ) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White
        )
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(1),
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        // Teacher Admin Banner
        if (isTeacher) {
            item {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFEEF2FF)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryIndigo.copy(alpha = 0.25f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clip(CircleShape)
                                        .background(PrimaryIndigo.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Rounded.AdminPanelSettings, contentDescription = null, tint = PrimaryIndigo, modifier = Modifier.size(22.dp))
                                }
                                Column {
                                    Text(
                                        text = "Administración de Pases & Tienda",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Black,
                                        color = PrimaryIndigo
                                    )
                                    Text(
                                        text = "Creá, modificá o eliminá pases y permisos para los alumnos.",
                                        fontSize = 11.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        }

                        Button(
                            onClick = { showCreateRewardDialog = true },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Crear Nuevo Pase / Permiso", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        // Category Filter Chips
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(categories) { (key, label) ->
                    val isSelected = selectedCategory == key
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedCategory = key },
                        label = { Text(label, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
                        shape = RoundedCornerShape(12.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = PrimaryIndigo,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }
        }

        items(filteredRewards) { reward ->
            val userPurchase = purchases.firstOrNull { it.rewardId == reward.id }
            val isBought = userPurchase != null
            val isEquipped = userPurchase?.status == "equipped"
            val canAfford = currentCoins >= reward.costCoins

            val skinColor = when (reward.name) {
                "Cyberpunk Neon" -> SkinCyberpunk
                "Oro Holográfico" -> SkinGold
                "Galaxia" -> SkinGalaxy
                "Minimalista Oscuro" -> SkinMinimalist
                else -> PrimaryIndigo
            }

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(
                        width = if (isEquipped) 2.5.dp else 1.dp,
                        color = if (isEquipped) skinColor else BorderLight,
                        shape = RoundedCornerShape(26.dp)
                    ),
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
                        Surface(
                            color = skinColor.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = if (reward.category == "cosmetic") "SKIN NOTYX" else "PASE ESCOLAR",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                color = skinColor,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Surface(
                                color = Color(0xFFFEF3C7),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = "🪙 ${reward.costCoins} Coins",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 12.sp,
                                    color = Color(0xFFB45309),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }

                            if (isEquipped) {
                                Surface(
                                    color = StatusSuccess.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = StatusSuccess, modifier = Modifier.size(14.dp))
                                        Text("Equipado", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = StatusSuccess)
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        reward.icon?.let { iconStr ->
                            Text(text = iconStr, fontSize = 24.sp)
                            Spacer(modifier = Modifier.width(10.dp))
                        }
                        Column {
                            Text(
                                text = reward.name,
                                fontSize = 19.sp,
                                fontWeight = FontWeight.Black,
                                color = TextPrimary
                            )
                            Text(
                                text = reward.description ?: "Recompensa desbloqueable en el aula con Notyx Coins.",
                                fontSize = 13.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    if (isTeacher) {
                        // Teacher Actions: Modify and Delete Pass
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { editingReward = reward },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                            ) {
                                Icon(Icons.Rounded.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Modificar Pase", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }

                            FilledTonalIconButton(
                                onClick = { rewardToDelete = reward },
                                shape = RoundedCornerShape(12.dp),
                                colors = IconButtonDefaults.filledTonalIconButtonColors(
                                    containerColor = Color(0xFFFEE2E2),
                                    contentColor = StatusError
                                )
                            ) {
                                Icon(Icons.Rounded.Delete, contentDescription = "Eliminar Pase", modifier = Modifier.size(20.dp))
                            }
                        }
                    } else {
                        // Student Action: Equip or Buy
                        when {
                            isEquipped -> {
                                OutlinedButton(
                                    onClick = {},
                                    enabled = false,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp)
                                ) {
                                    Text("Skin en Uso", fontWeight = FontWeight.Bold)
                                }
                            }
                            isBought && reward.category == "cosmetic" -> {
                                Button(
                                    onClick = {
                                        if (currentProfile != null) {
                                            scope.launch {
                                                shopRepository.equipSkin(currentProfile.id, reward.id)
                                                onRefresh()
                                            }
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                                ) {
                                    Text("Equipar Skin", fontWeight = FontWeight.Bold)
                                }
                            }
                            isBought -> {
                                OutlinedButton(
                                    onClick = {},
                                    enabled = false,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp)
                                ) {
                                    Text("Comprado", fontWeight = FontWeight.Bold)
                                }
                            }
                            else -> {
                                Button(
                                    onClick = {
                                        if (currentProfile != null && canAfford) {
                                            scope.launch {
                                                shopRepository.buyReward(currentProfile.id, reward.id)
                                                onRefresh()
                                            }
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = AccentAmber),
                                    enabled = canAfford
                                ) {
                                    Icon(Icons.Rounded.ShoppingCart, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Comprar por ${reward.costCoins} Coins",
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
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

@Composable
fun PokemonTab(
    ownedPokemon: List<StudentPokemonStoreItem>,
    currentCoins: Int,
    currentProfile: Profile?,
    shopRepository: ShopRepository,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    selectedType: String,
    onSelectType: (String) -> Unit,
    padding: PaddingValues,
    onRefresh: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val allCatalog = remember { shopRepository.getCatalogPokemon() }
    val ownedIds = remember(ownedPokemon) { ownedPokemon.map { it.pokemonId }.toSet() }

    val typesList = listOf(
        "all" to "Todos",
        "fuego" to "Fuego",
        "agua" to "Agua",
        "planta" to "Planta",
        "electrico" to "Eléctrico",
        "psiquico" to "Psíquico",
        "fantasma" to "Fantasma",
        "dragon" to "Dragón"
    )

    val filteredPokemon = remember(searchQuery, selectedType, allCatalog) {
        allCatalog.filter { poke ->
            val matchesQuery = poke.name.contains(searchQuery, ignoreCase = true)
            val matchesType = if (selectedType == "all") true else poke.types.any { it.equals(selectedType, ignoreCase = true) }
            matchesQuery && matchesType
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchQueryChange,
                placeholder = { Text("Buscar por nombre (ej: Pikachu)") },
                leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = TextSecondary) },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(typesList) { (typeKey, typeLabel) ->
                    val isSelected = selectedType == typeKey
                    FilterChip(
                        selected = isSelected,
                        onClick = { onSelectType(typeKey) },
                        label = { Text(typeLabel) },
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }
        }

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(vertical = 12.dp)
        ) {
            items(filteredPokemon) { pokemon ->
                val isOwned = ownedIds.contains(pokemon.id)
                val canAfford = currentCoins >= pokemon.costCoins

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(22.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(90.dp)
                                .clip(RoundedCornerShape(18.dp))
                                .background(Color(0xFFF8FAFC)),
                            contentAlignment = Alignment.Center
                        ) {
                            AsyncImage(
                                model = pokemon.sprite,
                                contentDescription = pokemon.name,
                                modifier = Modifier.size(76.dp),
                                contentScale = ContentScale.Fit
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = pokemon.name,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )

                        Text(
                            text = pokemon.types.joinToString(" • "),
                            fontSize = 11.sp,
                            color = TextSecondary
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        if (isOwned) {
                            Surface(
                                color = StatusSuccess.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "Capturado",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = StatusSuccess,
                                    modifier = Modifier.padding(vertical = 6.dp),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }
                        } else if (currentProfile?.role != "teacher") {
                            Button(
                                onClick = {
                                    if (currentProfile != null && canAfford) {
                                        scope.launch {
                                            shopRepository.capturePokemon(currentProfile.id, pokemon)
                                            onRefresh()
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                                enabled = canAfford,
                                contentPadding = PaddingValues(vertical = 6.dp)
                            ) {
                                Text(
                                    text = "${pokemon.costCoins} 🪙",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        } else {
                            Surface(
                                color = Color(0xFFF1F5F9),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "${pokemon.costCoins} 🪙",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    modifier = Modifier.padding(vertical = 6.dp),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
