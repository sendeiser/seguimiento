import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GraduationCap, Search, CheckCircle2, Award, ShieldCheck, Heart, Flame, Calendar, Trophy, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button";

export default function TutorPortal() {
  const [queryDni, setQueryDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const cleanTerm = queryDni.trim();
    if (!cleanTerm) return;

    setLoading(true);
    setError("");
    setReportData(null);

    try {
      // 1. Search student enrollment in class_students by DNI or public_token
      const { data: classStudents, error: csError } = await supabase
        .from("class_students")
        .select(`
          id,
          student_id,
          student_name,
          dni,
          public_token,
          class_id,
          classes (
            id, name, teacher_id
          ),
          profiles (
            id, full_name
          )
        `)
        .or(`dni.eq.${cleanTerm},public_token.eq.${cleanTerm}`);

      if (csError) throw csError;

      if (!classStudents || classStudents.length === 0) {
        setError("No se encontró ningún estudiante registrado con ese DNI o Código. Verifique los datos con la institución.");
        setLoading(false);
        return;
      }

      const csIds = classStudents.map(cs => cs.id);
      const mainStudent = classStudents[0];
      const studentName = mainStudent.profiles?.full_name || mainStudent.student_name || "Estudiante";

      // 2. Fetch grades for student
      const { data: grades, error: grError } = await supabase
        .from("grades")
        .select(`
          score,
          criteria_id,
          class_student_id,
          criteria (
            id, name, max_score, session_id
          )
        `)
        .in("class_student_id", csIds);

      if (grError) throw grError;

      // 3. Fetch sessions metadata for criteria
      const criteriaIds = (grades || []).map(g => g.criteria_id).filter(Boolean);
      let sessionMap = {};

      if (criteriaIds.length > 0) {
        const { data: criteriaList } = await supabase
          .from("session_criteria")
          .select("id, session_id, sessions(id, date, cuatrimestre)")
          .in("id", criteriaIds);

        (criteriaList || []).forEach(c => {
          if (c.sessions) sessionMap[c.id] = c.sessions;
        });
      }

      const fullGrades = (grades || []).map(g => ({
        ...g,
        sessions: sessionMap[g.criteria_id] || null
      }));

      // 4. Fetch attendance
      const { data: attendance, error: attError } = await supabase
        .from("attendance")
        .select("is_present, session_id, class_student_id")
        .in("class_student_id", csIds);

      if (attError) throw attError;

      const totalAttendance = attendance || [];
      const presentCount = totalAttendance.filter(a => a.is_present).length;
      const attendancePct = totalAttendance.length > 0 ? Math.round((presentCount / totalAttendance.length) * 100) : 100;

      // Group grades by cuatrimestre
      const c1Grades = fullGrades.filter(g => {
        const cVal = g.sessions?.cuatrimestre || (g.sessions?.date && new Date(g.sessions.date).getMonth() >= 6 ? 2 : 1);
        return cVal === 1;
      });
      const c2Grades = fullGrades.filter(g => {
        const cVal = g.sessions?.cuatrimestre || (g.sessions?.date && new Date(g.sessions.date).getMonth() >= 6 ? 2 : 1);
        return cVal === 2;
      });

      const calcAvg = (grList) => {
        if (grList.length === 0) return 0;
        let sum = 0;
        let max = 0;
        grList.forEach(g => {
          if (g.score != null && g.criteria?.max_score) {
            sum += Number(g.score);
            max += Number(g.criteria.max_score);
          }
        });
        return max > 0 ? Math.round((sum / max) * 100) : 0;
      };

      setReportData({
        student: { full_name: studentName, dni: mainStudent.dni || cleanTerm },
        classes: classStudents,
        grades: fullGrades,
        attendancePct,
        c1Avg: calcAvg(c1Grades),
        c2Avg: calcAvg(c2Grades),
        overallAvg: calcAvg(fullGrades)
      });

    } catch (err) {
      console.error("Error searching tutor portal:", err);
      setError("Ocurrió un error al consultar el boletín. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center p-4 sm:p-8">
      
      {/* Top Brand Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-6 border-b border-slate-200 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-['Outfit'] font-black text-xl tracking-tight">NOTYX EDU</h1>
            <p className="font-['DM_Sans'] font-bold text-xs text-slate-400 uppercase tracking-widest">Portal de Familias y Tutores</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" /> Acceso Seguro
        </div>
      </header>

      <main className="w-full max-w-4xl space-y-8">
        
        {/* DNI Search Form */}
        <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-xl shadow-slate-900/5">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">Consulta de Boletín Escolar</h2>
            <p className="text-slate-500 font-medium text-sm">
              Ingresá el DNI del alumno para consultar sus calificaciones, asistencia y desempeño del 1º y 2º cuatrimestre.
            </p>
            
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Número de DNI del alumno..."
                  value={queryDni}
                  onChange={(e) => setQueryDni(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-base font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-13 px-8 font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/20">
                {loading ? "Buscando..." : "Consultar"}
              </Button>
            </form>

            {error && (
              <div className="flex items-center gap-2 p-4 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-bold text-left mt-4">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Card */}
        {reportData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Student Info Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[32px] p-6 sm:p-8 shadow-xl shadow-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-blue-200 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  Estudiante Registrado
                </span>
                <h3 className="font-['Outfit'] font-black text-3xl mt-3">{reportData.student.full_name}</h3>
                <p className="text-blue-100 font-bold text-sm mt-1">DNI: {reportData.student.dni}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center min-w-[140px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">Promedio Anual</span>
                <span className="font-['Outfit'] font-black text-4xl mt-1 block">{reportData.overallAvg}%</span>
              </div>
            </div>

            {/* Cuatrimestres Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center shadow-sm">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">1º Cuatrimestre</span>
                <span className="font-['Outfit'] font-black text-3xl text-blue-600 mt-2 block">
                  {reportData.c1Avg > 0 ? `${reportData.c1Avg}%` : "—"}
                </span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center shadow-sm">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">2º Cuatrimestre</span>
                <span className="font-['Outfit'] font-black text-3xl text-purple-600 mt-2 block">
                  {reportData.c2Avg > 0 ? `${reportData.c2Avg}%` : "—"}
                </span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center shadow-sm">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">Asistencia General</span>
                <span className="font-['Outfit'] font-black text-3xl text-emerald-600 mt-2 block">
                  {reportData.attendancePct}%
                </span>
              </div>
            </div>

            {/* Detailed Grades List */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
              <h4 className="font-['Outfit'] font-black text-lg text-slate-900 mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" /> Detalle de Evaluaciones por Criterio
              </h4>

              {reportData.grades.length === 0 ? (
                <p className="text-slate-400 font-bold text-center py-8">Aún no hay calificaciones registradas por los docentes.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reportData.grades.map(g => (
                    <div key={g.criteria_id + g.session_id} className="py-4 flex items-center justify-between">
                      <div>
                        <span className="font-['Outfit'] font-extrabold text-base text-slate-900 block">
                          {g.criteria?.name || "Evaluación"}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {g.sessions?.date ? format(new Date(g.sessions.date + "T12:00:00"), "d 'de' MMMM", { locale: es }) : "—"} · {g.sessions?.cuatrimestre || 1}º Cuatrimestre
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400">Máx: {g.criteria?.max_score}</span>
                        <span className={`w-12 h-10 rounded-xl flex items-center justify-center font-['Outfit'] font-black text-lg ${
                          g.score / g.criteria?.max_score >= 0.7 
                            ? "bg-emerald-50 text-emerald-800 border-2 border-emerald-400" 
                            : g.score / g.criteria?.max_score >= 0.4
                            ? "bg-amber-50 text-amber-900 border-2 border-amber-400"
                            : "bg-rose-50 text-rose-900 border-2 border-rose-400"
                        }`}>
                          {g.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
