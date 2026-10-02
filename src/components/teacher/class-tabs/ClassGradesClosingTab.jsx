import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../ui/button";
import {
  GraduationCap,
  Search,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Award,
  Sparkles,
  Filter,
  FileSpreadsheet,
  ChevronRight,
  TrendingUp,
  Percent,
  UserCheck,
  Eye,
  X,
  FileText
} from "lucide-react";
import { calculateAcademicStatus, generatePedagogicalFeedback } from "../../../lib/pedagogicalReportEngine";
import { exportAcademicClosingToCSV } from "../../../lib/reportExporter";
import StudentReportModal from "../../reports/StudentReportModal";

export default function ClassGradesClosingTab({
  classData,
  sessions = [],
  students = [],
  allAttendance = [],
  getStudentName,
}) {
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState([]);
  const [grades, setGrades] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | promocionado | aprobado | recuperatorio
  const [viewScope, setViewScope] = useState("annual"); // annual | c1 | c2
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [activeReportStudent, setActiveReportStudent] = useState(null);

  // Fetch all criteria and grades for all sessions in this class
  useEffect(() => {
    let isMounted = true;
    const fetchClassGradesData = async () => {
      if (!sessions || sessions.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const sessionIds = sessions.map((s) => s.id);

        // 1. Fetch criteria for all sessions
        const { data: criteriaData, error: critErr } = await supabase
          .from("session_criteria")
          .select("id, session_id, name, max_score")
          .in("session_id", sessionIds);

        if (critErr) throw critErr;

        const allCrit = criteriaData || [];
        if (isMounted) setCriteria(allCrit);

        // 2. Fetch grades for these criteria
        if (allCrit.length > 0) {
          const critIds = allCrit.map((c) => c.id);
          const { data: gradesData, error: gradeErr } = await supabase
            .from("grades")
            .select("class_student_id, criteria_id, score, comment")
            .in("criteria_id", critIds);

          if (gradeErr) throw gradeErr;
          if (isMounted) setGrades(gradesData || []);
        } else {
          if (isMounted) setGrades([]);
        }
      } catch (err) {
        console.error("Error loading class grades for closing:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchClassGradesData();
    return () => {
      isMounted = false;
    };
  }, [sessions]);

  // Lookup maps for fast access
  const sessionById = useMemo(() => {
    const map = {};
    sessions.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [sessions]);

  const criteriaById = useMemo(() => {
    const map = {};
    criteria.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [criteria]);

  // Map: `${class_student_id}_${criteria_id}` -> grade
  const gradeLookup = useMemo(() => {
    const map = {};
    grades.forEach((g) => {
      map[`${g.class_student_id}_${g.criteria_id}`] = g;
    });
    return map;
  }, [grades]);

  // Map: `${session_id}_${class_student_id}` -> attendance
  const attLookup = useMemo(() => {
    const map = {};
    allAttendance.forEach((a) => {
      map[`${a.session_id}_${a.class_student_id}`] = a;
    });
    return map;
  }, [allAttendance]);

  // Group sessions by cuatrimestre
  const { sessionsC1, sessionsC2 } = useMemo(() => {
    const c1 = [];
    const c2 = [];
    sessions.forEach((s) => {
      const cuatri = s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1);
      if (cuatri === 1) c1.push(s);
      else c2.push(s);
    });
    return { sessionsC1: c1, sessionsC2: c2 };
  }, [sessions]);

  // Calculate academic stats per student
  const studentClosingList = useMemo(() => {
    return students.map((st) => {
      const csId = st.id || st.cs_id;
      const name = getStudentName ? getStudentName(st) : (st.profiles?.full_name || st.student_name || "Sin nombre");
      const dni = st.dni || "—";

      // 1. Calculate for Cuatrimestre 1
      let c1ScoreSum = 0;
      let c1MaxSum = 0;
      let c1PresentCount = 0;

      sessionsC1.forEach((s) => {
        // Attendance
        const att = attLookup[`${s.id}_${csId}`];
        const isPresent = att ? (att.is_present !== false && att.status !== "absent") : true;
        if (isPresent) c1PresentCount++;

        // Grades
        const sessionCrits = criteria.filter((c) => c.session_id === s.id);
        sessionCrits.forEach((c) => {
          const g = gradeLookup[`${csId}_${c.id}`];
          if (g && g.score !== null && g.score !== undefined && g.score !== "") {
            const num = parseFloat(g.score);
            if (!isNaN(num)) {
              c1ScoreSum += num;
              c1MaxSum += Number(c.max_score || 10);
            }
          }
        });
      });

      const avg1 = c1MaxSum > 0 ? (c1ScoreSum / c1MaxSum) * 10 : null;
      const att1Pct = sessionsC1.length > 0 ? Math.round((c1PresentCount / sessionsC1.length) * 100) : 100;

      // 2. Calculate for Cuatrimestre 2
      let c2ScoreSum = 0;
      let c2MaxSum = 0;
      let c2PresentCount = 0;

      sessionsC2.forEach((s) => {
        // Attendance
        const att = attLookup[`${s.id}_${csId}`];
        const isPresent = att ? (att.is_present !== false && att.status !== "absent") : true;
        if (isPresent) c2PresentCount++;

        // Grades
        const sessionCrits = criteria.filter((c) => c.session_id === s.id);
        sessionCrits.forEach((c) => {
          const g = gradeLookup[`${csId}_${c.id}`];
          if (g && g.score !== null && g.score !== undefined && g.score !== "") {
            const num = parseFloat(g.score);
            if (!isNaN(num)) {
              c2ScoreSum += num;
              c2MaxSum += Number(c.max_score || 10);
            }
          }
        });
      });

      const avg2 = c2MaxSum > 0 ? (c2ScoreSum / c2MaxSum) * 10 : null;
      const att2Pct = sessionsC2.length > 0 ? Math.round((c2PresentCount / sessionsC2.length) * 100) : 100;

      // 3. Overall Annual Synthesis
      let finalAvg = null;
      if (avg1 !== null && avg2 !== null) {
        finalAvg = Number(((avg1 + avg2) / 2).toFixed(2));
      } else if (avg1 !== null) {
        finalAvg = Number(avg1.toFixed(2));
      } else if (avg2 !== null) {
        finalAvg = Number(avg2.toFixed(2));
      }

      const totalSessionsCount = sessions.length;
      const totalPresentCount = c1PresentCount + c2PresentCount;
      const finalAttPct = totalSessionsCount > 0 ? Math.round((totalPresentCount / totalSessionsCount) * 100) : 100;

      const statusObj = calculateAcademicStatus(finalAvg ?? 0, finalAttPct);

      return {
        student: st,
        csId,
        name,
        dni,
        avg1,
        att1Pct,
        sessionsC1Count: sessionsC1.length,
        avg2,
        att2Pct,
        sessionsC2Count: sessionsC2.length,
        finalAvg,
        finalAttPct,
        statusObj,
        status: statusObj.status,
      };
    });
  }, [students, sessions, criteria, grades, sessionsC1, sessionsC2, attLookup, gradeLookup, getStudentName]);

  // Filtered students according to search, status and cuatrimestre view
  const filteredStudents = useMemo(() => {
    return studentClosingList.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dni.includes(searchTerm);

      let matchesStatus = true;
      if (statusFilter !== "all") {
        matchesStatus = item.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [studentClosingList, searchTerm, statusFilter]);

  // Overall Cohort Metrics
  const summaryMetrics = useMemo(() => {
    const total = studentClosingList.length;
    if (total === 0) return { avgGrade: 0, avgAtt: 0, promoCount: 0, regulCount: 0, recupCount: 0 };

    let gradeSum = 0;
    let gradeCount = 0;
    let attSum = 0;
    let promoCount = 0;
    let regulCount = 0;
    let recupCount = 0;

    studentClosingList.forEach((st) => {
      if (st.finalAvg !== null) {
        gradeSum += st.finalAvg;
        gradeCount++;
      }
      attSum += st.finalAttPct;

      if (st.status === "promocionado") promoCount++;
      else if (st.status === "aprobado") regulCount++;
      else recupCount++;
    });

    return {
      avgGrade: gradeCount > 0 ? (gradeSum / gradeCount).toFixed(1) : "—",
      avgAtt: Math.round(attSum / total),
      promoCount,
      promoPct: Math.round((promoCount / total) * 100),
      regulCount,
      regulPct: Math.round((regulCount / total) * 100),
      recupCount,
      recupPct: Math.round((recupCount / total) * 100),
    };
  }, [studentClosingList]);

  const handleExportCSV = () => {
    exportAcademicClosingToCSV(classData?.name, filteredStudents);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-['Outfit'] font-black text-slate-900 tracking-tight flex items-center gap-2">
              Sábana Académica y Cierre de Notas
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                Oficial Notyx
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Cálculo automático de promedios cuatrimestrales, porcentaje de asistencia y dictamen final de aprobación.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="rounded-2xl h-11 px-4 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir Acta</span>
          </Button>

          <Button
            type="button"
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 px-5 text-xs font-['Outfit'] font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV / Excel</span>
          </Button>
        </div>
      </div>

      {/* Cohort Performance Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Promedio General */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Promedio General
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-['Outfit'] font-black text-slate-900 tracking-tight">
              {summaryMetrics.avgGrade}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 10</span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Asistencia promedio: <strong className="text-slate-800">{summaryMetrics.avgAtt}%</strong>
          </p>
        </div>

        {/* Card 2: Promocionados */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-200/70 shadow-xs relative overflow-hidden bg-gradient-to-br from-emerald-50/20 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
              Promocionados
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-['Outfit'] font-black text-emerald-900 tracking-tight">
              {summaryMetrics.promoCount}
            </span>
            <span className="text-xs font-black text-emerald-700">({summaryMetrics.promoPct}%)</span>
          </div>
          <p className="text-[11px] font-medium text-emerald-600 mt-1">
            Promedio ≥ 7.0 y Asist. ≥ 75%
          </p>
        </div>

        {/* Card 3: Regulares */}
        <div className="bg-white p-5 rounded-3xl border border-amber-200/70 shadow-xs relative overflow-hidden bg-gradient-to-br from-amber-50/20 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
              Regulares / Aprobados
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-['Outfit'] font-black text-amber-900 tracking-tight">
              {summaryMetrics.regulCount}
            </span>
            <span className="text-xs font-black text-amber-700">({summaryMetrics.regulPct}%)</span>
          </div>
          <p className="text-[11px] font-medium text-amber-600 mt-1">
            Promedio 4.0 - 6.9 y Asist. ≥ 60%
          </p>
        </div>

        {/* Card 4: Recuperatorio */}
        <div className="bg-white p-5 rounded-3xl border border-rose-200/70 shadow-xs relative overflow-hidden bg-gradient-to-br from-rose-50/20 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">
              Recuperatorio
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100/70 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-['Outfit'] font-black text-rose-900 tracking-tight">
              {summaryMetrics.recupCount}
            </span>
            <span className="text-xs font-black text-rose-700">({summaryMetrics.recupPct}%)</span>
          </div>
          <p className="text-[11px] font-medium text-rose-600 mt-1">
            Promedio &lt; 4.0 o baja asistencia
          </p>
        </div>
      </div>

      {/* Toolbar: Filters & Scope */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs print:hidden">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por alumno o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
            Estado:
          </span>
          {[
            { key: "all", label: "Todos" },
            { key: "promocionado", label: "Promocionados (🟢)" },
            { key: "aprobado", label: "Regulares (🟡)" },
            { key: "recuperatorio", label: "Recuperatorio (🔴)" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === f.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Closing Spreadsheet Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <p className="text-xs font-bold text-slate-400">Calculando promedios y cierres de la clase...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">No se encontraron alumnos con los filtros seleccionados.</p>
            <p className="text-xs text-slate-400">Intenta cambiar el término de búsqueda o el filtro de estado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-700">
                  <th className="py-4 px-5 font-bold uppercase tracking-wider text-[10px]">Estudiante</th>
                  <th className="py-4 px-4 font-bold uppercase tracking-wider text-[10px] text-center border-l border-slate-100">
                    1º Cuatrimestre
                  </th>
                  <th className="py-4 px-4 font-bold uppercase tracking-wider text-[10px] text-center border-l border-slate-100">
                    2º Cuatrimestre
                  </th>
                  <th className="py-4 px-4 font-bold uppercase tracking-wider text-[10px] text-center border-l border-slate-100 bg-indigo-50/40 text-indigo-900">
                    Promedio Anual
                  </th>
                  <th className="py-4 px-4 font-bold uppercase tracking-wider text-[10px] text-center border-l border-slate-100">
                    Asist. Anual
                  </th>
                  <th className="py-4 px-4 font-bold uppercase tracking-wider text-[10px] text-center border-l border-slate-100">
                    Condición Final
                  </th>
                  <th className="py-4 px-5 font-bold uppercase tracking-wider text-[10px] text-right border-l border-slate-100 print:hidden">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((item) => {
                  const status = item.statusObj;
                  return (
                    <tr
                      key={item.csId}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedStudentDetail(item)}
                    >
                      {/* Student info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-['Outfit'] font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {item.name[0]}
                          </div>
                          <div>
                            <p className="font-['Outfit'] font-black text-sm text-slate-900 leading-tight">
                              {item.name}
                            </p>
                            <span className="text-[11px] font-bold text-slate-400">
                              DNI: {item.dni}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 1º Cuatrimestre */}
                      <td className="py-4 px-4 text-center border-l border-slate-100">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-['Outfit'] font-black text-sm px-2.5 py-0.5 rounded-lg ${
                            item.avg1 !== null
                              ? item.avg1 >= 7
                                ? "bg-emerald-50 text-emerald-800"
                                : item.avg1 >= 4
                                ? "bg-amber-50 text-amber-800"
                                : "bg-rose-50 text-rose-800"
                              : "text-slate-400"
                          }`}>
                            {item.avg1 !== null ? item.avg1.toFixed(1) : "—"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {item.att1Pct}% asist. ({item.sessionsC1Count} cl.)
                          </span>
                        </div>
                      </td>

                      {/* 2º Cuatrimestre */}
                      <td className="py-4 px-4 text-center border-l border-slate-100">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-['Outfit'] font-black text-sm px-2.5 py-0.5 rounded-lg ${
                            item.avg2 !== null
                              ? item.avg2 >= 7
                                ? "bg-emerald-50 text-emerald-800"
                                : item.avg2 >= 4
                                ? "bg-amber-50 text-amber-800"
                                : "bg-rose-50 text-rose-800"
                              : "text-slate-400"
                          }`}>
                            {item.avg2 !== null ? item.avg2.toFixed(1) : "—"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {item.att2Pct}% asist. ({item.sessionsC2Count} cl.)
                          </span>
                        </div>
                      </td>

                      {/* Promedio Anual */}
                      <td className="py-4 px-4 text-center border-l border-slate-100 bg-indigo-50/20">
                        <div className="inline-flex items-center justify-center">
                          <span className="text-base font-['Outfit'] font-black text-indigo-900 bg-white px-3 py-1 rounded-xl border border-indigo-200/80 shadow-2xs">
                            {item.finalAvg !== null ? item.finalAvg.toFixed(1) : "—"}
                          </span>
                        </div>
                      </td>

                      {/* Asistencia Anual */}
                      <td className="py-4 px-4 text-center border-l border-slate-100">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-black ${
                            item.finalAttPct >= 75
                              ? "text-emerald-700"
                              : item.finalAttPct >= 60
                              ? "text-amber-700"
                              : "text-rose-700"
                          }`}>
                            {item.finalAttPct}%
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.finalAttPct >= 75
                                  ? "bg-emerald-500"
                                  : item.finalAttPct >= 60
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${item.finalAttPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Condición Final Badge */}
                      <td className="py-4 px-4 text-center border-l border-slate-100">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-xl border ${status.colorClass} shadow-2xs`}
                        >
                          <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                          {status.label}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-5 text-right border-l border-slate-100 print:hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentDetail(item)}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                            title="Ver desglose detallado de notas"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveReportStudent(item.student)}
                            className="text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200/80 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Abrir informe pedagógico y devolución"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                            <span className="hidden sm:inline">Boletín</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Student Breakdown Drawer/Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-['Outfit'] font-black text-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  {selectedStudentDetail.name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-['Outfit'] font-black text-slate-900">
                    {selectedStudentDetail.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-500">
                      DNI: {selectedStudentDetail.dni}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${selectedStudentDetail.statusObj.colorClass}`}>
                      {selectedStudentDetail.statusObj.label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  1º Cuatrimestre
                </span>
                <span className="text-lg font-['Outfit'] font-black text-slate-900">
                  {selectedStudentDetail.avg1 !== null ? selectedStudentDetail.avg1.toFixed(1) : "—"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {selectedStudentDetail.att1Pct}% asistencia
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  2º Cuatrimestre
                </span>
                <span className="text-lg font-['Outfit'] font-black text-slate-900">
                  {selectedStudentDetail.avg2 !== null ? selectedStudentDetail.avg2.toFixed(1) : "—"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {selectedStudentDetail.att2Pct}% asistencia
                </span>
              </div>
              <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">
                  Promedio Anual
                </span>
                <span className="text-lg font-['Outfit'] font-black text-indigo-900">
                  {selectedStudentDetail.finalAvg !== null ? selectedStudentDetail.finalAvg.toFixed(1) : "—"}
                </span>
                <span className="text-[10px] text-indigo-600 block">
                  {selectedStudentDetail.finalAttPct}% asist. total
                </span>
              </div>
            </div>

            {/* Qualitative Feedback Generator Preview */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-violet-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  Devolución Pedagógica Sintetizada
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const feedback = generatePedagogicalFeedback({
                      studentName: selectedStudentDetail.name,
                      criteriaScores: criteria.map(c => ({
                        ...c,
                        score: gradeLookup[`${selectedStudentDetail.csId}_${c.id}`]?.score ?? null
                      })),
                      attendanceRate: selectedStudentDetail.finalAttPct,
                      className: classData?.name || "la materia"
                    });
                    alert(feedback);
                  }}
                  className="text-[11px] font-bold text-violet-700 hover:text-violet-900 underline cursor-pointer"
                >
                  Ver texto completo
                </button>
              </div>
              <p className="text-xs text-slate-700 italic leading-relaxed">
                "{generatePedagogicalFeedback({
                  studentName: selectedStudentDetail.name,
                  criteriaScores: criteria.map(c => ({
                    ...c,
                    score: gradeLookup[`${selectedStudentDetail.csId}_${c.id}`]?.score ?? null
                  })),
                  attendanceRate: selectedStudentDetail.finalAttPct,
                  className: classData?.name || "la materia"
                })}"
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedStudentDetail(null)}
                className="rounded-xl h-10 px-4 text-xs font-bold text-slate-500"
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setActiveReportStudent(selectedStudentDetail.student);
                  setSelectedStudentDetail(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <FileText className="w-4 h-4" />
                <span>Abrir Boletín e Informe</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full Student Report Modal Integration */}
      {activeReportStudent && (
        <StudentReportModal
          student={activeReportStudent}
          className={classData?.name || "Clase"}
          criteria={criteria}
          grades={(() => {
            const csId = activeReportStudent.id || activeReportStudent.cs_id;
            const res = {};
            criteria.forEach(c => {
              const g = gradeLookup[`${csId}_${c.id}`];
              if (g) res[`${csId}_${c.id}`] = g.score;
            });
            return res;
          })()}
          attendance={(() => {
            const csId = activeReportStudent.id || activeReportStudent.cs_id;
            const res = {};
            allAttendance.forEach(a => {
              if (a.class_student_id === csId) {
                res[csId] = a;
              }
            });
            return res;
          })()}
          onClose={() => setActiveReportStudent(null)}
        />
      )}
    </div>
  );
}
