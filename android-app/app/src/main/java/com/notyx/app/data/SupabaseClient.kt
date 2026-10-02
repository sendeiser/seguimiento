package com.notyx.app.data

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.realtime.Realtime

object SupabaseConfig {
    const val URL = "https://cwejpjukcfytedrpclzg.supabase.co"
    const val ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZWpwanVrY2Z5dGVkcnBjbHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjYzMDEsImV4cCI6MjA4OTkwMjMwMX0.big5WfNUdl3i9TtRRegGztXG2Spv8uC7-vamL1K5cPg"

    val client = createSupabaseClient(
        supabaseUrl = URL,
        supabaseKey = ANON_KEY
    ) {
        install(Auth)
        install(Postgrest)
        install(Realtime)
    }

    val auth: Auth get() = client.auth
    val postgrest: Postgrest get() = client.postgrest
}
