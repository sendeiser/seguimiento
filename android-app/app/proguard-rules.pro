# Proguard / R8 Optimization Rules for Notyx Android

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# KotlinX Serialization
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
}

-keepclassmembers class * {
    kotlinx.serialization.KSerializer serializer(...);
}

-keep class *$$serializer {
    *;
}

-keepclasseswithmembers class * {
    @kotlinx.serialization.Serializable <init>(...);
}

# Preserve App Data Models & Local Entities
-keep class com.notyx.app.data.models.** { *; }
-keep class com.notyx.app.data.local.** { *; }
-keepclassmembers class com.notyx.app.data.models.** { *; }
-keepclassmembers class com.notyx.app.data.local.** { *; }

# Supabase Kotlin SDK
-keep class io.github.jan.supabase.** { *; }
-dontwarn io.github.jan.supabase.**

# Ktor & OkHttp
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-keep class okio.** { *; }
-dontwarn okio.**

# Kotlin Coroutines
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Coil Image Loader
-keep class coil.** { *; }
-dontwarn coil.**
