package com.notyx.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notyx.app.data.repository.AuthRepository
import com.notyx.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    onLoginSuccess: () -> Unit,
    onBack: (() -> Unit)? = null
) {
    var isRegisterMode by remember { mutableStateOf(false) }

    // Common fields
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }

    // Register-specific fields
    var fullName by remember { mutableStateOf("") }
    var selectedRole by remember { mutableStateOf("teacher") } // "teacher" or "student"
    var confirmPassword by remember { mutableStateOf("") }
    var showConfirmPassword by remember { mutableStateOf(false) }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var registerSuccessMessage by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgLightSecondary)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 480.dp),
            shape = RoundedCornerShape(32.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 28.dp)
                    .verticalScroll(scrollState),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Notyx Edu Logo Box
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(
                            Brush.linearGradient(listOf(PrimaryIndigo, Color(0xFF6366F1))),
                            RoundedCornerShape(20.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Rounded.School,
                        contentDescription = "Logo",
                        tint = Color.White,
                        modifier = Modifier.size(34.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = "Notyx Edu",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Black,
                    color = TextPrimary
                )
                Text(
                    text = if (isRegisterMode) "Creá tu cuenta para comenzar" else "Gestión Académica & Gamificación",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextSecondary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Selector de modo: [ Iniciar Sesión | Crear Cuenta ]
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFFF1F5F9),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Surface(
                            onClick = {
                                isRegisterMode = false
                                errorMessage = null
                                registerSuccessMessage = null
                            },
                            shape = RoundedCornerShape(12.dp),
                            color = if (!isRegisterMode) Color.White else Color.Transparent,
                            shadowElevation = if (!isRegisterMode) 2.dp else 0.dp,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier.padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Iniciar Sesión",
                                    fontSize = 13.sp,
                                    fontWeight = if (!isRegisterMode) FontWeight.Black else FontWeight.SemiBold,
                                    color = if (!isRegisterMode) PrimaryIndigo else TextSecondary
                                )
                            }
                        }

                        Surface(
                            onClick = {
                                isRegisterMode = true
                                errorMessage = null
                                registerSuccessMessage = null
                            },
                            shape = RoundedCornerShape(12.dp),
                            color = if (isRegisterMode) Color.White else Color.Transparent,
                            shadowElevation = if (isRegisterMode) 2.dp else 0.dp,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier.padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Crear Cuenta",
                                    fontSize = 13.sp,
                                    fontWeight = if (isRegisterMode) FontWeight.Black else FontWeight.SemiBold,
                                    color = if (isRegisterMode) PrimaryIndigo else TextSecondary
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Mensaje de éxito si requirió confirmación
                if (registerSuccessMessage != null) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF0FDF4)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF86EFAC))
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Rounded.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF16A34A),
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "¡Cuenta Creada Exitosamente!",
                                fontWeight = FontWeight.Black,
                                fontSize = 15.sp,
                                color = Color(0xFF15803D)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = registerSuccessMessage ?: "",
                                fontSize = 12.sp,
                                color = Color(0xFF166534),
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = {
                                    isRegisterMode = false
                                    registerSuccessMessage = null
                                },
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                            ) {
                                Text("Ir a Iniciar Sesión", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Campos del formulario
                if (isRegisterMode) {
                    // MODO REGISTRO
                    // Campo Nombre Completo
                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it; errorMessage = null },
                        label = { Text("Nombre y Apellido") },
                        placeholder = { Text("Ej: Prof. Martín Gómez") },
                        leadingIcon = { Icon(Icons.Rounded.Badge, contentDescription = null, tint = PrimaryIndigo) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp)
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Selector de Rol (Docente vs Estudiante)
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "Tipo de Cuenta:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Opción Docente
                            val isDocente = selectedRole == "teacher"
                            Surface(
                                onClick = { selectedRole = "teacher" },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                color = if (isDocente) Color(0xFFEEF2FF) else Color(0xFFF8FAFC),
                                border = androidx.compose.foundation.BorderStroke(
                                    width = if (isDocente) 2.dp else 1.dp,
                                    color = if (isDocente) PrimaryIndigo else Color(0xFFE2E8F0)
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Rounded.School,
                                        contentDescription = null,
                                        tint = if (isDocente) PrimaryIndigo else TextSecondary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Column {
                                        Text(
                                            text = "Docente",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = if (isDocente) PrimaryIndigo else TextPrimary
                                        )
                                        Text(
                                            text = "Crear clases",
                                            fontSize = 10.sp,
                                            color = TextSecondary
                                        )
                                    }
                                }
                            }

                            // Opción Alumno
                            val isAlumno = selectedRole == "student"
                            Surface(
                                onClick = { selectedRole = "student" },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                color = if (isAlumno) Color(0xFFEEF2FF) else Color(0xFFF8FAFC),
                                border = androidx.compose.foundation.BorderStroke(
                                    width = if (isAlumno) 2.dp else 1.dp,
                                    color = if (isAlumno) PrimaryIndigo else Color(0xFFE2E8F0)
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Rounded.Person,
                                        contentDescription = null,
                                        tint = if (isAlumno) PrimaryIndigo else TextSecondary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Column {
                                        Text(
                                            text = "Alumno",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = if (isAlumno) PrimaryIndigo else TextPrimary
                                        )
                                        Text(
                                            text = "Ver boletín",
                                            fontSize = 10.sp,
                                            color = TextSecondary
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                }

                // Email Field (común)
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it; errorMessage = null },
                    label = { Text("Correo Electrónico") },
                    placeholder = { Text("nombre@ejemplo.com") },
                    leadingIcon = { Icon(Icons.Rounded.Mail, contentDescription = null, tint = PrimaryIndigo) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp)
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Password Field
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it; errorMessage = null },
                    label = { Text("Contraseña") },
                    placeholder = { Text(if (isRegisterMode) "Mínimo 6 caracteres" else "Tu contraseña") },
                    leadingIcon = { Icon(Icons.Rounded.Lock, contentDescription = null, tint = PrimaryIndigo) },
                    trailingIcon = {
                        IconButton(onClick = { showPassword = !showPassword }) {
                            Icon(
                                imageVector = if (showPassword) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                                contentDescription = if (showPassword) "Ocultar" else "Mostrar",
                                tint = TextSecondary
                            )
                        }
                    },
                    visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp)
                )

                if (isRegisterMode) {
                    Spacer(modifier = Modifier.height(14.dp))

                    // Confirm Password Field
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it; errorMessage = null },
                        label = { Text("Confirmar Contraseña") },
                        placeholder = { Text("Repetí tu contraseña") },
                        leadingIcon = { Icon(Icons.Rounded.Lock, contentDescription = null, tint = PrimaryIndigo) },
                        trailingIcon = {
                            IconButton(onClick = { showConfirmPassword = !showConfirmPassword }) {
                                Icon(
                                    imageVector = if (showConfirmPassword) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                                    contentDescription = if (showConfirmPassword) "Ocultar" else "Mostrar",
                                    tint = TextSecondary
                                )
                            }
                        },
                        visualTransformation = if (showConfirmPassword) VisualTransformation.None else PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp)
                    )
                }

                // Error Message
                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        color = Color(0xFFFEF2F2),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Rounded.ErrorOutline, contentDescription = null, tint = StatusError, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = errorMessage ?: "",
                                color = StatusError,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Action Button (Login or Register)
                Button(
                    onClick = {
                        if (isRegisterMode) {
                            // Validaciones de Registro
                            if (fullName.isBlank()) {
                                errorMessage = "Por favor ingresá tu nombre y apellido"
                                return@Button
                            }
                            if (email.isBlank() || !email.contains("@")) {
                                errorMessage = "Por favor ingresá un correo electrónico válido"
                                return@Button
                            }
                            if (password.length < 6) {
                                errorMessage = "La contraseña debe tener al menos 6 caracteres"
                                return@Button
                            }
                            if (password != confirmPassword) {
                                errorMessage = "Las contraseñas no coinciden"
                                return@Button
                            }

                            isLoading = true
                            errorMessage = null
                            scope.launch {
                                val result = authRepository.signUp(
                                    emailInput = email.trim(),
                                    passwordInput = password,
                                    fullNameInput = fullName.trim(),
                                    roleInput = selectedRole
                                )
                                isLoading = false
                                if (result.isSuccess) {
                                    val profile = result.getOrNull()
                                    if (profile != null) {
                                        // Login automático exitoso tras registro
                                        onLoginSuccess()
                                    } else {
                                        // Registro creado, esperando verificación o login manual
                                        registerSuccessMessage = "Se ha creado tu cuenta con el correo $email. Ya podés iniciar sesión con tus credenciales."
                                    }
                                } else {
                                    val ex = result.exceptionOrNull()
                                    val rawMsg = ex?.message ?: ex?.localizedMessage ?: "Error al registrar la cuenta"
                                    errorMessage = when {
                                        rawMsg.contains("already registered", ignoreCase = true) || rawMsg.contains("already exists", ignoreCase = true) ->
                                            "Ya existe una cuenta con este correo electrónico. Por favor iniciá sesión."
                                        rawMsg.contains("password", ignoreCase = true) && rawMsg.contains("weak", ignoreCase = true) ->
                                            "La contraseña elegida es muy débil. Usá al menos 6 caracteres."
                                        else -> rawMsg
                                    }
                                }
                            }
                        } else {
                            // Validaciones de Login
                            if (email.isBlank() || password.isBlank()) {
                                errorMessage = "Por favor completá todos los campos"
                                return@Button
                            }
                            isLoading = true
                            errorMessage = null
                            scope.launch {
                                val result = authRepository.signIn(email.trim(), password)
                                isLoading = false
                                if (result.isSuccess) {
                                    onLoginSuccess()
                                } else {
                                    val ex = result.exceptionOrNull()
                                    val rawMsg = ex?.message ?: ex?.localizedMessage ?: "Error al iniciar sesión"
                                    errorMessage = when {
                                        rawMsg.contains("invalid login credentials", ignoreCase = true) || rawMsg.contains("invalid_grant", ignoreCase = true) ->
                                            "Correo electrónico o contraseña incorrectos"
                                        rawMsg.contains("Email not confirmed", ignoreCase = true) ->
                                            "Por favor confirma tu correo electrónico antes de iniciar sesión"
                                        else -> rawMsg
                                    }
                                }
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    enabled = !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text(
                            text = if (isRegisterMode) "Crear Cuenta" else "Iniciar Sesión",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Toggle Footer Link
                TextButton(
                    onClick = {
                        isRegisterMode = !isRegisterMode
                        errorMessage = null
                        registerSuccessMessage = null
                    }
                ) {
                    Text(
                        text = if (isRegisterMode) "¿Ya tenés cuenta? Iniciar sesión" else "¿No tenés cuenta? Crear cuenta nueva",
                        color = PrimaryIndigo,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                if (onBack != null) {
                    TextButton(onClick = onBack) {
                        Text(
                            text = "Volver al Inicio",
                            color = TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}
