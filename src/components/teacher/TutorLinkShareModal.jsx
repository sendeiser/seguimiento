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
  RefreshCw,
  UserPlus,
  FileText
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
  const [modalTab, setModalTab] = useState("register_dni"); // "register_dni" | "view_bulletin"

  // Link 1: Self DNI registration
  const [dniRegEnabled, setDniRegEnabled] = useState(classData?.dni_registration_enabled !== false);
  const [updatingDniReg, setUpdatingDniReg] = useState(false);
  const [copiedDniReg, setCopiedDniReg] = useState(false);
  const [showQrDniReg, setShowQrDniReg] = useState(false);

  // Link 2: Bulletin view
  const [bulletinEnabled, setBulletinEnabled] = useState(classData?.tutor_portal_enabled !== false);
  const [updatingBulletin, setUpdatingBulletin] = useState(false);
  const [copiedBulletin, setCopiedBulletin] = useState(false);
  const [showQrBulletin, setShowQrBulletin] = useState(false);

  useEffect(() => {
    if (classData) {
      setDniRegEnabled(classData.dni_registration_enabled !== false);
      setBulletinEnabled(classData.tutor_portal_enabled !== false);
    }
  }, [classData]);

  if (!isOpen || !classData) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const classCode = classData.short_code || classData.id;

  const registerDniUrl = `${baseUrl}/cargar-dni/${classCode}`;
  const qrRegisterUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(registerDniUrl)}&margin=10`;

  const bulletinUrl = `${baseUrl}/tutor?c=${classCode}`;
  const qrBulletinUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(bulletinUrl)}&margin=10`;

  // Student DNI coverage calculations
  const totalStudents = students.length;
  const studentsWithDni = students.filter(
    (s) => s.dni && String(s.dni).trim() !== ""
  ).length;
  const dniCoveragePct = totalStudents > 0 ? Math.round((studentsWithDni / totalStudents) * 100) : 0;
  const studentsMissingDni = totalStudents - studentsWithDni;

  // Toggle Link 1: DNI Registration
  const handleToggleDniReg = async () => {
    const newStatus = !dniRegEnabled;
    setUpdatingDniReg(true);

    try {
      const { error } = await supabase
        .from("classes")
        .update({ dni_registration_enabled: newStatus })
        .eq("id", classData.id);

      if (error) throw error;

      setDniRegEnabled(newStatus);
      if (onUpdateClass) {
        onUpdateClass({ ...classData, dni_registration_enabled: newStatus });
      }

      toast(
        newStatus
          ? "✅ Enlace para CARGAR DNI HABILITADO para estudiantes y familias"
          : "⏸️ Enlace para CARGAR DNI DESHABILITADO temporalmente",
        newStatus ? "success" : "info"
      );
    } catch (err) {
      console.error("Error al alternar estado de carga de DNI:", err);
      toast("No se pudo actualizar el estado del enlace.", "error");
    } finally {
      setUpdatingDniReg(false);
    }
  };

  // Toggle Link 2: Bulletin View
  const handleToggleBulletin = async () => {
    const newStatus = !bulletinEnabled;
    setUpdatingBulletin(true);

    try {
      const { error } = await supabase
        .from("classes")
        .update({ tutor_portal_enabled: newStatus })
        .eq("id", classData.id);

      if (error) throw error;

      setBulletinEnabled(newStatus);
      if (onUpdateClass) {
        onUpdateClass({ ...classData, tutor_portal_enabled: newStatus });
      }

      toast(
        newStatus
          ? "✅ Enlace de CONSULTA DE BOLETÍN HABILITADO"
          : "⏸️ Enlace de CONSULTA DE BOLETÍN DESHABILITADO",
        newStatus ? "success" : "info"
      );
    } catch (err) {
      console.error("Error al alternar estado de consulta de boletín:", err);
      toast("No se pudo actualizar el estado del enlace.", "error");
    } finally {
      setUpdatingBulletin(false);
    }
  };

  const handleCopyLink = (url, isReg) => {
    navigator.clipboard.writeText(url);
    if (isReg) {
      setCopiedDniReg(true);
      setTimeout(() => setCopiedDniReg(false), 2500);
    } else {
      setCopiedBulletin(true);
      setTimeout(() => setCopiedBulletin(false), 2500);
    }
    toast("¡Enlace copiado al portapapeles!", "success");
  };

  const handleShareWhatsappReg = () => {
    const message = `Estimados estudiantes y familias de ${classData.name}:\n\nLes compartimos el siguiente enlace para que puedan registrar su número de DNI y así habilitar la consulta online de notas y boletines escolares:\n\n🔗 ${registerDniUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareWhatsappBulletin = () => {
    const message = `Estimadas familias y estudiantes de ${classData.name}:\n\nLes compartimos el enlace oficial para consultar el boletín de calificaciones, notas del cuatrimestre y asistencias escolares con su DNI:\n\n🔗 ${bulletinUrl}`;
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
                Gestión de Enlaces y DNI
              </span>
              <h2 className="font-['Outfit'] font-black text-2xl tracking-tight text-white mt-1">
                Enlaces para Familias y Alumnos
              </h2>
              <p className="text-blue-100 text-xs font-semibold">
                Curso: {classData.name}
              </p>
            </div>
          </div>

          {/* Modal Tab Selector */}
          <div className="flex items-center gap-2 mt-5 bg-white/10 p-1.5 rounded-2xl border border-white/15">
            <button
              type="button"
              onClick={() => setModalTab("register_dni")}
              className={`flex-1 py-2 px-3 rounded-xl font-['Outfit'] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                modalTab === "register_dni"
                  ? "bg-white text-blue-700 shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>1. Enlace para Cargar DNI</span>
            </button>

            <button
              type="button"
              onClick={() => setModalTab("view_bulletin")}
              className={`flex-1 py-2 px-3 rounded-xl font-['Outfit'] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                modalTab === "view_bulletin"
                  ? "bg-white text-blue-700 shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>2. Enlace Consulta Boletín</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* TAB 1: DNI REGISTRATION LINK */}
          {modalTab === "register_dni" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Enable / Disable Switch */}
              <div
                className={`p-5 rounded-3xl border-2 transition-all ${
                  dniRegEnabled
                    ? "bg-emerald-50/70 border-emerald-300 shadow-sm"
                    : "bg-rose-50/70 border-rose-300 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {dniRegEnabled ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Carga de DNI Abierta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          Carga de DNI Deshabilitada
                        </span>
                      )}
                    </div>
                    <h3 className="font-['Outfit'] font-extrabold text-base text-slate-900">
                      {dniRegEnabled
                        ? "Los estudiantes pueden registrar su DNI"
                        : "Enlace de carga cerrado temporalmente"}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {dniRegEnabled
                        ? "Compartí este link para que cada alumno o tutor elija su nombre de la nómina y guarde su DNI en la base de datos."
                        : "El enlace está deshabilitado. Nadie puede registrar ni modificar DNIs hasta que lo vuelvas a habilitar."}
                    </p>
                  </div>

                  {/* Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={dniRegEnabled}
                    disabled={updatingDniReg}
                    onClick={handleToggleDniReg}
                    className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 ${
                      dniRegEnabled ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span className="sr-only">Habilitar o deshabilitar carga de DNI</span>
                    <span
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        dniRegEnabled ? "translate-x-8" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Link Input & Actions */}
              <div className="space-y-3">
                <label className="font-['Outfit'] font-black text-sm text-slate-900 block">
                  Enlace para que los Alumnos/Tutores carguen su DNI
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={registerDniUrl}
                    onClick={(e) => e.target.select()}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-blue-500 select-all"
                  />
                  <Button
                    type="button"
                    onClick={() => handleCopyLink(registerDniUrl, true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 px-4 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-500/20 shrink-0"
                  >
                    {copiedDniReg ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedDniReg ? "¡Copiado!" : "Copiar"}</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <Button
                    type="button"
                    onClick={handleShareWhatsappReg}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowQrDniReg(!showQrDniReg)}
                    className="rounded-2xl h-11 border-slate-200 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-slate-700"
                  >
                    <QrCode className="w-4 h-4 text-slate-600" />
                    <span>{showQrDniReg ? "Ocultar QR" : "Proyectar QR"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(registerDniUrl, "_blank")}
                    className="rounded-2xl h-11 border-slate-200 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-slate-700"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                    <span>Probar Carga</span>
                  </Button>
                </div>
              </div>

              {/* Optional QR Code View */}
              {showQrDniReg && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-3 animate-in fade-in duration-200">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">
                    Código QR para Proyectar en el Aula
                  </span>
                  <div className="inline-block bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <img
                      src={qrRegisterUrl}
                      alt={`Código QR para carga de DNI en ${classData.name}`}
                      className="w-48 h-48 mx-auto rounded-xl"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                    Proyectá este código en el pizarrón para que los chicos lo escaneen con el celular y carguen su DNI en 1 minuto.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BULLETIN CONSULTATION LINK */}
          {modalTab === "view_bulletin" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Enable / Disable Switch */}
              <div
                className={`p-5 rounded-3xl border-2 transition-all ${
                  bulletinEnabled
                    ? "bg-emerald-50/70 border-emerald-300 shadow-sm"
                    : "bg-rose-50/70 border-rose-300 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {bulletinEnabled ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Consultas Habilitadas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          Consultas Deshabilitadas
                        </span>
                      )}
                    </div>
                    <h3 className="font-['Outfit'] font-extrabold text-base text-slate-900">
                      {bulletinEnabled
                        ? "Los tutores pueden consultar el boletín con DNI"
                        : "Acceso al boletín pausado temporalmente"}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {bulletinEnabled
                        ? "Familias y alumnos pueden ingresar con su número de DNI y consultar notas, promedios y asistencias en tiempo real."
                        : "Ideal para períodos de corrección de exámenes o receso escolar. Quien ingrese verá un aviso de consultas pausadas."}
                    </p>
                  </div>

                  {/* Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={bulletinEnabled}
                    disabled={updatingBulletin}
                    onClick={handleToggleBulletin}
                    className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 ${
                      bulletinEnabled ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span className="sr-only">Habilitar o deshabilitar consulta de boletín</span>
                    <span
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        bulletinEnabled ? "translate-x-8" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Link Input & Actions */}
              <div className="space-y-3">
                <label className="font-['Outfit'] font-black text-sm text-slate-900 block">
                  Enlace de Consulta de Boletín Oficial
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={bulletinUrl}
                    onClick={(e) => e.target.select()}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-blue-500 select-all"
                  />
                  <Button
                    type="button"
                    onClick={() => handleCopyLink(bulletinUrl, false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 px-4 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-500/20 shrink-0"
                  >
                    {copiedBulletin ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedBulletin ? "¡Copiado!" : "Copiar"}</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <Button
                    type="button"
                    onClick={handleShareWhatsappBulletin}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowQrBulletin(!showQrBulletin)}
                    className="rounded-2xl h-11 border-slate-200 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-slate-700"
                  >
                    <QrCode className="w-4 h-4 text-slate-600" />
                    <span>{showQrBulletin ? "Ocultar QR" : "Código QR"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(bulletinUrl, "_blank")}
                    className="rounded-2xl h-11 border-slate-200 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-slate-700"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                    <span>Probar Vista</span>
                  </Button>
                </div>
              </div>

              {/* Optional QR Code View */}
              {showQrBulletin && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-3 animate-in fade-in duration-200">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">
                    Código QR para Consulta de Boletín
                  </span>
                  <div className="inline-block bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <img
                      src={qrBulletinUrl}
                      alt={`Código QR de boletín de ${classData.name}`}
                      className="w-48 h-48 mx-auto rounded-xl"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DNI COVERAGE AUDIT FOOTER */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-['Outfit'] font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Estado de Carga de DNIs en la Clase
              </span>
              <span className="font-['Outfit'] font-black text-sm text-slate-900">
                {studentsWithDni} de {totalStudents} ({dniCoveragePct}%)
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

            {studentsMissingDni > 0 ? (
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Faltan <strong>{studentsMissingDni} alumnos</strong> por registrar su DNI. Compartí el enlace de <em>"Cargar DNI"</em> para que se complete la nómina.
                </span>
              </p>
            ) : (
              <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡Excelente! Todos los alumnos de la clase tienen su DNI registrado.</span>
              </p>
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
