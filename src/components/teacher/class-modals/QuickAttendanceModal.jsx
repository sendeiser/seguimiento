import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  X,
  CheckCircle2,
  ShieldAlert,
  MessageSquareQuote,
  Check,
} from "lucide-react";
import { Button } from "../../ui/button";

export default function QuickAttendanceModal({
  modalData,
  onClose,
  onSave,
  savingQuickAtt,
  getStudentName,
}) {
  const [currentStatus, setCurrentStatus] = useState("present");
  const [obsText, setObsText] = useState("");

  useEffect(() => {
    if (modalData) {
      setCurrentStatus(modalData.currentStatus || "present");
      setObsText(modalData.observation || "");
    }
  }, [modalData]);

  if (!modalData) return null;

  const { student, session } = modalData;

  const handleStatusSave = () => {
    onSave(session.id, student.id, currentStatus, obsText);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 sm:p-7 space-y-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-['Outfit'] font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              {getStudentName(student)[0]}
            </div>
            <div>
              <h3 className="text-lg font-['Outfit'] font-black text-slate-900 leading-tight">
                {getStudentName(student)}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Clase:{" "}
                  {(() => {
                    const [y, m, d] = session.date.split("-");
                    const dObj = new Date(y, m - 1, d);
                    return format(dObj, "d 'de' MMMM, yyyy", { locale: es });
                  })()}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700">
                  {session.cuatrimestre || 1}º Cuat.
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Selection Cards */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
            Estado de Asistencia
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                key: "present",
                label: "Presente (P)",
                desc: "Asistió a clase",
                borderActive:
                  "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm shadow-emerald-500/10",
                badge: "bg-emerald-600 text-white",
                icon: CheckCircle2,
              },
              {
                key: "late",
                label: "Tarde (T)",
                desc: "Llegó con demora",
                borderActive:
                  "border-amber-500 bg-amber-50/80 text-amber-900 shadow-sm shadow-amber-500/10",
                badge: "bg-amber-600 text-white",
                icon: Clock,
              },
              {
                key: "justified",
                label: "Justificado (J)",
                desc: "Falta justificada",
                borderActive:
                  "border-purple-500 bg-purple-50/80 text-purple-900 shadow-sm shadow-purple-500/10",
                badge: "bg-purple-600 text-white",
                icon: ShieldAlert,
              },
              {
                key: "absent",
                label: "Ausente (A)",
                desc: "No asistió",
                borderActive:
                  "border-rose-500 bg-rose-50/80 text-rose-900 shadow-sm shadow-rose-500/10",
                badge: "bg-rose-600 text-white",
                icon: X,
              },
            ].map((s) => {
              const isSelected = currentStatus === s.key;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setCurrentStatus(s.key)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? s.borderActive
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-['Outfit'] font-black text-xs">{s.label}</span>
                    <Icon className={`w-4 h-4 ${isSelected ? "opacity-100" : "opacity-40"}`} />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pedagogical Observations */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-500" />
              Observación Pedagógica (Opcional)
            </label>
            {obsText && (
              <button
                type="button"
                onClick={() => setObsText("")}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600"
              >
                Borrar nota
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Esta observación aparecerá en el informe descargable/imprimible del alumno para esta fecha:
          </p>

          {/* Quick Preset Tags */}
          <div className="flex flex-wrap gap-1.5">
            {[
              "💡 Gran participación",
              "⭐ Trabajo destacado",
              "📋 Tarea incompleta",
              "⏳ Llegó tarde",
              "💬 Conversa en clase",
              "🩺 Retiro temprano",
              "🎯 Buen desempeño",
              "⚠️ Requiere refuerzo",
            ].map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setObsText((prev) => (prev ? `${prev}. ${tag}` : tag))}
                className="text-[11px] font-bold bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-xl transition-all"
              >
                {tag}
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={obsText}
            onChange={(e) => setObsText(e.target.value)}
            placeholder="Escribe notas sobre participación, conducta, tareas o motivos de inasistencia..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={savingQuickAtt}
            className="rounded-xl h-11 px-5 font-bold text-slate-500 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleStatusSave}
            disabled={savingQuickAtt}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-['Outfit'] font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            {savingQuickAtt ? (
              "Guardando..."
            ) : (
              <>
                <Check className="w-4 h-4" /> Guardar Asistencia
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
