package com.notyx.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Badge
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.automirrored.rounded.ExitToApp
import androidx.compose.material.icons.rounded.Person
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
import com.notyx.app.data.models.Profile
import com.notyx.app.data.repository.AuthRepository
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    currentProfile: Profile?,
    authRepository: AuthRepository,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var profileState by remember { mutableStateOf(currentProfile) }
    var showDniDialog by remember { mutableStateOf(false) }
    var dniInput by remember { mutableStateOf(currentProfile?.dni ?: "") }
    var isSavingDni by remember { mutableStateOf(false) }

    LaunchedEffect(currentProfile) {
        profileState = currentProfile
        dniInput = currentProfile?.dni ?: ""
    }

    if (showDniDialog) {
        AlertDialog(
            onDismissRequest = { if (!isSavingDni) showDniDialog = false },
            title = {
                Text(
                    text = "Actualizar DNI",
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp
                )
            },
            text = {
                Column {
                    Text(
                        text = "Ingresa tu número de DNI para vincular tu boletín académico y habilitar consultas.",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    OutlinedTextField(
                        value = dniInput,
                        onValueChange = { dniInput = it },
                        label = { Text("Número de DNI") },
                        leadingIcon = { Icon(Icons.Rounded.Badge, contentDescription = null, tint = PrimaryIndigo) },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val userId = profileState?.id
                        if (userId != null && dniInput.isNotBlank()) {
                            isSavingDni = true
                            scope.launch {
                                val result = authRepository.updateDni(userId, dniInput)
                                isSavingDni = false
                                if (result.isSuccess) {
                                    profileState = profileState?.copy(dni = dniInput.trim())
                                    showDniDialog = false
                                }
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = !isSavingDni && dniInput.isNotBlank()
                ) {
                    if (isSavingDni) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Guardar", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showDniDialog = false },
                    enabled = !isSavingDni
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
            TopAppBar(
                title = {
                    Text(
                        text = "Mi Perfil",
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Profile Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(Brush.linearGradient(listOf(PrimaryIndigo, Color(0xFF818CF8)))),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (profileState?.fullName?.take(1) ?: "U").uppercase(),
                            fontSize = 32.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = profileState?.fullName ?: "Usuario",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        color = TextPrimary
                    )
                    Text(
                        text = profileState?.email ?: "",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Surface(
                        color = PrimaryIndigo.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(
                            text = if (profileState?.role == "teacher") "DOCENTE" else "ESTUDIANTE",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = PrimaryIndigo,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // Account Details Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("Detalles de la Cuenta", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("DNI", fontSize = 12.sp, color = TextSecondary)
                            Text(
                                text = profileState?.dni ?: "No registrado",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (profileState?.dni != null) TextPrimary else TextMuted
                            )
                        }

                        IconButton(onClick = { showDniDialog = true }) {
                            Icon(Icons.Rounded.Edit, contentDescription = "Editar DNI", tint = PrimaryIndigo)
                        }
                    }

                    HorizontalDivider(color = BorderLight)

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Rol en Notyx", fontSize = 13.sp, color = TextSecondary)
                        Text(
                            text = if (profileState?.role == "teacher") "Docente" else "Estudiante",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }

                    HorizontalDivider(color = BorderLight)

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Versión de la App", fontSize = 13.sp, color = TextSecondary)
                        Text("1.0.0 (Native Android)", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Logout Button
            Button(
                onClick = {
                    scope.launch {
                        authRepository.signOut()
                        onLogout()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = StatusError)
            ) {
                Icon(Icons.AutoMirrored.Rounded.ExitToApp, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Cerrar Sesión", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
