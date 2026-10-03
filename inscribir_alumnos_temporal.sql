-- ==============================================================================
-- MÓDULO DE AUTO-INSCRIPCIÓN TEMPORAL DE ALUMNOS (NOTYX EDU)
-- Ejecutar este script en Supabase SQL Editor para habilitar la inscripción segura
-- ==============================================================================

-- 1. Función para obtener la información de una clase mediante token temporal
CREATE OR REPLACE FUNCTION public.get_temp_enroll_class_info(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class record;
  v_clean_token text;
  v_parts text[];
  v_expires_ms bigint;
  v_is_expired boolean := false;
  v_teacher_name text := 'Docente';
  v_student_count int := 0;
BEGIN
  v_clean_token := trim(p_token);

  -- Buscar clase cuyo join_code contenga el token temporal
  SELECT c.*, p.full_name AS teacher_full_name
  INTO v_class
  FROM classes c
  LEFT JOIN profiles p ON p.id = c.teacher_id
  WHERE c.join_code LIKE '%' || v_clean_token || '%'
  LIMIT 1;

  IF v_class.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'NOT_FOUND',
      'message', 'No se encontró ningún curso con este enlace de inscripción.'
    );
  END IF;

  -- Analizar formato TEMP:TOKEN:EXPIRES_AT_MS
  IF v_class.join_code LIKE 'TEMP:%' THEN
    v_parts := string_to_array(v_class.join_code, ':');
    IF array_length(v_parts, 1) >= 3 THEN
      BEGIN
        v_expires_ms := v_parts[3]::bigint;
        -- Comparar con milisegundos actuales de epoch
        IF (extract(epoch from now()) * 1000)::bigint > v_expires_ms THEN
          v_is_expired := true;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_is_expired := false;
      END;
    END IF;
  ELSE
    -- Si no tiene formato TEMP, se considera inactivo
    v_is_expired := true;
  END IF;

  IF v_is_expired THEN
    RETURN json_build_object(
      'success', false,
      'error', 'EXPIRED',
      'class_name', v_class.name,
      'teacher_name', COALESCE(v_class.teacher_full_name, 'Docente'),
      'message', 'El enlace de inscripción temporal ha expirado o fue cerrado por el docente.'
    );
  END IF;

  -- Contar alumnos actuales
  SELECT count(*) INTO v_student_count
  FROM class_students
  WHERE class_id = v_class.id;

  RETURN json_build_object(
    'success', true,
    'class_id', v_class.id,
    'class_name', v_class.name,
    'teacher_name', COALESCE(v_class.teacher_full_name, 'Docente'),
    'short_code', v_class.short_code,
    'student_count', v_student_count,
    'expires_at_ms', v_expires_ms
  );
END;
$$;

-- 2. Función para inscribir al alumno mediante token temporal (por única vez)
CREATE OR REPLACE FUNCTION public.enroll_student_by_temp_link(
  p_token text,
  p_student_name text,
  p_dni text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class record;
  v_clean_token text;
  v_clean_name text;
  v_clean_dni text;
  v_parts text[];
  v_expires_ms bigint;
  v_student record;
  v_new_student record;
BEGIN
  v_clean_token := trim(p_token);
  v_clean_name := trim(p_student_name);
  v_clean_dni := NULLIF(regexp_replace(COALESCE(p_dni, ''), '[^0-9]', '', 'g'), '');

  IF v_clean_name IS NULL OR length(v_clean_name) < 2 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_NAME',
      'message', 'Por favor ingresá tu nombre y apellido completos.'
    );
  END IF;

  -- 1. Validar clase y token
  SELECT * INTO v_class
  FROM classes
  WHERE join_code LIKE '%' || v_clean_token || '%'
  LIMIT 1;

  IF v_class.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'NOT_FOUND',
      'message', 'El enlace de inscripción no es válido.'
    );
  END IF;

  -- 2. Validar expiración
  IF v_class.join_code LIKE 'TEMP:%' THEN
    v_parts := string_to_array(v_class.join_code, ':');
    IF array_length(v_parts, 1) >= 3 THEN
      BEGIN
        v_expires_ms := v_parts[3]::bigint;
        IF (extract(epoch from now()) * 1000)::bigint > v_expires_ms THEN
          RETURN json_build_object(
            'success', false,
            'error', 'EXPIRED',
            'message', 'El enlace de inscripción ya expiró. Solicitale a tu docente que lo reactive.'
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'INACTIVE',
      'message', 'Las inscripciones para este curso están cerradas actualmente.'
    );
  END IF;

  -- 3. Validar duplicados ("por única vez")
  SELECT * INTO v_student
  FROM class_students
  WHERE class_id = v_class.id
    AND (
      lower(trim(student_name)) = lower(v_clean_name)
      OR (v_clean_dni IS NOT NULL AND dni = v_clean_dni)
    )
  LIMIT 1;

  IF v_student.id IS NOT NULL THEN
    -- El alumno ya estaba inscripto, le devolvemos su ficha para evitar duplicados
    RETURN json_build_object(
      'success', true,
      'already_enrolled', true,
      'message', '¡Ya estabas anotado/a en este curso!',
      'student', json_build_object(
        'id', v_student.id,
        'student_name', v_student.student_name,
        'public_token', v_student.public_token,
        'class_id', v_class.id,
        'class_name', v_class.name
      )
    );
  END IF;

  -- 4. Inscribir alumno
  INSERT INTO class_students (class_id, student_name, dni, public_token)
  VALUES (v_class.id, v_clean_name, v_clean_dni, gen_random_uuid())
  RETURNING * INTO v_new_student;

  RETURN json_build_object(
    'success', true,
    'already_enrolled', false,
    'message', '¡Te inscribiste con éxito al curso!',
    'student', json_build_object(
      'id', v_new_student.id,
      'student_name', v_new_student.student_name,
      'public_token', v_new_student.public_token,
      'class_id', v_class.id,
      'class_name', v_class.name
    )
  );
END;
$$;

-- Otorgar permisos de ejecución al rol anónimo y autenticado
GRANT EXECUTE ON FUNCTION public.get_temp_enroll_class_info(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enroll_student_by_temp_link(text, text, text) TO anon, authenticated, service_role;
