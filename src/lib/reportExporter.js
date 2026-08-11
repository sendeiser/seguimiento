/**
 * Export class grades and attendance to CSV (compatible with Excel / Google Sheets)
 */
export function exportClassToCSV(className, students, criteria, grades, attendance, cuatrimestreFilter = "all") {
  if (!students || students.length === 0) return;

  const filteredCriteria = criteria || [];
  
  // Headers row
  const headers = ["DNI", "Alumno", "Asistencia %"];
  filteredCriteria.forEach(c => {
    headers.push(`${c.name} (Max ${c.max_score})`);
  });
  headers.push("Puntaje Total", "Promedio %");

  // Build CSV rows
  const rows = [];
  rows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","));

  students.forEach(st => {
    const name = st.profiles?.full_name || st.student_name || st.name || "Sin nombre";
    const dni = st.dni || "—";
    
    let totalScore = 0;
    let maxTotal = 0;
    
    const rowData = [dni, name];

    // Attendance state
    const isPresent = attendance[st.cs_id || st.id] !== false;
    rowData.push(isPresent ? "100%" : "0%");

    // Criteria scores
    filteredCriteria.forEach(c => {
      const key = `${st.cs_id || st.id}_${c.id}`;
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

    rows.push(rowData.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
  });

  const csvContent = "\uFEFF" + rows.join("\r\n"); // \uFEFF ensures UTF-8 BOM for Excel
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  const fileName = `Planilla_${className.replace(/\s+/g, "_")}_${cuatrimestreFilter === "all" ? "AñoCompleto" : `${cuatrimestreFilter}Cuatrimestre`}.csv`;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
