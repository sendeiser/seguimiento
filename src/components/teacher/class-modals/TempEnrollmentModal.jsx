import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useToast } from "../../../providers/ToastProvider";
import {
  Clock,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Share2,
  Users,
  X,
  AlertCircle,
  Sparkles,
  RefreshCw,
  PowerOff,
  Code2,
  CheckCircle2,
  MessageCircle
} from "lucide-react";
import { Button } from "../../ui/button";
import {
  generateTempToken,
  createTempEnrollCode,
  parseTempEnrollCode,
  formatRemainingTime
} from "../../../lib/tempEnrollment";

export default function TempEnrollmentModal({
  isOpen,
  onClose,
  classData,
  students = [],
  onUpdateClass,
  onRefreshStudents
}) {
  const { toast } = useToast();
  const [selectedDuration, setSelectedDuration] = useState(30); // minutes: 15, 30, 60, 120, 1440
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showSqlHelp, setShowSqlHelp] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every second to update countdown
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !classData) return null;

  const enrollInfo = parseTempEnrollCode(classData.join_code);
  const isCurrentlyActive = enrollInfo.active;
  const remainingTimeStr = formatRemainingTime(enrollInfo.remainingMs);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const enrollUrl = enrollInfo.token ? `${baseUrl}/inscribirse/${enrollInfo.token}` : "";
  const qrUrl = enrollUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(enrollUrl)}&margin=10`
    : "";

  // Activate / Generate Link
  const handleActivate = async () => {
    setSaving(true);
    try {
      const newToken = generateTempToken();
      const newCode = createTempEnrollCode(newToken, selectedDuration);

      const { error } = await supabase
        .from("classes")
        .update({ join_code: newCode })
        .eq("id", classData.id);

      if (error) throw error;

      if (onUpdateClass) {
        onUpdateClass({ ...classData, join_code: newCode });
      }

      toast(`✅ Inscripciones abiertas por ${selectedDuration} minutos`, "success");
    } catch (err) {
      console.error("Error al activar enlace temporal:", err);
      toast("Error al activar las inscripciones. Verifique su conexión.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Deactivate / Close Link Now
  const handleDeactivate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("classes")
        .update({ join_code: null })
        .eq("id", classData.id);

      if (error) throw error;

      if (onUpdateClass) {
        onUpdateClass({ ...classData, join_code: null });
      }

      toast("⏸️ Inscripciones cerradas", "info");
    } catch (err) {
      console.error("Error al cerrar inscripciones:", err);
      toast("Error al desactivar el enlace.", "error");
    } finally {
      setSaving(false);
    }
  };

  const copyEnrollLink = () => {
    if (!enrollUrl) return;
    navigator.clipboard.writeText(enrollUrl);
    setCopied(true);
    toast("Enlace de inscripción copiado al portapapeles", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const copySqlCode = () => {
    const sql = `-- Ejecutar en Supabase SQL Editor:
CREATE OR REPLACE FUNCTION public.get_temp_enroll_class_info(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_class record; v_parts text[]; v_expires_ms bigint; v_is_expired boolean := false;
BEGIN
  SELECT c.*, p.full_name AS teacher_full_name INTO v_class FROM classes c LEFT JOIN profiles p ON p.id = c.teacher_id WHERE c.join_code LIKE '%' || trim(p_token) || '%' LIMIT 1;
  IF v_class.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Enlace no encontrado'); END IF;
  IF v_class.join_code LIKE 'TEMP:%' THEN
    v_parts := string_to_array(v_class.join_code, ':');
    IF array_length(v_parts, 1) >= 3 THEN
      BEGIN v_expires_ms := v_parts[3]::bigint; IF (extract(epoch from now()) * 1000)::bigint > v_expires_ms THEN v_is_expired := true; END IF; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  ELSE v_is_expired := true; END IF;
  IF v_is_expired THEN RETURN json_build_object('success', false, 'error', 'EXPIRED', 'message', 'El enlace ha expirado'); END IF;
  RETURN json_build_object('success', true, 'class_id', v_class.id, 'class_name', v_class.name, 'teacher_name', COALESCE(v_class.teacher_full_name, 'Docente'), 'expires_at_ms', v_expires_ms);
END; $$;

CREATE OR REPLACE FUNCTION public.enroll_student_by_temp_link(p_token text, p_student_name text, p_dni text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_class record; v_student record; v_new_student record; v_parts text[]; v_expires_ms bigint;
BEGIN
  SELECT * INTO v_class FROM classes WHERE join_code LIKE '%' || trim(p_token) || '%' LIMIT 1;
  IF v_class.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Enlace inválido'); END IF;
  IF v_class.join_code LIKE 'TEMP:%' THEN
    v_parts := string_to_array(v_class.join_code, ':');
    IF array_length(v_parts, 1) >= 3 THEN
      BEGIN v_expires_ms := v_parts[3]::bigint; IF (extract(epoch from now()) * 1000)::bigint > v_expires_ms THEN RETURN json_build_object('success', false, 'error', 'EXPIRED', 'message', 'Enlace expirado'); END IF; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  ELSE RETURN json_build_object('success', false, 'error', 'INACTIVE', 'message', 'Inscripciones cerradas'); END IF;
  SELECT * INTO v_student FROM class_students WHERE class_id = v_class.id AND (lower(trim(student_name)) = lower(trim(p_student_name)) OR (nullif(trim(p_dni), '') IS NOT NULL AND dni = trim(p_dni))) LIMIT 1;
  IF v_student.id IS NOT NULL THEN RETURN json_build_object('success', true, 'already_enrolled', true, 'student', json_build_object('id', v_student.id, 'student_name', v_student.student_name, 'public_token', v_student.public_token)); END IF;
  INSERT INTO class_students (class_id, student_name, dni, public_token) VALUES (v_class.id, trim(p_student_name), nullif(trim(p_dni), ''), gen_random_uuid()) RETURNING * INTO v_new_student;
  RETURN json_build_object('success', true, 'already_enrolled', false, 'student', json_build_object('id', v_new_student.id, 'student_name', v_new_student.student_name, 'public_token', v_new_student.public_token));
END; $$;

GRANT EXECUTE ON FUNCTION public.get_temp_enroll_class_info(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enroll_student_by_temp_link(text, text, text) TO anon, authenticated, service_role;`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    toast("SQL copiado al portapapeles. Pegalo en Supabase SQL Editor.", "success");
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const whatsappMessage = encodeURIComponent(
    `¡Hola chicos! Les comparto el enlace temporal para anotarse a la materia *${classData.name}*:\n\n👉 ${enrollUrl}\n\n⚠️ Este enlace vence en ${remainingTimeStr}. ¡Anotate ahora!`
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200/80 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-['Outfit'] font-black text-slate-900 tracking-tight leading-tight">
                Enlace Temporal de Inscripción
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Los alumnos se anotan ellos mismos por única vez
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* State 1: Active Enrollment Link */}
        {isCurrentlyActive ? (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Inscripciones Abiertas
                  </span>
                </div>
                <div className="text-xs font-bold font-mono text-emerald-700 bg-white/80 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  ⏳ {remainingTimeStr}
                </div>
              </div>

              {/* Link Box */}
              <div className="bg-white rounded-lg p-2.5 border border-emerald-200 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-medium text-slate-700 truncate select-all">
                  {enrollUrl}
                </span>
                <button
                  onClick={copyEnrollLink}
                  className={`h-8 px-3 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </button>
              </div>

              {/* Quick Share Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={`https://api.whatsapp.com/send?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{showQr ? "Ocultar QR" : "Código QR"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <PowerOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cerrar Ahora</span>
                </button>
              </div>

              {/* Collapsible QR Code */}
              {showQr && (
                <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200 text-center animate-in fade-in duration-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Escaneá con la cámara del celular
                  </p>
                  <img
                    src={qrUrl}
                    alt="Código QR de Inscripción"
                    className="w-48 h-48 mx-auto rounded-lg shadow-sm border border-slate-100"
                  />
                  <p className="text-xs text-slate-500 font-medium mt-2">
                    Ideal para proyectar en el aula o pizarrón
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* State 2: Inactive Link - Activation Form */
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Inscripciones Pausadas
                </span>
                <span className="text-[11px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Inactivo
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Elegí cuánto tiempo querés que permanezca activo el enlace. Al vencerse el plazo, dejará de recibir inscripciones automáticamente.
              </p>

              {/* Duration Options */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Tiempo de activación:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { minutes: 15, label: "15 min" },
                    { minutes: 30, label: "30 min" },
                    { minutes: 60, label: "1 hora" },
                    { minutes: 120, label: "2 horas" },
                    { minutes: 1440, label: "24 horas" },
                  ].map((dur) => (
                    <button
                      key={dur.minutes}
                      type="button"
                      onClick={() => setSelectedDuration(dur.minutes)}
                      className={`h-9 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        selectedDuration === dur.minutes
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activate CTA */}
              <Button
                onClick={handleActivate}
                disabled={saving}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Abrir Inscripciones ({selectedDuration} min)</span>
              </Button>
            </div>
          </div>
        )}

        {/* Live Enrollment Count */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Alumnos en el curso:</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
              {students.length} inscriptos
            </span>
            {onRefreshStudents && (
              <button
                type="button"
                onClick={onRefreshStudents}
                title="Actualizar lista de alumnos"
                className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Supabase SQL Helper (Collapsible) */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowSqlHelp(!showSqlHelp)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <span className="flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Configuración SQL de Supabase (Opcional)</span>
            </span>
            <span className="text-indigo-600">{showSqlHelp ? "Ocultar" : "Ver"}</span>
          </button>

          {showSqlHelp && (
            <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600 animate-in fade-in duration-200">
              <p className="leading-relaxed">
                Para permitir que los alumnos se inscriban directamente sin cuenta previa, asegurate de haber ejecutado el script en Supabase SQL Editor.
              </p>
              <button
                type="button"
                onClick={copySqlCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs shadow-2xs cursor-pointer active:scale-95"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? "¡Script copiado!" : "Copiar Script SQL"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
