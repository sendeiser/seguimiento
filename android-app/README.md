# Notyx Edu - App Android Nativa (Kotlin + Jetpack Compose)

Esta es la aplicación móvil Android nativa de **Notyx Edu**, construida con **Kotlin 2.0**, **Jetpack Compose (Material 3)** y conectada en tiempo real a la misma base de datos **Supabase** que el proyecto web.

---

## 🚀 Cómo abrir este proyecto en otra instancia de Antigravity IDE

Para trabajar en esta app móvil de manera independiente:

1. En **Antigravity IDE**, ve al menú superior:
   - Haz clic en **File (Archivo)** -> **New Window (Nueva ventana)**.
2. En la nueva ventana, selecciona:
   - **File (Archivo)** -> **Open Folder (Abrir carpeta)**.
   - Navega y selecciona la subcarpeta:
     `.../Seguimiento Alumnos/seguimiento/android-app`
3. Antigravity cargará este proyecto como un espacio de trabajo Android dedicado con su propio agente, asistente de Kotlin y Compose.

---

## 📱 Pantallas y Funcionalidades Incluidas

1. **Autenticación (LoginScreen)**:
   - Conexión directa con **Supabase Auth** (`io.github.jan-tennert.supabase:auth-kt`).
   - Inicio de sesión con correo y contraseña.

2. **Dashboard del Estudiante (DashboardScreen)**:
   - Tarjeta interactiva del estudiante (`StudentCardView`) con avatar con iniciales, nivel, cálculo dinámico de HP (vida), racha de asistencia y barra de progreso de XP.
   - Borde dinámico con el tema de la **Skin equipada** (*Cyberpunk Neon*, *Oro Holográfico*, *Galaxia*, *Minimalista Oscuro*).
   - Saldo visible de **Notyx Coins** en la barra superior y botón de actualización en tiempo real.
   - **Galería de Insignias y Logros**: Visualización de logros desbloqueados y bloqueados (*Primer Paso*, *Racha x3*, *Imparable x5*, *Día Perfecto*, *Perfeccionista*, *Mejora Continua*, *Ave Fénix*).
   - Accesos directos rápidos al Boletín Académico, al Ranking y al Bazar.

3. **Seguimiento Académico (AcademicScreen)**:
   - Pestaña **Boletín de Calificaciones**: Promedio general, condición académica (*Promocionado*, *Regular*, *En Riesgo*), y desglose de notas por criterio y sesión con barras de rendimiento visual.
   - Pestaña **Historial de Asistencia**: Tasa porcentual de presentismo, contador de asistencias vs faltas, y listado cronológico de sesiones con estados de asistencia.

4. **Ranking Global (RankingScreen)**:
   - **Podio Top 3**: Columnas de podio para 1° puesto (Corona/Oro), 2° puesto (Plata) y 3° puesto (Bronce).
   - Tabla de posiciones completa con puestos `#1`, `#2`, `#3`, nivel, rango y XP acumulada calculada con el mismo motor que la web (`150 XP/nivel`, factor de monedas `1.5x`).

5. **Bazar & Tienda (ShopScreen)**:
   - Pestaña **Skins Temáticas**: Catálogo de skins legendarias con compra y equipamiento en tiempo real.
   - Pestaña **Centro Pokémon**: Catálogo PokéDex con buscador, filtros por tipo elemental (*Eléctrico*, *Fuego*, *Agua*, *Planta*, *Psíquico*, *Dragón*, etc.), renderizado de arte oficial en alta resolución con Coil y captura con Notyx Coins.

6. **Perfil de Usuario (ProfileScreen)**:
   - Tarjeta con datos personales, rol (`Estudiante` o `Docente`), versión y cierre de sesión seguro.
   - **Módulo de DNI**: Diálogo interactivo para cargar o editar el número de DNI del alumno directamente desde la app.

---

## ⚙️ Conexión con Supabase

El archivo `app/src/main/java/com/notyx/app/data/SupabaseClient.kt` ya está configurado con:
- **URL**: `https://cwejpjukcfytedrpclzg.supabase.co`
- **Anon Key**: Clave activa del proyecto.
- Tablas sincronizadas: `profiles`, `class_students`, `grades`, `attendance`, `rewards`, `student_purchases`.

---

## 🛠️ Compilación y Ejecución

Si cuentas con el SDK de Android instalado (`Android Studio` o `cmdline-tools`):

- **Compilar APK de depuración**:
  ```bash
  ./gradlew assembleDebug
  ```

- **Ejecutar en dispositivo o emulador**:
  ```bash
  ./gradlew installDebug
  ```
  O ábrelo en **Android Studio** seleccionando la carpeta `android-app/`.
