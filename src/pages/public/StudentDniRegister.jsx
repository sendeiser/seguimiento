import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import confetti from "canvas-confetti";
import {
  GraduationCap,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BookOpen,
  User,
  Users,
  RefreshCw,
  X,
  FileText,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Button } from "../../components/ui/button";

export default function StudentDniRegister() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const classCode = code || searchParams.get("c") || searchParams.get("code") || searchParams.get("class") || "";

  const [loading, setLoading] = useState(!!classCode);
  const [classData, setClassData] = useState(null);
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");

  // Step 1: Student selection
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Step 2: DNI input & submission
  const [dniInput, setDniInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (classCode) {
      fetchClassRoster(classCode);
    }
  }, [classCode]);

  const fetchClassRoster = async (codeToFetch) => {
    setLoading(true);
    setError("");
    setSelectedStudent(null);
    setSuccessData(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_class_students_for_dni_registration",
        { p_class_code: codeToFetch.trim() }
      );

      if (rpcError) throw rpcError;

      if (!data || data.error === "NOT_FOUND") {
        setError("No se encontró ningún curso con el código indicado. Verificá el enlace o consultá con el docente.");
        setClassData(null);
        return;
      }

      if (data.error === "REGISTRATION_DISABLED") {
        setError("REGISTRATION_DISABLED");
        setClassData({
          class_name: data.class_name,
          teacher_name: data.teacher_name,
          short_code: codeToFetch
        });
        return;
      }

      setClassData(data);
    } catch (err) {
      console.error("Error al cargar nómina para registro de DNI:", err);
      setError("Ocurrió un error al cargar la información del curso. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualCodeSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    fetchClassRoster(manualCode);
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setDniInput("");
    setSubmitError("");
    setSuccessData(null);
  };

  const handleSubmitDni = async (e) => {
    e.preventDefault();
    const cleanDni = dniInput.replace(/[^0-9]/g, "");

    if (cleanDni.length < 6 || cleanDni.length > 10) {
      setSubmitError("El DNI debe tener entre 6 y 10 dígitos numéricos.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const { data, error: submitRpcError } = await supabase.rpc("submit_student_dni", {
        p_class_code: classCode || classData?.short_code,
        p_class_student_id: selectedStudent.id,
        p_dni: cleanDni
      });

      if (submitRpcError) throw submitRpcError;

      if (data?.error) {
        setSubmitError(data.error);
        return;
      }

      // Success!
      setSuccessData({
        student_name: data.student_name,
        dni: data.dni,
        class_name: data.class_name
      });

      // Update local student in roster
      setClassData((prev) => {
        if (!prev) return prev;
        const updatedStudents = prev.students.map((s) =>
          s.id === selectedStudent.id
            ? { ...s, has_dni: true, masked_dni: `••• ${cleanDni.slice(-3)}` }
            : s
        );
        return { ...prev, students: updatedStudents };
      });

      // Confetti celebration
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error("Error al registrar DNI:", err);
      setSubmitError("No se pudo guardar el DNI. Por favor intente nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = (classData?.students || []).filter((s) =>
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center p-4 sm:p-8 selection:bg-blue-500 selection:text-white">
      
      {/* Top Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-6 border-b border-slate-200/80 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-['Outfit'] font-black text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
              NOTYX EDU
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                Oficial
              </span>
            </h1>
            <p className="font-['DM_Sans'] font-semibold text-xs text-slate-500">
              Registro y Carga de DNI de Estudiantes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Acceso Seguro</span>
        </div>
      </header>

      <main className="w-full max-w-4xl space-y-6">

        {/* 1. IF NO CLASS CODE SPECIFIED */}
        {!classCode && !classData && !loading && (
          <div className="bg-white rounded-[32px] p-8 sm:p-12 border border-slate-200/80 shadow-xl shadow-slate-900/5 max-w-lg mx-auto text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <BookOpen className="w-7 h-7" />
            </div>
            <h2 className="font-['Outfit'] font-black text-2xl text-slate-900">
              Ingresá el Código de tu Clase
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Escribí el código de clase que te proporcionó el docente para acceder a la nómina y registrar tu DNI.
            </p>

            <form onSubmit={handleManualCodeSubmit} className="space-y-3 pt-2">
              <input
                type="text"
                placeholder="Ej: 6B9F5F"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-center font-['Outfit'] font-black text-xl tracking-widest uppercase outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20"
              />
              <Button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/20"
              >
                Continuar
              </Button>
            </form>
          </div>
        )}

        {/* 2. LOADING STATE */}
        {loading && (
          <div className="bg-white rounded-[32px] p-12 border border-slate-200/80 text-center space-y-4 shadow-sm">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="font-['Outfit'] font-bold text-slate-600">Cargando nómina de la clase...</p>
          </div>
        )}

        {/* 3. ERROR: REGISTRATION DISABLED BY TEACHER */}
        {error === "REGISTRATION_DISABLED" && (
          <div className="bg-white rounded-[32px] p-8 sm:p-12 border-2 border-rose-200 shadow-xl shadow-rose-900/5 text-center max-w-xl mx-auto space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-3 py-1 rounded-full border border-rose-300">
                Enlace Pausado o Finalizado
              </span>
              <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                Carga de DNI Deshabilitada
              </h2>
              <p className="text-slate-600 font-semibold text-sm leading-relaxed max-w-md mx-auto">
                El docente de <strong>{classData?.class_name}</strong> ({classData?.teacher_name}) ha cerrado o pausado temporalmente el enlace de carga de DNI para este curso.
              </p>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Si necesitás registrar o corregir tu DNI, comunicate con el profesor en la próxima clase.
            </p>

            <Button
              onClick={() => navigate(`/tutor?c=${classCode || classData?.short_code}`)}
              className="rounded-2xl font-bold text-xs uppercase tracking-wider px-6 h-11 bg-slate-900 hover:bg-slate-800 text-white"
            >
              Ir a Consultar Boletín
            </Button>
          </div>
        )}

        {/* 4. ERROR: NOT FOUND OR OTHER */}
        {error && error !== "REGISTRATION_DISABLED" && (
          <div className="bg-white rounded-[32px] p-8 border border-rose-200 shadow-sm max-w-xl mx-auto text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900">No se pudo acceder al curso</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{error}</p>
            <Button
              onClick={() => {
                setError("");
                setClassData(null);
                setManualCode("");
              }}
              variant="outline"
              className="rounded-2xl font-bold text-xs uppercase"
            >
              Intentar con otro código
            </Button>
          </div>
        )}

        {/* 5. ACTIVE ROSTER FOR DNI REGISTRATION */}
        {classData && !error && !loading && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Course Header Banner */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white rounded-[32px] p-6 sm:p-8 shadow-xl shadow-blue-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-blue-200 bg-white/10 px-3 py-1 rounded-full border border-white/20 inline-block">
                  Carga Oficial de DNI
                </span>
                <h2 className="font-['Outfit'] font-black text-2xl sm:text-4xl tracking-tight text-white">
                  {classData.class_name}
                </h2>
                <p className="text-blue-100/90 font-bold text-xs sm:text-sm">
                  Docente: {classData.teacher_name} • Código: {classData.short_code}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">
                  Estudiantes en Nómina
                </span>
                <span className="font-['Outfit'] font-black text-3xl mt-1 block">
                  {classData.students?.length || 0}
                </span>
              </div>
            </div>

            {/* SUCCESS MODAL / BANNER (AFTER SUBMISSION) */}
            {successData && (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-[32px] p-6 sm:p-8 text-center space-y-4 animate-in zoom-in-95 duration-200 shadow-lg shadow-emerald-500/10">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-black text-2xl text-emerald-950">
                    ¡DNI registrado con éxito!
                  </h3>
                  <p className="text-emerald-800 font-semibold text-sm mt-1">
                    El DNI <strong>{successData.dni}</strong> ha sido guardado correctamente para{" "}
                    <strong>{successData.student_name}</strong> en {successData.class_name}.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button
                    onClick={() =>
                      navigate(
                        `/tutor?c=${classData.short_code}&dni=${successData.dni}`
                      )
                    }
                    className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl h-11 px-6 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-700/20"
                  >
                    <span>Ver Boletín de Calificaciones</span>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuccessData(null);
                      setSelectedStudent(null);
                    }}
                    className="rounded-2xl h-11 px-5 border-emerald-300 hover:bg-emerald-100/50 text-emerald-900 font-bold text-xs"
                  >
                    Cargar otro alumno
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: DNI FORM (IF STUDENT SELECTED) */}
            {selectedStudent && !successData && (
              <div className="bg-white rounded-[32px] p-6 sm:p-8 border-2 border-blue-500 shadow-xl shadow-blue-500/10 space-y-5 animate-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 font-['Outfit'] font-black flex items-center justify-center text-base">
                      {selectedStudent.student_name[0]}
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                        Paso 2: Registrar DNI
                      </span>
                      <h3 className="font-['Outfit'] font-black text-xl text-slate-900">
                        {selectedStudent.student_name}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmitDni} className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
                      Número de DNI del Estudiante
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        autoComplete="off"
                        placeholder="Ej: 52283711 o 52.283.711"
                        value={dniInput}
                        onChange={(e) => setDniInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 font-['Outfit'] font-black text-xl tracking-wider text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal"
                      />
                      {dniInput && (
                        <button
                          type="button"
                          onClick={() => setDniInput("")}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                      Ingresá solo los números. Este número será la clave que utilizarán tus tutores para consultar tus calificaciones y asistencias.
                    </p>
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={submitting || dniInput.replace(/[^0-9]/g, "").length < 6}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl h-12 px-8 font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Guardando...
                        </>
                      ) : (
                        <>
                          <span>Confirmar y Guardar DNI</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedStudent(null)}
                      className="rounded-2xl h-12 px-4 text-xs font-bold text-slate-500"
                    >
                      Elegir otro alumno
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 1: SELECT STUDENT FROM ROSTER */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-900/5 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block">
                    Paso 1: Buscá tu nombre
                  </span>
                  <h3 className="font-['Outfit'] font-black text-xl text-slate-900">
                    Seleccioná tu nombre en la lista
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Hacé clic sobre tu nombre para cargar o actualizar tu número de DNI.
                  </p>
                </div>

                {/* Filter Search Input */}
                <div className="relative min-w-[240px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Roster Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredStudents.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-slate-400 font-bold text-sm">
                    No se encontró ningún estudiante con "{searchTerm}".
                  </div>
                ) : (
                  filteredStudents.map((st) => {
                    const isSelected = selectedStudent?.id === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleSelectStudent(st)}
                        className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-3 group ${
                          isSelected
                            ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                            : "bg-slate-50/60 hover:bg-blue-50/40 border-slate-200/80 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl font-['Outfit'] font-black flex items-center justify-center text-sm transition-colors ${
                            isSelected ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-700 group-hover:border-blue-300"
                          }`}>
                            {st.student_name[0]}
                          </div>
                          <div className="overflow-hidden">
                            <span className="font-['Outfit'] font-bold text-sm text-slate-900 block truncate">
                              {st.student_name}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 block">
                              Alumno del curso
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          {st.has_dni ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {st.masked_dni ? `DNI ${st.masked_dni}` : "DNI registrado"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              DNI pendiente
                            </span>
                          )}

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
