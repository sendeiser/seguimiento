package com.notyx.app.data.local

import android.content.Context
import android.content.SharedPreferences
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class SavedClassItem(
    val classId: String,
    val shortCode: String,
    val className: String,
    val studentId: String? = null,
    val studentName: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

class ClassPreferences(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("notyx_class_prefs", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    fun getSavedClasses(): List<SavedClassItem> {
        val raw = prefs.getString("saved_classes", null) ?: return emptyList()
        return try {
            json.decodeFromString<List<SavedClassItem>>(raw)
                .sortedByDescending { it.timestamp }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveClass(item: SavedClassItem) {
        val current = getSavedClasses().filterNot {
            it.shortCode.equals(item.shortCode, ignoreCase = true) || it.classId == item.classId
        }.toMutableList()
        current.add(0, item.copy(timestamp = System.currentTimeMillis()))
        prefs.edit().putString("saved_classes", json.encodeToString(current)).apply()
    }

    fun removeClass(shortCode: String) {
        val updated = getSavedClasses().filterNot { it.shortCode.equals(shortCode, ignoreCase = true) }
        prefs.edit().putString("saved_classes", json.encodeToString(updated)).apply()
    }

    fun updateSelectedStudent(classId: String, studentId: String, studentName: String) {
        val list = getSavedClasses().map {
            if (it.classId == classId) {
                it.copy(studentId = studentId, studentName = studentName, timestamp = System.currentTimeMillis())
            } else it
        }
        prefs.edit().putString("saved_classes", json.encodeToString(list)).apply()
    }

    fun getLastUsedClass(): SavedClassItem? = getSavedClasses().firstOrNull()
}
