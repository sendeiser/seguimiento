/**
 * Motor pedagógico de síntesis y evaluación académica para Notyx Edu
 */

export function calculateAcademicStatus(averageScore, attendancePercentage = 100) {
  const avg = Number(averageScore) || 0;
  const att = Number(attendancePercentage) || 0;

  if (avg >= 7 && att >= 75) {
    return {
      status: "promocionado",
      label: "Promocionado",
      description: "Aprobación directa con promedio destacado y asistencia regular",
      colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
      badgeColor: "bg-emerald-600 text-white",
      dotColor: "bg-emerald-500",
    };
  }

  if (avg >= 4 && att >= 60) {
    return {
      status: "aprobado",
      label: "Regular / Aprobado",
      description: "Objetivos mínimos alcanzados; habilitado para instancias finales",
      colorClass: "text-amber-700 bg-amber-50 border-amber-200",
      badgeColor: "bg-amber-600 text-white",
      dotColor: "bg-amber-500",
    };
  }

  return {
    status: "recuperatorio",
    label: "Recuperatorio / Examen",
    description: "Requiere intensificación en período de diciembre/febrero",
    colorClass: "text-rose-700 bg-rose-50 border-rose-200",
    badgeColor: "bg-rose-600 text-white",
    dotColor: "bg-rose-500",
  };
}

export function generatePedagogicalFeedback({
  studentName = "El estudiante",
  criteriaScores = [],
  attendanceRate = 100,
  attStatus = "present",
  className = "",
}) {
  const validScores = criteriaScores.filter((c) => c.score !== null && c.score !== undefined);
  const totalScore = validScores.reduce((sum, c) => sum + Number(c.score), 0);
  const maxPossible = validScores.reduce((sum, c) => sum + Number(c.max_score || 10), 0);
  const pct = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 70;

  // 1. Diagnóstico general
  let apertura = "";
  if (pct >= 85) {
    apertura = `${studentName} ha demostrado un desempeño sobresaliente en ${className || "la materia"}, evidenciando compromiso constante y autonomía en las actividades escolares.`;
  } else if (pct >= 70) {
    apertura = `${studentName} presenta un buen desempeño general en ${className || "la materia"}, respondiendo favorablemente a los objetivos planteados con dedicación.`;
  } else if (pct >= 55) {
    apertura = `${studentName} se encuentra en proceso de afianzar los contenidos trabajados en ${className || "la materia"}, mostrando progresos paulatinos en el aula.`;
  } else {
    apertura = `Se observa que ${studentName} presenta dificultades en la asimilación de contenidos fundamentales, por lo que resulta prioritario fortalecer el trabajo diario.`;
  }

  // 2. Criterios destacados y aspectos a reforzar
  const fortalezas = validScores
    .filter((c) => Number(c.score) / Number(c.max_score || 10) >= 0.75)
    .map((c) => c.name.toLowerCase());

  const aMejorar = validScores
    .filter((c) => Number(c.score) / Number(c.max_score || 10) < 0.6)
    .map((c) => c.name.toLowerCase());

  let detalleCriterios = "";
  if (fortalezas.length > 0) {
    detalleCriterios += ` Destacó especialmente por su labor en ${fortalezas.join(", ")}.`;
  }
  if (aMejorar.length > 0) {
    detalleCriterios += ` Se recomienda poner especial énfasis y refuerzo en ${aMejorar.join(", ")}.`;
  }

  // 3. Regularidad de asistencia
  let detalleAsistencia = "";
  if (attendanceRate >= 90) {
    detalleAsistencia = ` Mantiene una asistencia ejemplar (${attendanceRate}%), lo cual favorece notablemente su continuidad académica.`;
  } else if (attendanceRate >= 75) {
    detalleAsistencia = ` Su nivel de asistencia es regular (${attendanceRate}%), sosteniendo el ritmo de trabajo del grupo.`;
  } else {
    detalleAsistencia = ` Se registra un porcentaje de asistencia crítico (${attendanceRate}%), motivo por el cual es indispensable regularizar la concurrencia a clase para no discontinuar el aprendizaje.`;
  }

  // 4. Recomendación pedagógica
  let cierre = "";
  if (pct >= 75 && attendanceRate >= 75) {
    cierre = " Felicitamos su dedicación e invitamos a continuar por este camino.";
  } else if (pct >= 55) {
    cierre = " Con mayor constancia en las entregas y repaso en casa logrará consolidar plenamente sus metas.";
  } else {
    cierre = " Sugerimos coordinar un espacio de apoyo pedagógico y mantener estrecha comunicación familia-escuela.";
  }

  return `${apertura}${detalleCriterios}${detalleAsistencia}${cierre}`.trim();
}
