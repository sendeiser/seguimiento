import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarPlus,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Search,
  Download,
  Filter,
} from "lucide-react";
import { Button } from "../../ui/button";
import { exportAttendanceMatrixToCSV } from "../../../lib/reportExporter";

export default function ClassAttendanceTab({
  classData,
  sessions,
  students,
  allAttendance,
  cuatrimestreFilter,
  getStudentName,
  onOpenQuickAttendance,
}) {
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceRiskFilter, setAttendanceRiskFilter] = useState("all"); // "all" | "risk"
  const [attendanceSessionFilter, setAttendanceSessionFilter] = useState("all"); // "all" | session.id

  // 1. Filter sessions by cuatrimestre
  const cuatrimestreSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        if (cuatrimestreFilter === "all") return true;
        const sCuatri = s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1);
        return sCuatri === Number(cuatrimestreFilter);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions, cuatrimestreFilter]);

  // 2. Specific session filter
  const relevantSessions = useMemo(() => {
    return attendanceSessionFilter === "all"
      ? cuatrimestreSessions
      : cuatrimestreSessions.filter((s) => s.id === attendanceSessionFilter);
  }, [cuatrimestreSessions, attendanceSessionFilter]);

  // 3. Fast lookup map: `${session_id}_${class_student_id}` -> attendance record
  const attMap = useMemo(() => {
    const map = {};
    allAttendance.forEach((a) => {
      map[`${a.session_id}_${a.class_student_id}`] = a;
    });
    return map;
  }, [allAttendance]);

  // 4. Compute statistics per student
  const studentStats = useMemo(() => {
    return students.map((st) => {
      let pCount = 0;
      let tCount = 0;
      let jCount = 0;
      let aCount = 0;
      let obsCount = 0;

      relevantSessions.forEach((s) => {
        const rec = attMap[`${s.id}_${st.id}`];
        let stStatus = "present";
        if (rec) {
          if (rec.is_present === false) {
            stStatus = rec.status === "justified" ? "justified" : "absent";
          } else {
            stStatus = rec.status || "present";
          }
          if (rec.observation) obsCount++;
        }
        if (stStatus === "present") pCount++;
        else if (stStatus === "late") tCount++;
        else if (stStatus === "justified") jCount++;
        else if (stStatus === "absent") aCount++;
      });

      const totalS = relevantSessions.length;
      const attended = pCount + tCount;
      const percentage = totalS > 0 ? Math.round((attended / totalS) * 100) : 100;
      const isAtRisk = totalS >= 2 && percentage < 75;

      return {
        student: st,
        pCount,
        tCount,
        jCount,
        aCount,
        obsCount,
        percentage,
        isAtRisk,
        attended,
      };
    });
  }, [students, relevantSessions, attMap]);

  // 5. Global metrics
  const { totalSessionsCount, totalStudentsCount, atRiskCount, perfectAttendanceCount, totalClassPercentage } =
    useMemo(() => {
      const totalS = relevantSessions.length;
      const totalSt = students.length;
      const atRisk = studentStats.filter((s) => s.isAtRisk).length;
      const perfect = studentStats.filter((s) => s.percentage === 100 && totalS > 0).length;
      const totalClassPct =
        totalSt > 0
          ? Math.round(studentStats.reduce((sum, s) => sum + s.percentage, 0) / totalSt)
          : 100;

      return {
        totalSessionsCount: totalS,
        totalStudentsCount: totalSt,
        atRiskCount: atRisk,
        perfectAttendanceCount: perfect,
        totalClassPercentage: totalClassPct,
      };
    }, [relevantSessions.length, students.length, studentStats]);

  // 6. Filter student list by risk & search
  const displayList = useMemo(() => {
    return studentStats.filter((item) => {
      const nameMatch =
        getStudentName(item.student).toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        (item.student.dni && item.student.dni.includes(attendanceSearch));
      if (!nameMatch) return false;
      if (attendanceRiskFilter === "risk") return item.isAtRisk;
      return true;
    });
  }, [studentStats, attendanceSearch, attendanceRiskFilter, getStudentName]);

  return (
    <div className="space-y-8 animate-in slide-up">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Asistencia Global */}
        <div className="p-6 rounded-[28px] bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asistencia Global</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-['Outfit'] font-black text-3xl text-slate-900 tracking-tight">{totalClassPercentage}%</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Promedio de la materia</p>
          </div>
        </div>

        {/* Total Clases Dictadas */}
        <div className="p-6 rounded-[28px] bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clases Dictadas</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <CalendarPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-['Outfit'] font-black text-3xl text-slate-900 tracking-tight">{totalSessionsCount}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {cuatrimestreFilter === "all" ? "Año completo" : `${cuatrimestreFilter}º Cuatrimestre`}
            </p>
          </div>
        </div>

        {/* Alumnos en Riesgo */}
        <div
          className={`p-6 rounded-[28px] border shadow-sm relative overflow-hidden transition-all ${
            atRiskCount > 0 ? "bg-rose-50/70 border-rose-200" : "bg-white border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest ${atRiskCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
              Alumnos en Riesgo
            </span>
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                atRiskCount > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-50 text-slate-400"
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`font-['Outfit'] font-black text-3xl tracking-tight ${atRiskCount > 0 ? "text-rose-700" : "text-slate-900"}`}>
              {atRiskCount}
            </span>
            <p className={`text-xs font-medium mt-1 ${atRiskCount > 0 ? "text-rose-600 font-bold" : "text-slate-500"}`}>
              {atRiskCount > 0 ? "Menor al 75% de asistencia" : "Sin casos críticos"}
            </p>
          </div>
        </div>

        {/* Asistencia Perfecta */}
        <div className="p-6 rounded-[28px] bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asistencia Perfecta</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-['Outfit'] font-black text-3xl text-slate-900 tracking-tight">{perfectAttendanceCount}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">100% de presencia</p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 bg-white p-4 sm:p-5 rounded-[28px] border border-slate-100 shadow-sm">
        {/* Row 1: Search + Risk Filter + Export */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar alumno o DNI..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setAttendanceRiskFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  attendanceRiskFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Todos ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setAttendanceRiskFilter("risk")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                  attendanceRiskFilter === "risk" ? "bg-rose-600 text-white shadow-xs" : "text-slate-500 hover:text-rose-600"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" /> En Riesgo ({atRiskCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              onClick={() =>
                exportAttendanceMatrixToCSV(
                  classData?.name || "Clase",
                  relevantSessions,
                  students,
                  allAttendance,
                  cuatrimestreFilter
                )
              }
              className="rounded-2xl h-11 px-5 font-black text-xs uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Exportar (CSV)
            </Button>
          </div>
        </div>

        {/* Row 2: Session date filter */}
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtrar por clase:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setAttendanceSessionFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 border ${
                  attendanceSessionFilter === "all"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Todas ({cuatrimestreSessions.length})
              </button>
              {cuatrimestreSessions.map((s) => {
                const dObj = new Date(s.date + "T12:00:00");
                const isActive = attendanceSessionFilter === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setAttendanceSessionFilter(isActive ? "all" : s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 border ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                    title={format(dObj, "EEEE d 'de' MMMM", { locale: es })}
                  >
                    {format(dObj, "EEE d/M", { locale: es })}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Matrix Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
        {relevantSessions.length === 0 ? (
          <div className="p-16 text-center">
            <CalendarPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-['Outfit'] font-black text-slate-800 text-lg">No hay sesiones creadas en este periodo</p>
            <p className="text-slate-400 text-xs font-medium mt-1">
              Creá una nueva sesión para comenzar el seguimiento de asistencia
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80">
                  <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-500 sticky left-0 bg-slate-50 z-20 w-64 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                    Estudiante
                  </th>
                  {relevantSessions.map((s) => {
                    const dateObj = new Date(s.date + "T12:00:00");
                    const sAtt = allAttendance.filter((a) => a.session_id === s.id);
                    const sPresent = sAtt.filter((a) => {
                      if (a.is_present === false) return false;
                      return (a.status || "present") !== "absent" && (a.status || "present") !== "justified";
                    }).length;
                    return (
                      <th key={s.id} className="px-2 py-3 text-center border-l border-slate-200/60 min-w-[80px]">
                        <Link
                          to={`/session/${s.id}`}
                          className="group block hover:text-blue-600 transition-colors"
                          title={format(dateObj, "EEEE d 'de' MMMM yyyy", { locale: es })}
                        >
                          <span className="block font-['Outfit'] font-black text-xs text-slate-900 group-hover:text-blue-600 capitalize">
                            {format(dateObj, "EEE", { locale: es })}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                            {format(dateObj, "d/M", { locale: es })}
                          </span>
                          {sAtt.length > 0 && (
                            <span
                              className={`text-[9px] font-black block mt-0.5 ${
                                students.length > 0 && sPresent / students.length >= 0.75
                                  ? "text-emerald-600"
                                  : "text-rose-500"
                              }`}
                            >
                              {sPresent}/{students.length}
                            </span>
                          )}
                        </Link>
                      </th>
                    );
                  })}
                  <th
                    className="px-2 py-4 text-center font-black text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50/50 border-l border-slate-200/80 w-10"
                    title="Presentes"
                  >
                    ✓
                  </th>
                  <th
                    className="px-2 py-4 text-center font-black text-[10px] uppercase tracking-widest text-amber-700 bg-amber-50/50 border-l border-slate-200/80 w-10"
                    title="Tardes"
                  >
                    T
                  </th>
                  <th
                    className="px-2 py-4 text-center font-black text-[10px] uppercase tracking-widest text-purple-700 bg-purple-50/50 border-l border-slate-200/80 w-10"
                    title="Justificadas"
                  >
                    J
                  </th>
                  <th
                    className="px-2 py-4 text-center font-black text-[10px] uppercase tracking-widest text-rose-700 bg-rose-50/50 border-l border-slate-200/80 w-10"
                    title="Ausentes"
                  >
                    ✗
                  </th>
                  <th className="px-4 py-4 text-center font-black text-[10px] uppercase tracking-widest text-slate-700 border-l border-slate-200/80 w-20">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayList.map((item) => {
                  const st = item.student;
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Sticky student name column */}
                      <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50/60 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {getStudentName(st)[0]}
                          </div>
                          <div className="min-w-0">
                            <span className="font-['Outfit'] font-black text-sm text-slate-800 truncate block">
                              {getStudentName(st)}
                            </span>
                            {st.dni && (
                              <span className="text-[10px] font-bold text-slate-400">DNI: {st.dni}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Session status cells */}
                      {relevantSessions.map((s) => {
                        const rec = attMap[`${s.id}_${st.id}`];
                        let status = "present";
                        if (rec) {
                          if (rec.is_present === false) {
                            status = rec.status === "justified" ? "justified" : "absent";
                          } else {
                            status = rec.status || "present";
                          }
                        }
                        const hasObs = Boolean(rec?.observation);

                        const statusMap = {
                          present: {
                            code: "P",
                            full: "Presente",
                            bg: "bg-emerald-500 text-white border-emerald-500",
                          },
                          late: {
                            code: "T",
                            full: "Tarde",
                            bg: "bg-amber-500 text-white border-amber-500",
                          },
                          justified: {
                            code: "J",
                            full: "Justificado",
                            bg: "bg-purple-500 text-white border-purple-500",
                          },
                          absent: {
                            code: "A",
                            full: "Ausente",
                            bg: "bg-rose-500 text-white border-rose-500",
                          },
                        };
                        const statusBadge = statusMap[status] || statusMap.present;
                        const isDefaultPresent = !rec;

                        return (
                          <td key={s.id} className="px-2 py-3 text-center border-l border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                onOpenQuickAttendance({
                                  student: st,
                                  session: s,
                                  currentStatus: status,
                                  observation: rec?.observation || "",
                                });
                              }}
                              title={`${statusBadge.full} · ${format(new Date(s.date + "T12:00:00"), "d MMM yyyy", { locale: es })}${
                                hasObs ? ` · "${rec.observation}"` : ""
                              }`}
                              className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl font-black text-[11px] border-2 transition-all cursor-pointer ${
                                isDefaultPresent
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200 opacity-50 hover:opacity-100"
                                  : statusBadge.bg
                              }`}
                            >
                              {statusBadge.code}
                              {hasObs && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-white" />
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Totals Summary */}
                      <td className="px-3 py-4 text-center font-bold text-xs text-emerald-700 bg-emerald-50/20 border-l border-slate-100">
                        {item.pCount}
                      </td>
                      <td className="px-3 py-4 text-center font-bold text-xs text-amber-700 bg-amber-50/20 border-l border-slate-100">
                        {item.tCount}
                      </td>
                      <td className="px-3 py-4 text-center font-bold text-xs text-purple-700 bg-purple-50/20 border-l border-slate-100">
                        {item.jCount}
                      </td>
                      <td className="px-3 py-4 text-center font-bold text-xs text-rose-700 bg-rose-50/20 border-l border-slate-100">
                        {item.aCount}
                      </td>
                      <td className="px-5 py-4 text-center border-l border-slate-100">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-['Outfit'] font-black inline-block border ${
                            item.percentage >= 75
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {item.percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
