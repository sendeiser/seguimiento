import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../providers/ToastProvider";
import {
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  MessageCircle,
  X,
  Sparkles,
  AlertTriangle,
  GraduationCap,
  RefreshCw
} from "lucide-react";
import { Button } from "../ui/button";

export default function TutorLinkShareModal({
  isOpen,
  onClose,
  classData,
  students = [],
  onUpdateClass
}) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(classData?.tutor_portal_enabled !== false);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (classData) {
      setEnabled(classData.tutor_portal_enabled !== false);
    }
  }, [classData]);

  if (!isOpen || !classData) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const classCode = classData.short_code || classData.id;
  const shareUrl = `${baseUrl}/tutor?c=${classCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(shareUrl)}&margin=10`;

  // Student DNI coverage calculations
  const totalStudents = students.length;
  const studentsWithDni = students.filter(
    (s) => s.dni && String(s.dni).trim() !== ""
  ).length;
  const dniCoveragePct = totalStudents > 0 ? Math.round((studentsWithDni / totalStudents) * 100) : 0;
  const studentsMissingDni = totalStudents - studentsWithDni;

  const handleToggle = async () => {
    const newStatus = !enabled;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from("classes")
        .update({ tutor_portal_enabled: newStatus })
        .eq("id", classData.id);

      if (error) throw error;

      setEnabled(newStatus);
      if (onUpdateClass) {
        onUpdateClass({ ...classData, tutor_portal_enabled: newStatus });
      }

      toast(
        newStatus
          ? "✅ Enlace de consulta con DNI HABILITADO para las familias"
          : "⏸️ Enlace de consulta con DNI DESHABILITADO temporalmente",
        newStatus ? "success" : "info"
      );
    } catch (err) {
      console.error("Error al alternar estado del enlace de tutores:", err);
      toast("No se pudo actualizar el estado del enlace. Intente nuevamente.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast("¡Enlace copiado al portapapeles!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsapp = () => {
    const message = `Estimadas familias y estudiantes de ${classData.name}:\n\nLes compartimos el enlace oficial para consultar el boletín de calificaciones, notas del cuatrimestre y asistencias. Solo deben ingresar su número de DNI:\n\n🔗 ${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-2xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                Portal de Familias y Tutores
              </span>
              <h2 className="font-['Outfit'] font-black text-2xl tracking-tight text-white mt-1">
                Compartir Boletín por DNI
              </h2>
              <p className="text-blue-100 text-xs font-semibold">
                Curso: {classData.name}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* 1. ENABLE / DISABLE SWITCH MODULE */}
          <div
            className={`p-5 rounded-3xl border-2 transition-all ${
              enabled
                ? "bg-emerald-50/70 border-emerald-300 shadow-sm"
                : "bg-rose-50/70 border-rose-300 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {enabled ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Enlace Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      Enlace Deshabilitado / Pausado
                    </span>
                  )}
                </div>
                <h3 className="font-['Outfit'] font-extrabold text-base text-slate-900">
                  {enabled
                    ? "Las consultas con DNI están habilitadas"
                    : "Acceso con DNI deshabilitado para este curso"}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {enabled
                    ? "Los tutores y estudiantes que tengan el enlace pueden ingresar su número de DNI y consultar sus calificaciones y asistencias en tiempo real."
                    : "Cualquier persona que ingrese verá un aviso indicando que las consultas se encuentran pausadas temporalmente por el docente (ideal para períodos de cierre de notas o exámenes)."}
                </p>
              </div>

              {/* Animated Switch Button */}
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={updating}
                onClick={handleToggle}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 ${
                  enabled ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Habilitar o deshabilitar enlace</span>
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    enabled ? "translate-x-8" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 2. SHARE LINK SECTION */}
          <div className="space-y-3">
            <label className="font-['Outfit'] font-black text-sm text-slate-900 block">
              Enlace de Consulta para Compartir
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => e.target.select()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-blue-500 select-all"
                />
              </div>

              <Button
                type="button"
                onClick={handleCopyLink}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 px-4 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-500/20 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copiar
                  </>
                )}
              </Button>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <Button
                type="button"
                onClick={handleShareWhatsapp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowQR(!showQR)}
                className="rounded-2xl h-11 border-slate-200 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-slate-700"
              >
                <QrCode className="w-4 h-4 text-slate-600" />
                <span>{showQR ? "Ocultar QR" : "Código QR"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(shareUrl, "_blank")}
                className="rounded-2xl h-11 border-slate-200 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-slate-700"
              >
                <ExternalLink className="w-4 h-4 text-slate-600" />
                <span>Probar</span>
              </Button>
            </div>
          </div>

          {/* 3. OPTIONAL QR CODE VIEW */}
          {showQR && (
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">
                Código QR para Escaneo Móvil
              </span>
              <div className="inline-block bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <img
                  src={qrUrl}
                  alt={`Código QR de ${classData.name}`}
                  className="w-48 h-48 mx-auto rounded-xl"
                  loading="lazy"
                />
              </div>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                Podés proyectar este código en clase o imprimirlo en el cuaderno de comunicaciones para que las familias ingresen con la cámara de su celular.
              </p>
            </div>
          )}

          {/* 4. DNI COVERAGE STATUS FOR THIS CLASS */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-['Outfit'] font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Cobertura de DNI en este Curso
              </span>
              <span className="font-['Outfit'] font-black text-sm text-slate-900">
                {studentsWithDni} de {totalStudents} alumnos ({dniCoveragePct}%)
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dniCoveragePct === 100
                    ? "bg-emerald-500"
                    : dniCoveragePct >= 70
                    ? "bg-blue-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${dniCoveragePct}%` }}
              />
            </div>

            {studentsMissingDni > 0 && (
              <div className="flex items-start gap-2 text-xs font-semibold text-amber-800 bg-amber-50/80 p-3 rounded-2xl border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Hay <strong>{studentsMissingDni} alumno(s)</strong> sin DNI registrado en la nómina. Podés cargarlo en la pestaña <em>"Alumnos"</em> para que puedan consultar su boletín.
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="rounded-2xl h-11 px-6 font-bold text-sm bg-slate-900 text-white hover:bg-slate-800"
          >
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  );
}
