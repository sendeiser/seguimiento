/**
 * Export class grades and attendance to CSV (compatible with Excel / Google Sheets)
 */
export function exportClassToCSV(className, students, criteria, grades, attendance, cuatrimestreFilter = "all", observations = {}) {
  if (!students || students.length === 0) return;

  const filteredCriteria = criteria || [];
  
  // Headers row
  const headers = ["DNI", "Alumno", "Estado Asistencia"];
  filteredCriteria.forEach(c => {
    headers.push(`${c.name} (Max ${c.max_score})`);
  });
  headers.push("Puntaje Total", "Promedio %", "Observaciones del Docente");

  // Build CSV rows
  const rows = [];
  rows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","));

  students.forEach(st => {
    const studentId = st.cs_id || st.id;
    const name = st.profiles?.full_name || st.student_name || st.name || "Sin nombre";
    const dni = st.dni || "—";
    
    let totalScore = 0;
    let maxTotal = 0;
    
    const rowData = [dni, name];

    // Attendance state
    const attRecord = attendance[studentId];
    let attText = "Presente";
    if (typeof attRecord === "string") {
      const map = { present: "Presente", late: "Tarde", justified: "Justificado", absent: "Ausente" };
      attText = map[attRecord] || attRecord;
    } else if (typeof attRecord === "object" && attRecord !== null) {
      const map = { present: "Presente", late: "Tarde", justified: "Justificado", absent: "Ausente" };
      let stKey = "present";
      if (attRecord.is_present === false) {
        stKey = attRecord.status === "justified" ? "justified" : "absent";
      } else {
        stKey = attRecord.status || "present";
      }
      attText = map[stKey] || "Presente";
    } else if (attRecord === false) {
      attText = "Ausente";
    }
    rowData.push(attText);

    // Criteria scores
    filteredCriteria.forEach(c => {
      const key = `${studentId}_${c.id}`;
      const scoreVal = grades[key];
      if (scoreVal !== undefined && scoreVal !== "" && scoreVal !== null) {
        const scoreNum = parseFloat(scoreVal);
        rowData.push(scoreNum);
        totalScore += scoreNum;
        maxTotal += Number(c.max_score || 10);
      } else {
        rowData.push("—");
      }
    });

    const pct = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;
    rowData.push(totalScore, `${pct}%`);

    // Student observation for this session
    const obsText = observations[studentId] || (typeof attRecord === "object" ? attRecord?.observation : "") || "—";
    rowData.push(obsText);

    rows.push(rowData.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
  });

  downloadCSV(rows, `Planilla_${className.replace(/\s+/g, "_")}_${cuatrimestreFilter === "all" ? "AñoCompleto" : `${cuatrimestreFilter}Cuatrimestre`}.csv`);
}

/**
 * Export full attendance matrix for the entire class across all sessions
 */
export function exportAttendanceMatrixToCSV(className, sessions = [], students = [], attendanceRecords = [], cuatrimestreFilter = "all") {
  if (!students || students.length === 0) return;

  // Sort sessions chronologically ascending for the matrix
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build matrix headers: DNI, Alumno, Date1, Date2..., Totals
  const headers = ["DNI", "Alumno"];
  sortedSessions.forEach(s => {
    headers.push(s.date);
  });
  headers.push("Clases Dictadas", "Presentes", "Tardes", "Justificadas", "Ausentes", "% Asistencia General");

  // Create fast lookup map: `${session_id}_${class_student_id}` -> attendance record
  const attMap = {};
  attendanceRecords.forEach(a => {
    attMap[`${a.session_id}_${a.class_student_id}`] = a;
  });

  const rows = [];
  rows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","));

  students.forEach(st => {
    const studentId = st.id || st.cs_id;
    const name = st.profiles?.full_name || st.student_name || st.name || "Sin nombre";
    const dni = st.dni || "—";

    const rowData = [dni, name];

    let countPresent = 0;
    let countLate = 0;
    let countJustified = 0;
    let countAbsent = 0;

    sortedSessions.forEach(s => {
      const rec = attMap[`${s.id}_${studentId}`];
      let code = "P"; // default present if session held
      if (rec) {
        let stStatus = "present";
        if (rec.is_present === false) {
          stStatus = rec.status === "justified" ? "justified" : "absent";
        } else {
          stStatus = rec.status || "present";
        }
        if (stStatus === "present") code = "P";
        else if (stStatus === "late") code = "T";
        else if (stStatus === "justified") code = "J";
        else if (stStatus === "absent") code = "A";
      }

      if (code === "P") countPresent++;
      else if (code === "T") countLate++;
      else if (code === "J") countJustified++;
      else if (code === "A") countAbsent++;

      rowData.push(code);
    });

    const totalSessions = sortedSessions.length;
    // Calculation: (Presentes + Tardes) / Total
    const attendedSessions = countPresent + countLate;
    const pct = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 100;

    rowData.push(totalSessions, countPresent, countLate, countJustified, countAbsent, `${pct}%`);
    rows.push(rowData.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
  });

  downloadCSV(rows, `Asistencia_${className.replace(/\s+/g, "_")}_${cuatrimestreFilter === "all" ? "AñoCompleto" : `${cuatrimestreFilter}Cuatrimestre`}.csv`);
}

function downloadCSV(rows, fileName) {
  const csvContent = "\uFEFF" + rows.join("\r\n"); // \uFEFF ensures UTF-8 BOM for Excel
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
