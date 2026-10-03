import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import confetti from "canvas-confetti";
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  User,
  FileText,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { parseTempEnrollCode, formatRemainingTime } from "../../lib/tempEnrollment";

export default function StudentEnrollmentView() {
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = (paramToken || searchParams.get("t") || searchParams.get("token") || "").trim().toUpperCase();

  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null); // 'NOT_FOUND' | 'EXPIRED' | 'NETWORK'
  const [errorMessage, setErrorMessage] = useState("");
  const [manualToken, setManualToken] = useState("");

  // Form
  const [studentName, setStudentName] = useState("");
  const [studentDni, setStudentDni] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [enrollmentResult, setEnrollmentResult] = useState(null);

  // Countdown timer
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (token) {
      fetchTokenInfo(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Live countdown
  useEffect(() => {
    if (!remainingMs || remainingMs <= 0) return;
    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        const next = Math.max(0, prev - 1000);
        if (next === 0) {
          setErrorStatus("EXPIRED");
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingMs]);

  const fetchTokenInfo = async (tokenToVerify) => {
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage("");

    try {
      // 1. Try RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_temp_enroll_class_info", {
        p_token: tokenToVerify,
      });

      if (!rpcError && rpcData) {
        if (!rpcData.success) {
          setErrorStatus(rpcData.error || "EXPIRED");
          setErrorMessage(rpcData.message || "El enlace ha expirado.");
          setClassInfo(rpcData);
          setLoading(false);
          return;
        }

        setClassInfo(rpcData);
        if (rpcData.expires_at_ms) {
          setRemainingMs(Math.max(0, rpcData.expires_at_ms - Date.now()));
        }
        setLoading(false);
        return;
      }

      // 2. Fallback: Query classes directly
      const { data: classRows, error: classErr } = await supabase
        .from("classes")
        .select("id, name, short_code, join_code, teacher_id, public_token, profiles!classes_teacher_id_fkey(full_name)")
        .like("join_code", `%${tokenToVerify}%`)
        .limit(1);

      if (classErr || !classRows || classRows.length === 0) {
        setErrorStatus("NOT_FOUND");
        setErrorMessage("No se encontró ningún curso con este código o enlace.");
        setLoading(false);
        return;
      }

      const cls = classRows[0];
      const parsed = parseTempEnrollCode(cls.join_code);

      if (!parsed.isTemp || parsed.isExpired) {
        setErrorStatus("EXPIRED");
        setErrorMessage("El enlace de inscripción temporal ha expirado.");
        setClassInfo({
          class_name: cls.name,
          teacher_name: cls.profiles?.full_name || "Docente",
        });
        setLoading(false);
        return;
      }

      setClassInfo({
        class_id: cls.id,
        class_name: cls.name,
        teacher_name: cls.profiles?.full_name || "Docente",
        short_code: cls.short_code,
        public_token: cls.public_token,
      });
      setRemainingMs(parsed.remainingMs);
    } catch (err) {
      console.error("Error al validar enlace temporal:", err);
      setErrorStatus("NETWORK");
      setErrorMessage("Ocurrió un error al cargar la información. Verifique su conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    navigate(`/inscribirse/${manualToken.trim().toUpperCase()}`);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    const cleanName = studentName.trim();
    const cleanDni = studentDni.replace(/[^0-9]/g, "");

    if (cleanName.length < 2) {
      setSubmitError("Por favor ingresá tu nombre y apellido completos.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      // 1. Try RPC enroll
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("enroll_student_by_temp_link", {
        p_token: token,
        p_student_name: cleanName,
        p_dni: cleanDni || null,
      });

      if (!rpcErr && rpcRes) {
        if (!rpcRes.success) {
          setSubmitError(rpcRes.message || "Error al realizar la inscripción.");
          setSubmitting(false);
          return;
        }

        // Confetti celebration
        try {
          confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}

        setEnrollmentResult(rpcRes);
        setSubmitting(false);
        return;
      }

      // 2. Fallback: Check if student already enrolled, then insert if possible
      if (classInfo?.class_id) {
        const { data: existing } = await supabase
          .from("class_students")
          .select("id, student_name, public_token, dni")
          .eq("class_id", classInfo.class_id)
          .ilike("student_name", cleanName)
          .maybeSingle();

        if (existing) {
          try {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          } catch (e) {}

          setEnrollmentResult({
            success: true,
            already_enrolled: true,
            message: "¡Ya te encuentras registrado/a en este curso!",
            student: {
              ...existing,
              class_name: classInfo.class_name,
            },
          });
          setSubmitting(false);
          return;
        }

        // Direct insert fallback
        const { data: newStudent, error: insertErr } = await supabase
          .from("class_students")
          .insert([
            {
              class_id: classInfo.class_id,
              student_name: cleanName,
              dni: cleanDni || null,
            },
          ])
          .select()
          .single();

        if (insertErr) {
          // If RLS blocked insert, notify teacher needs to run SQL
          setSubmitError(
            "El sistema requiere la activación de la función en Supabase (ejecutar inscribir_alumnos_temporal.sql). Contacte a su docente."
          );
          setSubmitting(false);
          return;
        }

        try {
          confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
        } catch (e) {}

        setEnrollmentResult({
          success: true,
          already_enrolled: false,
          message: "¡Inscripción exitosa!",
          student: {
            ...newStudent,
            student_name: newStudent?.student_name || cleanName,
            class_name: classInfo.class_name,
          },
        });
      }
    } catch (err) {
      console.error("Error al procesar inscripción:", err);
      setSubmitError("No se pudo completar la inscripción. Intente nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Navbar */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-['Outfit'] font-black text-slate-900 text-sm tracking-tight">Notyx Edu</span>
        </Link>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/80">
          Inscripción Estudiantes
        </span>
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        {loading ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-2xs text-center space-y-4">
            <div className="w-10 h-10 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Validando enlace de curso...</p>
          </div>
        ) : !token ? (
          /* Manual Token Input */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-5 animate-in fade-in">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-100">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-['Outfit'] font-black text-slate-900 tracking-tight">
                Inscripción a Materia
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Ingresá el código temporal que te dio tu docente para anotarte.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                autoFocus
                type="text"
                placeholder="Ej: REG-8X9K"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="w-full h-12 text-center uppercase font-mono font-bold text-base bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all placeholder:font-normal placeholder:text-slate-400"
              />
              <Button
                type="submit"
                disabled={!manualToken.trim()}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Continuar
              </Button>
            </form>
          </div>
        ) : errorStatus === "EXPIRED" ? (
          /* Expired State */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                Enlace Expirado
              </span>
              <h3 className="text-xl font-['Outfit'] font-black text-slate-900 tracking-tight mt-2">
                Las inscripciones ya finalizaron
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                El tiempo de activación para este enlace temporal ha terminado o fue cerrado por el docente.
              </p>
              {classInfo?.class_name && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-left">
                  <p className="text-xs font-bold text-slate-800">{classInfo.class_name}</p>
                  <p className="text-[11px] text-slate-500">Docente: {classInfo.teacher_name}</p>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Si aún necesitás anotarte, pedile a tu docente que vuelva a abrir el enlace temporal de inscripción.
            </p>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full h-11 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
            >
              Volver al Inicio
            </Button>
          </div>
        ) : errorStatus ? (
          /* Error / Not Found */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-['Outfit'] font-black text-slate-900 tracking-tight">
                Enlace no válido
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {errorMessage || "No pudimos encontrar este código de inscripción."}
              </p>
            </div>
            <Button
              onClick={() => navigate("/")}
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
            >
              Volver al Inicio
            </Button>
          </div>
        ) : enrollmentResult ? (
          /* SUCCESS STATE */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-5 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {enrollmentResult.already_enrolled ? "Ya registrado" : "Inscripción Exitosa"}
              </span>
              <h2 className="text-xl sm:text-2xl font-['Outfit'] font-black text-slate-900 tracking-tight">
                ¡Bienvenido/a, {enrollmentResult.student?.student_name || studentName}!
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {enrollmentResult.message || "Tu registro ha sido confirmado en el curso."}
              </p>
            </div>

            {/* Student Info Card */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Materia</span>
                <span className="text-xs font-bold text-slate-900">{classInfo?.class_name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Docente</span>
                <span className="text-xs font-medium text-slate-700">{classInfo?.teacher_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Estado</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Alumno Activo
                </span>
              </div>
            </div>

            {/* Direct CTA */}
            {enrollmentResult.student?.public_token && (
              <div className="space-y-2 pt-1">
                <Link
                  to={`/live/${enrollmentResult.student.public_token}`}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Ver mi Ficha de Estudiante</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <p className="text-[11px] text-center text-slate-400 font-medium">
                  Guardá este enlace en tus favoritos para ver tus notas y asistencia en vivo.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE ENROLLMENT FORM */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-5 animate-in fade-in">
            {/* Class Info Header */}
            <div className="space-y-3 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Inscripciones Abiertas
                </span>
                {remainingMs > 0 && (
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    ⏳ {formatRemainingTime(remainingMs)}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-['Outfit'] font-black text-slate-900 tracking-tight leading-snug">
                  {classInfo?.class_name}
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Docente: {classInfo?.teacher_name}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Tu Nombre y Apellido <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    type="text"
                    required
                    placeholder="Ej: Mateo Lucas Martínez"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ingresá tu nombre tal como figura en la lista del colegio.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  DNI del Estudiante <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej: 52283711"
                    value={studentDni}
                    onChange={(e) => setStudentDni(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Permite a tus familiares consultar tu boletín escolar.
                </p>
              </div>

              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs font-medium text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !studentName.trim()}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Inscribiendo...</span>
                  </>
                ) : (
                  <>
                    <span>Inscribirme a la Clase</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Notyx Edu • Plataforma de Seguimiento Académico
      </footer>
    </div>
  );
}
