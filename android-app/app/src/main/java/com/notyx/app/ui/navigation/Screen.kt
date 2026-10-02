package com.notyx.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Leaderboard
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector? = null) {
    object Gateway : Screen("gateway", "Inicio")
    object Login : Screen("login", "Iniciar Sesión")
    object TutorPortal : Screen("tutor_portal", "Portal Tutores")

    // Teacher screens
    object TeacherDashboard : Screen("teacher_dashboard", "Mis Clases", Icons.Rounded.School)
    object TeacherClassDetail : Screen("teacher_class_detail/{classId}/{className}/{shortCode}", "Detalle de Clase") {
        fun createRoute(classId: String, className: String, shortCode: String?): String {
            val encodedName = java.net.URLEncoder.encode(className, "UTF-8")
            val code = shortCode?.ifBlank { "NONE" } ?: "NONE"
            return "teacher_class_detail/$classId/$encodedName/$code"
        }
    }
    object TeacherSessionDetail : Screen("teacher_session_detail/{sessionId}/{classId}/{sessionDate}/{cuatrimestre}/{className}", "Detalle de Sesión") {
        fun createRoute(sessionId: String, classId: String, sessionDate: String, cuatrimestre: Int, className: String): String {
            val encodedDate = java.net.URLEncoder.encode(if (sessionDate.isBlank()) "SinFecha" else sessionDate, "UTF-8")
            val encodedName = java.net.URLEncoder.encode(className, "UTF-8")
            return "teacher_session_detail/$sessionId/$classId/$encodedDate/$cuatrimestre/$encodedName"
        }
    }

    // Student screens
    object Dashboard : Screen("dashboard", "Inicio", Icons.Rounded.Home)
    object StudentClassDetail : Screen("student_class_detail/{classId}/{className}/{teacherName}", "Detalle de Materia") {
        fun createRoute(classId: String, className: String, teacherName: String?): String {
            val encodedName = java.net.URLEncoder.encode(className, "UTF-8")
            val encodedTeacher = java.net.URLEncoder.encode(teacherName ?: "Docente", "UTF-8")
            return "student_class_detail/$classId/$encodedName/$encodedTeacher"
        }
    }
    object StudentClassPortal : Screen("student_class_portal/{classId}/{shortCode}/{className}", "Portal de Clase") {
        fun createRoute(classId: String, shortCode: String, className: String): String {
            val encodedName = java.net.URLEncoder.encode(className, "UTF-8")
            val code = shortCode.ifBlank { "CODE" }
            return "student_class_portal/$classId/$code/$encodedName"
        }
    }
    object Gamification : Screen("gamification", "Gamificación", Icons.Rounded.EmojiEvents)
    object Academic : Screen("academic", "Boletín", Icons.AutoMirrored.Rounded.MenuBook)
    object BoletinDni : Screen("boletin_dni/{initialDni}", "Boletín DNI") {
        fun createRoute(initialDni: String = "NONE"): String {
            val clean = initialDni.ifBlank { "NONE" }
            return "boletin_dni/$clean"
        }
    }
    object Ranking : Screen("ranking", "Ranking", Icons.Rounded.Leaderboard)
    object Shop : Screen("shop", "Bazar", Icons.Rounded.ShoppingBag)
    object Profile : Screen("profile", "Perfil", Icons.Rounded.Person)

    companion object {
        val studentNavItems = listOf(Dashboard, Gamification, Academic, Shop, Profile)
        val teacherNavItems = listOf(TeacherDashboard, Shop, Ranking, Profile)
    }
}
