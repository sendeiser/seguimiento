import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "../ui/button";
import { 
  GraduationCap, Printer, X, CheckCircle2, Award, 
  MessageSquareQuote, Pencil, Check, Clock, AlertCircle, FileText,
  Maximize2, Minimize2
} from "lucide-react";

export default function StudentReportModal({ 
  student, 
  className, 
  criteria, 
  grades, 
  attendance = {}, 
  observation: initialObservation = "", 
  onSaveObservation = null,
  onClose 
}) {
  const printRef = useRef(null);
  const [observation, setObservation] = useState(initialObservation || "");
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [obsInput, setObsInput] = useState(initialObservation || "");
  const [savingObs, setSavingObs] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(true);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!student) return null;

  const studentName = student.profiles?.full_name || student.student_name || student.name || "Sin nombre";
  const dni = student.dni || "No registrado";
  const csId = student.cs_id || student.id;

  // Calculate totals and percentages
  let totalScore = 0;
  let maxTotal = 0;

  const criteriaScores = (criteria || []).map(c => {
    const key = `${csId}_${c.id}`;
    const scoreVal = grades[key];
    const num = scoreVal !== undefined && scoreVal !== "" && scoreVal !== null ? parseFloat(scoreVal) : null;
    if (num !== null) {
      totalScore += num;
      maxTotal += Number(c.max_score || 10);
    }
    return { ...c, score: num };
  });

  const percentage = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;
  
  // Attendance calculation
  const attRecord = attendance[csId];
  let attStatus = "present";
  let isPresent = true;
  if (typeof attRecord === "string") {
    attStatus = attRecord;
    isPresent = attRecord === "present" || attRecord === "late";
  } else if (typeof attRecord === "object" && attRecord !== null) {
    attStatus = attRecord.status || (attRecord.is_present ? "present" : "absent");
    isPresent = attRecord.is_present ?? (attStatus === "present" || attStatus === "late");
  } else if (attRecord === false) {
    attStatus = "absent";
    isPresent = false;
  }

  const attConfig = {
    present: { label: "Presente", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: CheckCircle2 },
    late: { label: "Tarde", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", icon: Clock },
    justified: { label: "Justificado", bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200", icon: AlertCircle },
    absent: { label: "Ausente", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", icon: X },
  };
  const currentAtt = attConfig[attStatus] || attConfig.present;
  const AttIcon = currentAtt.icon;

  const quickTags = [
    "💡 Gran participación en clase",
    "⭐ Trabajo destacado",
    "🤝 Excelente compañerismo",
    "📋 Tarea incompleta",
    "⚠️ Falta de entrega / materiales",
    "🩺 Retiro por motivos de salud",
    "🎯 Superó los objetivos planteados",
    "🔍 Requiere apoyo y refuerzo en el tema"
  ];

  const handleSaveObs = async () => {
    setSavingObs(true);
    if (onSaveObservation) {
      await onSaveObservation(csId, obsInput.trim());
    }
    setObservation(obsInput.trim());
    setIsEditingObs(false);
    setSavingObs(false);
  };

  const handleAddTag = (tag) => {
    setObsInput(prev => prev ? `${prev}. ${tag}` : tag);
  };

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div 
      className={`fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex flex-col ${
        isFullScreen ? "w-screen h-screen" : "items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      }`}
    >
      <div 
        className={`bg-white transition-all duration-200 shadow-2xl flex flex-col border border-slate-200 ${
          isFullScreen 
            ? "w-full h-full rounded-none border-none" 
            : "w-full max-w-5xl h-[94vh] rounded-2xl md:rounded-3xl overflow-hidden my-auto"
        }`}
      >
        {/* Sticky Top Toolbar (Never cuts off, hidden when printing) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 text-white shrink-0 print:hidden border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-['Outfit'] font-black text-sm sm:text-base text-white truncate leading-tight">
                Boletín e Informe del Alumno
              </h3>
              <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                {studentName} · {className}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Fullscreen toggle button */}
            <button
              type="button"
              onClick={() => setIsFullScreen(prev => !prev)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-700/60"
              title={isFullScreen ? "Restaurar ventana" : "Pantalla completa"}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Ventana</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Pantalla Completa</span>
                </>
              )}
            </button>

            {/* Print / Export button */}
            <Button 
              onClick={handlePrint} 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-3.5 sm:px-4 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-blue-600/30"
            >
              <Printer className="w-4 h-4" /> 
              <span className="hidden sm:inline">Imprimir / PDF</span>
              <span className="sm:hidden">Imprimir</span>
            </Button>

            {/* Close button */}
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Canvas */}
        <div className="flex-1 overflow-y-auto bg-slate-100/70 p-3 sm:p-6 md:p-10 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          
          {/* Printable Sheet (Standard A4 document presentation) */}
          <div 
            id="printable-student-report"
            ref={printRef} 
            className="w-full max-w-4xl bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-10 md:p-12 space-y-8 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full"
          >
            {/* Header Membrete */}
            <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-blue-600 font-['Outfit'] font-black text-xl tracking-tight">
                  <GraduationCap className="w-7 h-7" /> NOTYX EDU
                </div>
                <h2 className="text-2xl sm:text-3xl font-['Outfit'] font-black text-slate-900 mt-2">
                  {studentName}
                </h2>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
                  DNI: <span className="text-slate-800 font-black">{dni}</span> · Materia: <span className="text-slate-900 font-black">{className}</span>
                </p>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  Fecha del Informe
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {format(new Date(), "d 'de' MMMM yyyy", { locale: es })}
                </span>
              </div>
            </div>

            {/* Academic Overview Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block">
                  Promedio General
                </span>
                <span className="font-['Outfit'] font-black text-3xl sm:text-4xl text-blue-800 mt-1 block">
                  {percentage}%
                </span>
              </div>
              <div className={`p-5 rounded-2xl ${currentAtt.bg} border ${currentAtt.border} text-center`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${currentAtt.text} block`}>
                  Asistencia de Clase
                </span>
                <span className={`font-['Outfit'] font-black text-xl sm:text-2xl ${currentAtt.text} mt-2 block flex items-center justify-center gap-2`}>
                  <AttIcon className="w-6 h-6" /> {currentAtt.label}
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 block">
                  Puntaje Total
                </span>
                <span className="font-['Outfit'] font-black text-2xl sm:text-3xl text-purple-800 mt-1 block">
                  {totalScore} <span className="text-sm text-purple-400">/ {maxTotal}</span>
                </span>
              </div>
            </div>

            {/* Criteria Evaluation Table */}
            <div>
              <h4 className="font-['Outfit'] font-black text-sm uppercase tracking-widest text-slate-900 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" /> Calificaciones por Criterio
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="text-left px-4 py-3 font-bold border-b border-slate-200">Criterio de Evaluación</th>
                      <th className="text-center px-4 py-3 font-bold border-b border-slate-200">Nota Obtenida</th>
                      <th className="text-center px-4 py-3 font-bold border-b border-slate-200">Puntaje Máximo</th>
                      <th className="text-right px-4 py-3 font-bold border-b border-slate-200">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criteriaScores.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3.5 font-bold text-slate-800">{c.name}</td>
                        <td className="px-4 py-3.5 text-center font-black text-base">
                          {c.score !== null ? c.score : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-500">{c.max_score}</td>
                        <td className="px-4 py-3.5 text-right">
                          {c.score !== null ? (
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${
                              c.score / c.max_score >= 0.7 
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                                : c.score / c.max_score >= 0.4
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : "bg-rose-50 text-rose-900 border-rose-300"
                            }`}>
                              {c.score / c.max_score >= 0.7 ? "Excelente" : c.score / c.max_score >= 0.4 ? "Regular" : "Reforzar"}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold text-xs">Pendiente</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Teacher's Pedagogical Observation Section */}
            {(observation || isEditingObs || onSaveObservation) && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-['Outfit'] font-black text-sm uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <MessageSquareQuote className="w-4 h-4 text-indigo-600" /> Observaciones Pedagógicas de la Clase
                  </h4>
                  {onSaveObservation && !isEditingObs && (
                    <button 
                      onClick={() => { setObsInput(observation); setIsEditingObs(true); }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 print:hidden"
                    >
                      <Pencil className="w-3.5 h-3.5" /> {observation ? "Editar observación" : "Agregar observación"}
                    </button>
                  )}
                </div>

                {isEditingObs ? (
                  <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-3 print:hidden">
                    <p className="text-xs text-slate-500 font-medium">
                      Escribí un comentario u observación cualitativa sobre el alumno en esta clase:
                    </p>
                    
                    {/* Quick tag chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {quickTags.map((tag, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddTag(tag)}
                          className="text-[11px] font-bold bg-white text-indigo-700 hover:bg-indigo-100/70 border border-indigo-200/60 px-2.5 py-1 rounded-xl transition-all shadow-2xs"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={obsInput}
                      onChange={(e) => setObsInput(e.target.value)}
                      placeholder="Ej: Excelente predisposición y participación durante la clase práctica..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setIsEditingObs(false)}
                        disabled={savingObs}
                        className="rounded-xl h-9 px-4 text-xs font-bold"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveObs}
                        disabled={savingObs}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                      >
                        {savingObs ? "Guardando..." : <><Check className="w-3.5 h-3.5" /> Guardar</>}
                      </Button>
                    </div>
                  </div>
                ) : observation ? (
                  <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-slate-800 text-sm leading-relaxed relative">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <p className="italic font-medium text-slate-700">
                        "{observation}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-200 text-center print:hidden">
                    <p className="text-xs text-slate-400 font-medium italic">
                      Sin observaciones registradas para esta clase.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer Signature Box */}
            <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row gap-6 sm:gap-0 justify-between items-center sm:items-end">
              <div className="text-center w-full sm:w-48">
                <div className="border-b border-slate-400 mb-2 h-10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Firma del Docente</span>
              </div>
              <div className="text-center w-full sm:w-48">
                <div className="border-b border-slate-400 mb-2 h-10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Firma Padre / Tutor</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body {
            visibility: hidden !important;
            background: white !important;
          }
          #printable-student-report, #printable-student-report * {
            visibility: visible !important;
          }
          #printable-student-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 1.5cm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
