import { useState } from "react";
import {
  UserPlus,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  MessageCircle,
  QrCode,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { Button } from "../../ui/button";

export default function ClassTutorTab({
  classData,
  students,
  BASE_URL,
  tutorUpdating,
  handleToggleDniRegistration,
  handleToggleTutorPortal,
  updateStudentDni,
  getStudentName,
  toast,
}) {
  const [tutorCopied, setTutorCopied] = useState(false);
  const [tutorShowQR, setTutorShowQR] = useState(false);
  const [tutorRegCopied, setTutorRegCopied] = useState(false);
  const [tutorRegShowQR, setTutorRegShowQR] = useState(false);
  const [editingDniStudentId, setEditingDniStudentId] = useState(null);
  const [tempDniInput, setTempDniInput] = useState("");

  const dniLoadedCount = students.filter((s) => s.dni && String(s.dni).trim()).length;
  const dniPercentage = students.length > 0 ? Math.round((dniLoadedCount / students.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER HERO */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 rounded-[32px] p-6 sm:p-8 text-white shadow-xl shadow-blue-500/15 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 bg-white/10 px-3 py-1 rounded-full border border-white/15 inline-block">
            Gestión de Enlaces Escolares
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] tracking-tight">
            Enlaces para Carga de DNI y Boletines
          </h2>
          <p className="text-xs sm:text-sm font-medium text-blue-100 max-w-2xl leading-relaxed">
            Compartí los enlaces oficiales con tus estudiantes y familias. Podés habilitar o deshabilitar cada enlace en cualquier momento.
          </p>
        </div>

        {/* DNI Coverage Pill */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center min-w-[170px] shrink-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">
            Cobertura de DNI
          </span>
          <span className="font-['Outfit'] font-black text-3xl mt-1 block">
            {dniLoadedCount} / {students.length}
          </span>
          <span className="text-[11px] font-bold text-emerald-300">
            {dniPercentage}% cargados
          </span>
        </div>
      </div>

      {/* TWO MAIN INTERACTIVE CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: ENLACE PARA CARGAR DNI */}
        <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-200/80 shadow-xl shadow-slate-900/5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    Paso 1: Auto-Carga
                  </span>
                  <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                    Enlace para Cargar DNI
                  </h3>
                </div>
              </div>

              {/* Switch */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  disabled={tutorUpdating}
                  onClick={handleToggleDniRegistration}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 ${
                    classData?.dni_registration_enabled !== false ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span className="sr-only">Habilitar o deshabilitar carga de DNI</span>
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      classData?.dni_registration_enabled !== false ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Enviá este enlace por WhatsApp o proyectá el código QR en clase para que los estudiantes elijan su nombre de la lista y registren su DNI en 1 minuto.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Estado actual:</span>
              {classData?.dni_registration_enabled !== false ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Carga Habilitada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Carga Deshabilitada
                </span>
              )}
            </div>

            {/* Input with Link */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${BASE_URL}/cargar-dni/${classData?.short_code || classData?.id}`}
                  onClick={(e) => e.target.select()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-bold text-slate-800 outline-none select-all"
                />
                <Button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${BASE_URL}/cargar-dni/${classData?.short_code || classData?.id}`);
                    setTutorRegCopied(true);
                    toast("¡Enlace de carga copiado!", "success");
                    setTimeout(() => setTutorRegCopied(false), 2000);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-10 px-3.5 font-bold text-xs shrink-0"
                >
                  {tutorRegCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{tutorRegCopied ? "Copiado" : "Copiar"}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                onClick={() => {
                  const shareLink = `${BASE_URL}/cargar-dni/${classData?.short_code || classData?.id}`;
                  const msg = `Estimados estudiantes y familias de ${classData?.name}:\n\nLes compartimos el siguiente enlace para que cada alumno registre su número de DNI en el sistema y habilitar la consulta de boletines escolares:\n\n🔗 ${shareLink}`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setTutorRegShowQR(!tutorRegShowQR)}
                className="rounded-xl h-10 border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                <span>{tutorRegShowQR ? "Ocultar" : "QR Aula"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(`${BASE_URL}/cargar-dni/${classData?.short_code || classData?.id}`, "_blank")}
                className="rounded-xl h-10 border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Probar</span>
              </Button>
            </div>

            {tutorRegShowQR && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2 animate-in fade-in duration-150">
                <p className="text-[11px] font-bold text-slate-500">QR para proyectar en el aula:</p>
                <div className="inline-block bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                      `${BASE_URL}/cargar-dni/${classData?.short_code || classData?.id}`
                    )}&margin=10`}
                    alt="QR Carga DNI"
                    className="w-40 h-40 mx-auto rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: ENLACE PARA CONSULTAR BOLETÍN */}
        <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-200/80 shadow-xl shadow-slate-900/5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                    Paso 2: Consulta Parental
                  </span>
                  <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                    Enlace Consulta de Boletín
                  </h3>
                </div>
              </div>

              {/* Switch */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  disabled={tutorUpdating}
                  onClick={handleToggleTutorPortal}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 ${
                    classData?.tutor_portal_enabled !== false ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span className="sr-only">Habilitar o deshabilitar consulta de boletín</span>
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      classData?.tutor_portal_enabled !== false ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Enviá este enlace a los tutores para que puedan consultar las calificaciones del 1º y 2º cuatrimestre y las asistencias ingresando su número de DNI.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Estado actual:</span>
              {classData?.tutor_portal_enabled !== false ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Consultas Habilitadas
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Consultas Pausadas
                </span>
              )}
            </div>

            {/* Input with Link */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${BASE_URL}/tutor?c=${classData?.short_code || classData?.id}`}
                  onClick={(e) => e.target.select()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-bold text-slate-800 outline-none select-all"
                />
                <Button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${BASE_URL}/tutor?c=${classData?.short_code || classData?.id}`);
                    setTutorCopied(true);
                    toast("¡Enlace de boletín copiado!", "success");
                    setTimeout(() => setTutorCopied(false), 2000);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-10 px-3.5 font-bold text-xs shrink-0"
                >
                  {tutorCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{tutorCopied ? "Copiado" : "Copiar"}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                onClick={() => {
                  const shareLink = `${BASE_URL}/tutor?c=${classData?.short_code || classData?.id}`;
                  const msg = `Estimadas familias y estudiantes de ${classData?.name}:\n\nLes compartimos el enlace oficial para consultar el boletín de calificaciones y asistencias con su DNI:\n\n🔗 ${shareLink}`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setTutorShowQR(!tutorShowQR)}
                className="rounded-xl h-10 border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                <span>{tutorShowQR ? "Ocultar" : "Código QR"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(`${BASE_URL}/tutor?c=${classData?.short_code || classData?.id}`, "_blank")}
                className="rounded-xl h-10 border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Probar</span>
              </Button>
            </div>

            {tutorShowQR && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2 animate-in fade-in duration-150">
                <p className="text-[11px] font-bold text-slate-500">QR de Consulta de Boletín:</p>
                <div className="inline-block bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                      `${BASE_URL}/tutor?c=${classData?.short_code || classData?.id}`
                    )}&margin=10`}
                    alt="QR Boletín"
                    className="w-40 h-40 mx-auto rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DNI Audit & Quick Edit Table */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-900/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900">
              Nómina de Estudiantes y Verificación de DNI
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Verificá y cargá los números de DNI para asegurar que todas las familias puedan consultar el boletín.
            </p>
          </div>
          <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
            {students.length} Alumnos
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {students.map((st) => {
            const isEditing = editingDniStudentId === st.id;
            const hasDni = Boolean(st.dni && String(st.dni).trim());
            return (
              <div key={st.id} className="py-3.5 flex items-center justify-between gap-4 min-w-[500px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-['Outfit'] font-black flex items-center justify-center text-sm">
                    {getStudentName(st)[0]}
                  </div>
                  <div>
                    <span className="font-['Outfit'] font-bold text-sm text-slate-900 block">
                      {getStudentName(st)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      ID Alumno: {st.public_token?.slice(0, 8) || "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Número de DNI..."
                        value={tempDniInput}
                        onChange={(e) => setTempDniInput(e.target.value)}
                        className="w-36 h-9 px-3 bg-slate-50 border border-blue-500 rounded-xl text-xs font-bold outline-none ring-2 ring-blue-500/20"
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          await updateStudentDni(st.id, tempDniInput.trim());
                          setEditingDniStudentId(null);
                          toast("DNI actualizado correctamente", "success");
                        }}
                        className="h-9 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs"
                      >
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingDniStudentId(null)}
                        className="h-9 px-2 rounded-xl text-slate-400 text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {hasDni ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          DNI: {st.dni}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          Sin DNI cargado
                        </span>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingDniStudentId(st.id);
                          setTempDniInput(st.dni || "");
                        }}
                        className="h-8 px-2.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 font-bold text-xs flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>{hasDni ? "Editar" : "Cargar DNI"}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
