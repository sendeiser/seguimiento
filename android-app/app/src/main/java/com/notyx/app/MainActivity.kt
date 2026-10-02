package com.notyx.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.notyx.app.data.local.ClassPreferences
import com.notyx.app.data.local.SavedClassItem
import com.notyx.app.data.models.Profile
import com.notyx.app.data.repository.AuthRepository
import com.notyx.app.data.repository.ShopRepository
import com.notyx.app.data.repository.StudentRepository
import com.notyx.app.data.repository.TeacherRepository
import com.notyx.app.ui.navigation.Screen
import com.notyx.app.ui.screens.*
import com.notyx.app.ui.theme.NotyxTheme
import com.notyx.app.ui.theme.PrimaryIndigo
import com.notyx.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val authRepository = AuthRepository()
    private val studentRepository = StudentRepository()
    private val shopRepository = ShopRepository()
    private val teacherRepository = TeacherRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NotyxTheme {
                NotyxApp(
                    authRepository = authRepository,
                    studentRepository = studentRepository,
                    shopRepository = shopRepository,
                    teacherRepository = teacherRepository
                )
            }
        }
    }
}

@Composable
fun NotyxApp(
    authRepository: AuthRepository,
    studentRepository: StudentRepository,
    shopRepository: ShopRepository,
    teacherRepository: TeacherRepository
) {
    val context = LocalContext.current
    val classPreferences = remember { ClassPreferences(context) }
    val navController = rememberNavController()
    var currentProfile by remember { mutableStateOf<Profile?>(null) }
    var isCheckingSession by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val profile = authRepository.getCurrentProfile()
        currentProfile = profile
        isCheckingSession = false
    }

    if (isCheckingSession) {
        Surface(modifier = Modifier.fillMaxSize()) {
            // Splash / Initial loading
        }
        return
    }

    val startDestination = when {
        currentProfile == null -> Screen.Gateway.route
        currentProfile?.role == "teacher" -> Screen.TeacherDashboard.route
        else -> Screen.Dashboard.route
    }

    val currentNavItems = when (currentProfile?.role) {
        "teacher" -> Screen.teacherNavItems
        "student" -> Screen.studentNavItems
        else -> if (currentProfile != null) Screen.studentNavItems else emptyList()
    }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val showBottomBar = currentRoute in currentNavItems.map { it.route }

    Scaffold(
        bottomBar = {
            if (showBottomBar && currentNavItems.isNotEmpty()) {
                NavigationBar(
                    containerColor = Color.White,
                    tonalElevation = 8.dp
                ) {
                    currentNavItems.forEach { screen ->
                        val isSelected = currentRoute == screen.route
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                if (screen.icon != null) {
                                    Icon(
                                        imageVector = screen.icon,
                                        contentDescription = screen.title
                                    )
                                }
                            },
                            label = { Text(screen.title) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = PrimaryIndigo,
                                selectedTextColor = PrimaryIndigo,
                                indicatorColor = PrimaryIndigo.copy(alpha = 0.12f),
                                unselectedIconColor = TextSecondary,
                                unselectedTextColor = TextSecondary
                            )
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(paddingValues)
        ) {
            // Gateway Screen (Role Selector & Code Input)
            composable(Screen.Gateway.route) {
                var isCheckingCode by remember { mutableStateOf(false) }
                var gatewayErrorMessage by remember { mutableStateOf<String?>(null) }
                var savedClasses by remember { mutableStateOf(classPreferences.getSavedClasses()) }

                GatewayScreen(
                    savedClasses = savedClasses,
                    onSelectSavedClass = { item ->
                        navController.navigate(
                            Screen.StudentClassPortal.createRoute(item.classId, item.shortCode, item.className)
                        )
                    },
                    onRemoveSavedClass = { code ->
                        classPreferences.removeClass(code)
                        savedClasses = classPreferences.getSavedClasses()
                    },
                    onNavigateToLogin = {
                        navController.navigate(Screen.Login.route)
                    },
                    onNavigateToTutor = {
                        navController.navigate(Screen.TutorPortal.route)
                    },
                    onNavigateToBoletinDni = {
                        navController.navigate(Screen.BoletinDni.createRoute())
                    },
                    isCheckingCode = isCheckingCode,
                    errorMessage = gatewayErrorMessage,
                    onCodeSubmit = { code, saveClass ->
                        val clean = code.trim()
                        if (clean.all { it.isDigit() }) {
                            // If numeric, open Boletín por DNI directly
                            navController.navigate(Screen.BoletinDni.createRoute(clean))
                        } else {
                            isCheckingCode = true
                            gatewayErrorMessage = null
                            scope.launch {
                                val result = studentRepository.getClassByCode(clean)
                                isCheckingCode = false
                                result.fold(
                                    onSuccess = { targetClass ->
                                        if (saveClass) {
                                            classPreferences.saveClass(
                                                SavedClassItem(
                                                    classId = targetClass.id,
                                                    shortCode = targetClass.shortCode ?: clean,
                                                    className = targetClass.name
                                                )
                                            )
                                            savedClasses = classPreferences.getSavedClasses()
                                        }
                                        navController.navigate(
                                            Screen.StudentClassPortal.createRoute(
                                                classId = targetClass.id,
                                                shortCode = targetClass.shortCode ?: clean,
                                                className = targetClass.name
                                            )
                                        )
                                    },
                                    onFailure = { ex ->
                                        gatewayErrorMessage = ex.message ?: "No se encontró la clase con el código '$clean'"
                                    }
                                )
                            }
                        }
                    }
                )
            }

            // Auth Login Screen
            composable(Screen.Login.route) {
                LoginScreen(
                    authRepository = authRepository,
                    onLoginSuccess = {
                        scope.launch {
                            val profile = authRepository.getCurrentProfile()
                            currentProfile = profile
                            val destination = if (profile?.role == "teacher") {
                                Screen.TeacherDashboard.route
                            } else {
                                Screen.Dashboard.route
                            }
                            navController.navigate(destination) {
                                popUpTo(Screen.Gateway.route) { inclusive = true }
                            }
                        }
                    },
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            // Tutor Portal (DNI Query without credentials)
            composable(Screen.TutorPortal.route) {
                TutorPortalScreen(
                    studentRepository = studentRepository,
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            // Teacher Dashboard (List of Classes)
            composable(Screen.TeacherDashboard.route) {
                TeacherDashboardScreen(
                    currentProfile = currentProfile,
                    teacherRepository = teacherRepository,
                    onSelectClass = { classId, className, shortCode ->
                        navController.navigate(
                            Screen.TeacherClassDetail.createRoute(classId, className, shortCode)
                        )
                    }
                )
            }

            // Teacher Class Detail Screen
            composable(
                route = Screen.TeacherClassDetail.route,
                arguments = listOf(
                    navArgument("classId") { type = NavType.StringType },
                    navArgument("className") { type = NavType.StringType },
                    navArgument("shortCode") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val classId = backStackEntry.arguments?.getString("classId") ?: ""
                val rawName = backStackEntry.arguments?.getString("className") ?: "Clase"
                val className = try {
                    java.net.URLDecoder.decode(rawName, "UTF-8")
                } catch (e: Exception) {
                    rawName
                }
                val rawCode = backStackEntry.arguments?.getString("shortCode")
                val shortCode = if (rawCode == "NONE" || rawCode == null) null else rawCode

                TeacherClassDetailScreen(
                    classId = classId,
                    className = className,
                    shortCode = shortCode,
                    teacherRepository = teacherRepository,
                    onBack = {
                        navController.popBackStack()
                    },
                    onSelectSession = { sessionId, sessionDate, cuatrimestre ->
                        navController.navigate(
                            Screen.TeacherSessionDetail.createRoute(
                                sessionId = sessionId,
                                classId = classId,
                                sessionDate = sessionDate,
                                cuatrimestre = cuatrimestre,
                                className = className
                            )
                        )
                    }
                )
            }

            // Teacher Session Detail Screen (Criterios, Calificaciones & Asistencia)
            composable(
                route = Screen.TeacherSessionDetail.route,
                arguments = listOf(
                    navArgument("sessionId") { type = NavType.StringType },
                    navArgument("classId") { type = NavType.StringType },
                    navArgument("sessionDate") { type = NavType.StringType },
                    navArgument("cuatrimestre") { type = NavType.IntType },
                    navArgument("className") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val sessionId = backStackEntry.arguments?.getString("sessionId") ?: ""
                val classId = backStackEntry.arguments?.getString("classId") ?: ""
                val rawDate = backStackEntry.arguments?.getString("sessionDate") ?: ""
                val sessionDate = try {
                    java.net.URLDecoder.decode(rawDate, "UTF-8")
                } catch (e: Exception) { rawDate }
                val cuatrimestre = backStackEntry.arguments?.getInt("cuatrimestre") ?: 1
                val rawName = backStackEntry.arguments?.getString("className") ?: "Clase"
                val className = try {
                    java.net.URLDecoder.decode(rawName, "UTF-8")
                } catch (e: Exception) { rawName }

                TeacherSessionDetailScreen(
                    sessionId = sessionId,
                    classId = classId,
                    sessionDate = sessionDate,
                    cuatrimestre = cuatrimestre,
                    className = className,
                    teacherRepository = teacherRepository,
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            // Student Dashboard (Gamified profile, Mis Materias & Shortcuts)
            composable(Screen.Dashboard.route) {
                DashboardScreen(
                    currentProfile = currentProfile,
                    studentRepository = studentRepository,
                    onNavigateToAcademic = {
                        navController.navigate(Screen.Academic.route)
                    },
                    onNavigateToGamification = {
                        navController.navigate(Screen.Gamification.route)
                    },
                    onNavigateToRanking = {
                        navController.navigate(Screen.Ranking.route)
                    },
                    onNavigateToShop = {
                        navController.navigate(Screen.Shop.route)
                    },
                    onSelectClass = { classId, className, teacherName ->
                        navController.navigate(
                            Screen.StudentClassDetail.createRoute(classId, className, teacherName)
                        )
                    }
                )
            }

            // Gamification Screen (RPG Stats, HP, Level, Houses & Badges)
            composable(Screen.Gamification.route) {
                GamificationScreen(
                    currentProfile = currentProfile,
                    studentRepository = studentRepository,
                    onNavigateToShop = {
                        navController.navigate(Screen.Shop.route)
                    }
                )
            }

            // Student Class Detail Screen
            composable(
                route = Screen.StudentClassDetail.route,
                arguments = listOf(
                    navArgument("classId") { type = NavType.StringType },
                    navArgument("className") { type = NavType.StringType },
                    navArgument("teacherName") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val classId = backStackEntry.arguments?.getString("classId") ?: ""
                val rawName = backStackEntry.arguments?.getString("className") ?: "Materia"
                val className = try {
                    java.net.URLDecoder.decode(rawName, "UTF-8")
                } catch (e: Exception) {
                    rawName
                }
                val rawTeacher = backStackEntry.arguments?.getString("teacherName") ?: "Docente"
                val teacherName = try {
                    java.net.URLDecoder.decode(rawTeacher, "UTF-8")
                } catch (e: Exception) {
                    rawTeacher
                }

                StudentClassDetailScreen(
                    classId = classId,
                    className = className,
                    teacherName = teacherName,
                    currentProfile = currentProfile,
                    studentRepository = studentRepository,
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            // Student Class Portal Screen (Direct access via Class Code)
            composable(
                route = Screen.StudentClassPortal.route,
                arguments = listOf(
                    navArgument("classId") { type = NavType.StringType },
                    navArgument("shortCode") { type = NavType.StringType },
                    navArgument("className") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val classId = backStackEntry.arguments?.getString("classId") ?: ""
                val shortCode = backStackEntry.arguments?.getString("shortCode") ?: ""
                val rawName = backStackEntry.arguments?.getString("className") ?: "Clase"
                val className = try {
                    java.net.URLDecoder.decode(rawName, "UTF-8")
                } catch (e: Exception) {
                    rawName
                }

                StudentClassPortalScreen(
                    classId = classId,
                    shortCode = shortCode,
                    className = className,
                    studentRepository = studentRepository,
                    shopRepository = shopRepository,
                    classPreferences = classPreferences,
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            // Academic Screen (Calificaciones & Asistencia)
            composable(Screen.Academic.route) {
                AcademicScreen(
                    currentProfile = currentProfile,
                    studentRepository = studentRepository
                )
            }

            // Boletín DNI Screen (Official school transcript by DNI)
            composable(
                route = Screen.BoletinDni.route,
                arguments = listOf(
                    navArgument("initialDni") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val rawDni = backStackEntry.arguments?.getString("initialDni") ?: "NONE"
                val initialDni = if (rawDni == "NONE") "" else rawDni
                BoletinDniScreen(
                    initialDni = initialDni,
                    studentRepository = studentRepository,
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            // Global Ranking Screen
            composable(Screen.Ranking.route) {
                RankingScreen(studentRepository = studentRepository)
            }

            // Shop Screen (Pokemon store & Skins)
            composable(Screen.Shop.route) {
                ShopScreen(
                    currentProfile = currentProfile,
                    shopRepository = shopRepository,
                    studentRepository = studentRepository
                )
            }

            // Profile Screen (User details, DNI update & Logout)
            composable(Screen.Profile.route) {
                ProfileScreen(
                    currentProfile = currentProfile,
                    authRepository = authRepository,
                    onLogout = {
                        currentProfile = null
                        navController.navigate(Screen.Gateway.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
