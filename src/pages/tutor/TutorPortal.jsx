import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  GraduationCap,
  Search,
  CheckCircle2,
  Award,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Printer,
  Clock,
  XCircle,
  FileText,
  BookOpen,
  RefreshCw,
  X,
  Sparkles,
  TrendingUp,
  MessageSquareQuote
} from "lucide-react";
import { Button } from "../../components/ui/button";

export default function TutorPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryDni, setQueryDni] = useState(searchParams.get("dni") || searchParams.get("token") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState("grades"); // "grades" | "attendance"
  const [filterCuatrimestre, setFilterCuatrimestre] = useState(0); // 0 = todos, 1, 2
  const [filterAttStatus, setFilterAttStatus] = useState("all"); // "all", "present", "absent"

  // Auto-search if DNI or token is present in URL
  useEffect(() => {
    const initialTerm = searchParams.get("dni") || searchParams.get("token");
    if (initialTerm && !reportData && !loading) {
      executeSearch(initialTerm);
    }
  }, []);

  const executeSearch = async (termToSearch) => {
    const cleanTerm = (termToSearch || "").trim();
    if (!cleanTerm) return;

    setLoading(true);
    setError("");

    try {
      // Call Postgres RPC with SECURITY DEFINER to bypass RLS for public tutor queries
      const { data, error: rpcError } = await supabase.rpc("get_student_report_for_tutor", {
        p_search_term: cleanTerm
      });

      if (rpcError) {
        console.error("Error al consultar RPC get_student_report_for_tutor:", rpcError);
        throw rpcError;
      }

      if (!data || data.error === "NOT_FOUND") {
        setError(
          "No se encontró ningún estudiante registrado con ese DNI o Código. Verifique que los números ingresados sean correctos o consulte con la institución escolar."
        );
        setReportData(null);
        return;
      }

      if (data.error) {
        setError(data.error);
        setReportData(null);
        return;
      }

      setReportData(data);
      // Update URL query param quietly without reload
      setSearchParams({ dni: cleanTerm }, { replace: true });
    } catch (err) {
      console.error("Error en TutorPortal:", err);
      setError("Ocurrió un error inesperado al consultar el boletín. Por favor intente nuevamente en unos instantes.");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    executeSearch(queryDni);
  };

  const handleReset = () => {
    setQueryDni("");
    setReportData(null);
    setError("");
    setSearchParams({}, { replace: true });
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered lists
  const filteredGrades = (reportData?.grades || []).filter((g) => {
    if (filterCuatrimestre === 0) return true;
    return Number(g.cuatrimestre) === filterCuatrimestre;
  });

  const filteredAttendance = (reportData?.attendance || []).filter((a) => {
    if (filterAttStatus === "present") return a.is_present || a.status === "present";
    if (filterAttStatus === "absent") return !a.is_present && a.status !== "present";
    return true;
  });

  const getAverageStatus = (avg) => {
    if (avg >= 85) return { label: "Sobresaliente", color: "text-emerald-700 bg-emerald-100 border-emerald-300" };
    if (avg >= 70) return { label: "Muy Bueno", color: "text-blue-700 bg-blue-100 border-blue-300" };
    if (avg >= 60) return { label: "Aprobado", color: "text-amber-700 bg-amber-100 border-amber-300" };
    return { label: "En Proceso", color: "text-rose-700 bg-rose-100 border-rose-300" };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center p-4 sm:p-8 selection:bg-blue-500 selection:text-white">
      {/* Print Styles for official school report card */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            break-inside: avoid;
          }
          .print-only {
            display: block !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header */}
      <header className="w-full max-w-5xl flex items-center justify-between py-6 border-b border-slate-200/80 mb-8 no-print">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-['Outfit'] font-black text-xl tracking-tight flex items-center gap-1.5 text-slate-900">
              NOTYX EDU
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                Familias
              </span>
            </h1>
            <p className="font-['DM_Sans'] font-semibold text-xs text-slate-500">
              Consulta de Boletines, Desempeño y Asistencia
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Acceso Seguro</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-5xl space-y-8">
        {/* Search Box Card */}
        <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-xl shadow-slate-900/5 no-print">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Portal de Consulta Parental
            </div>
            <h2 className="font-['Outfit'] font-black text-2xl sm:text-4xl text-slate-900 tracking-tight">
              Boletín Escolar y Asistencia
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
              Ingresá el número de <strong>DNI del estudiante</strong> (con o sin puntos) para consultar sus calificaciones
              del 1º y 2º cuatrimestre, observaciones de clase y registro de asistencia.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 pt-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ej: 52283711 o 52.283.711..."
                  value={queryDni}
                  onChange={(e) => setQueryDni(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-10 text-base font-bold text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                />
                {queryDni && (
                  <button
                    type="button"
                    onClick={() => setQueryDni("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                disabled={loading || !queryDni.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl h-13 px-8 font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all active:scale-98"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Buscando...
                  </span>
                ) : (
                  "Consultar"
                )}
              </Button>
            </form>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-sm font-semibold text-left mt-4 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">No pudimos encontrar los datos</p>
                  <p className="text-rose-700/90 text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results / Report View */}
        {reportData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Student Official Header Card */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white rounded-[32px] p-6 sm:p-8 shadow-xl shadow-blue-500/15 flex flex-col md:flex-row md:items-center justify-between gap-6 print-card">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-200 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    Estudiante Regular
                  </span>
                  {reportData.classes?.[0]?.house && (
                    <span className="text-xs font-black uppercase tracking-wider text-amber-200 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/30 flex items-center gap-1.5">
                      <span>{reportData.classes[0].house.icon}</span>
                      <span>Casa {reportData.classes[0].house.name}</span>
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-['Outfit'] font-black text-3xl sm:text-4xl tracking-tight text-white">
                    {reportData.student.full_name}
                  </h3>
                  <p className="text-blue-100/90 font-bold text-sm sm:text-base mt-1 flex items-center gap-2">
                    <span>DNI: {reportData.student.dni}</span>
                    <span>•</span>
                    <span>Ciclo Lectivo Oficial</span>
                  </p>
                </div>

                {/* Enrolled Classes list */}
                {reportData.classes && reportData.classes.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {reportData.classes.map((cls, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-semibold text-blue-100 border border-white/15"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-200" />
                        <span>{cls.class_name}</span>
                        {cls.teacher_name && (
                          <span className="text-blue-300 font-normal">({cls.teacher_name})</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action and Overall Average Badge */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0">
                <div className="bg-white/15 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-center min-w-[160px]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">
                    Promedio General
                  </span>
                  <div className="font-['Outfit'] font-black text-4xl mt-1 flex items-baseline justify-center gap-1">
                    <span>{reportData.overallAvg}</span>
                    <span className="text-xl text-blue-200 font-bold">%</span>
                  </div>
                  <span
                    className={`inline-block text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mt-2 ${
                      getAverageStatus(reportData.overallAvg).color
                    }`}
                  >
                    {getAverageStatus(reportData.overallAvg).label}
                  </span>
                </div>

                <div className="flex items-center gap-2 no-print">
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Imprimir Boletín
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="ghost"
                    className="text-blue-100 hover:text-white hover:bg-white/10 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    Nueva Búsqueda
                  </Button>
                </div>
              </div>
            </div>

            {/* Academic KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1º Cuatrimestre */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm print-card">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-black uppercase tracking-widest">1º Cuatrimestre</span>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div className="font-['Outfit'] font-black text-3xl text-blue-600 mt-1">
                  {reportData.c1Avg > 0 ? `${reportData.c1Avg}%` : "—"}
                </div>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  {reportData.c1Avg >= 60 ? "Trayectoria aprobada" : "En proceso de compensación"}
                </p>
              </div>

              {/* 2º Cuatrimestre */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm print-card">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-black uppercase tracking-widest">2º Cuatrimestre</span>
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                </div>
                <div className="font-['Outfit'] font-black text-3xl text-purple-600 mt-1">
                  {reportData.c2Avg > 0 ? `${reportData.c2Avg}%` : "—"}
                </div>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  {reportData.c2Avg > 0
                    ? reportData.c2Avg >= 60
                      ? "Trayectoria aprobada"
                      : "En proceso de compensación"
                    : "En desarrollo actual"}
                </p>
              </div>

              {/* Asistencia General */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm print-card">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-black uppercase tracking-widest">Asistencia General</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="font-['Outfit'] font-black text-3xl text-emerald-600 mt-1">
                  {reportData.attendancePct}%
                </div>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  {reportData.attendanceStats?.present || 0} de {reportData.attendanceStats?.total || 0} clases registradas
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("grades")}
                  className={`px-5 py-2.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${
                    activeTab === "grades"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Calificaciones ({reportData.grades?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("attendance")}
                  className={`px-5 py-2.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${
                    activeTab === "attendance"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Asistencia ({reportData.attendance?.length || 0})</span>
                </button>
              </div>

              {/* Subfilters */}
              {activeTab === "grades" && (
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setFilterCuatrimestre(0)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterCuatrimestre === 0 ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterCuatrimestre(1)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterCuatrimestre === 1 ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    1º Cuatrimestre
                  </button>
                  <button
                    onClick={() => setFilterCuatrimestre(2)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterCuatrimestre === 2 ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    2º Cuatrimestre
                  </button>
                </div>
              )}

              {activeTab === "attendance" && (
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setFilterAttStatus("all")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterAttStatus === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setFilterAttStatus("present")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterAttStatus === "present" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Presentes
                  </button>
                  <button
                    onClick={() => setFilterAttStatus("absent")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterAttStatus === "absent" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Inasistencias
                  </button>
                </div>
              )}
            </div>

            {/* TAB CONTENT: GRADES */}
            {activeTab === "grades" && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm print-card">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-['Outfit'] font-black text-xl text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" /> Detalle de Evaluaciones y Trabajos Prácticos
                  </h4>
                  <span className="text-xs font-bold text-slate-400">
                    {filteredGrades.length} registro(s) encontrado(s)
                  </span>
                </div>

                {filteredGrades.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-slate-500 font-bold">No hay evaluaciones registradas para este período.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredGrades.map((g, idx) => {
                      const pct = g.max_score > 0 ? (Number(g.score) / Number(g.max_score)) * 100 : 0;
                      return (
                        <div
                          key={g.grade_id || idx}
                          className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors rounded-2xl px-2 -mx-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-['Outfit'] font-black text-base text-slate-900">
                                {g.criteria_name || "Evaluación"}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {g.cuatrimestre}º Cuatrimestre
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                              <span>{g.class_name}</span>
                              <span>•</span>
                              <span>
                                {g.session_date
                                  ? format(new Date(g.session_date + "T12:00:00"), "d 'de' MMMM, yyyy", { locale: es })
                                  : "Fecha sin asignar"}
                              </span>
                            </p>

                            {/* Optional teacher comment */}
                            {g.comment && (
                              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50/70 border border-blue-200/50 text-blue-800 text-xs font-medium">
                                <MessageSquareQuote className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>Observación: {g.comment}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-400 block">Puntaje</span>
                              <span className="text-[11px] font-medium text-slate-500">sobre {g.max_score}</span>
                            </div>

                            <span
                              className={`min-w-[56px] h-12 px-3 rounded-2xl flex items-center justify-center font-['Outfit'] font-black text-lg border-2 shadow-sm ${
                                pct >= 70
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : pct >= 40
                                  ? "bg-amber-50 text-amber-800 border-amber-300"
                                  : "bg-rose-50 text-rose-800 border-rose-300"
                              }`}
                            >
                              {g.score}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: ATTENDANCE */}
            {activeTab === "attendance" && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm print-card">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-['Outfit'] font-black text-xl text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" /> Registro Diario de Asistencia y Observaciones
                  </h4>
                  <span className="text-xs font-bold text-slate-400">
                    {filteredAttendance.length} clase(s) registrada(s)
                  </span>
                </div>

                {filteredAttendance.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-slate-500 font-bold">No hay registros de asistencia en esta categoría.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredAttendance.map((att, idx) => {
                      const isPresent = att.is_present || att.status === "present";
                      const isLate = att.status === "late";
                      const isJustified = att.status === "justified";

                      return (
                        <div
                          key={att.session_id || idx}
                          className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors rounded-2xl px-2 -mx-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-['Outfit'] font-bold text-base text-slate-900">
                                {att.session_date
                                  ? format(new Date(att.session_date + "T12:00:00"), "EEEE d 'de' MMMM, yyyy", { locale: es })
                                  : "Fecha no registrada"}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {att.cuatrimestre}º Cuatrimestre
                              </span>
                            </div>

                            <p className="text-xs font-medium text-slate-500">{att.class_name}</p>

                            {/* Observation note from teacher */}
                            {att.observation && (
                              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                                <MessageSquareQuote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Observación del día: {att.observation}</span>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 self-end sm:self-center">
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-wider">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Presente
                              </span>
                            ) : isLate ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black uppercase tracking-wider">
                                <Clock className="w-4 h-4 text-amber-600" /> Llegada Tarde
                              </span>
                            ) : isJustified ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black uppercase tracking-wider">
                                <ShieldCheck className="w-4 h-4 text-blue-600" /> Justificado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black uppercase tracking-wider">
                                <XCircle className="w-4 h-4 text-rose-600" /> Ausente
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
