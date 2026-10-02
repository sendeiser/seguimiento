package com.notyx.app.data.repository

import com.notyx.app.data.SupabaseConfig
import com.notyx.app.data.models.Profile
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class AuthRepository {
    private val auth = SupabaseConfig.auth
    private val postgrest = SupabaseConfig.postgrest

    val sessionStatus: Flow<SessionStatus> = auth.sessionStatus

    suspend fun signIn(emailInput: String, passwordInput: String): Result<Profile?> {
        return try {
            auth.signInWith(Email) {
                email = emailInput.trim()
                password = passwordInput
            }
            val user = auth.currentUserOrNull()
            if (user != null) {
                val profile = getProfile(user.id)
                Result.success(profile)
            } else {
                Result.failure(Exception("No se encontró usuario tras el login"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signUp(
        emailInput: String,
        passwordInput: String,
        fullNameInput: String,
        roleInput: String = "teacher"
    ): Result<Profile?> {
        return try {
            auth.signUpWith(Email) {
                email = emailInput.trim()
                password = passwordInput
                data = buildJsonObject {
                    put("full_name", fullNameInput.trim())
                    put("role", roleInput)
                }
            }
            val user = auth.currentUserOrNull()
            if (user != null) {
                var profile = getProfile(user.id)
                if (profile == null) {
                    try {
                        postgrest.from("profiles").upsert(
                            mapOf(
                                "id" to user.id,
                                "full_name" to fullNameInput.trim(),
                                "email" to emailInput.trim(),
                                "role" to roleInput
                            )
                        )
                        profile = getProfile(user.id)
                    } catch (ignored: Exception) {
                        profile = getProfile(user.id)
                    }
                }
                Result.success(profile)
            } else {
                // Registro exitoso pero requiere confirmación por email
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signOut(): Result<Unit> {
        return try {
            auth.signOut()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCurrentProfile(): Profile? {
        val user = auth.currentUserOrNull() ?: return null
        return getProfile(user.id)
    }

    suspend fun getProfile(userId: String): Profile? {
        return try {
            postgrest.from("profiles")
                .select {
                    filter {
                        eq("id", userId)
                    }
                }
                .decodeSingleOrNull<Profile>()
        } catch (e: Exception) {
            null
        }
    }

    suspend fun updateDni(userId: String, newDni: String): Result<Unit> {
        return try {
            postgrest.from("profiles")
                .update({ set("dni", newDni.trim()) }) {
                    filter {
                        eq("id", userId)
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
