import { useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "../ui/button";
import { GraduationCap, Printer, X, CheckCircle2, Award, Heart, Flame, Calendar, Star } from "lucide-react";

export default function StudentReportModal({ student, className, criteria, grades, attendance, onClose }) {
  const printRef = useRef(null);

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
  const isPresent = attendance[csId] !== false;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 relative border border-slate-200 my-8">
        
        {/* Modal Top Bar (Hidden when printing) */}
        <div className="flex items-center justify-between p-6 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-blue-400" />
            <h3 className="font-['Outfit'] font-black text-lg">Boletín e Informe del Alumno</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 font-black text-xs uppercase tracking-wider flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </Button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div ref={printRef} className="p-8 space-y-8 bg-white print:p-0 print:space-y-6">
          
          {/* Header Membrete */}
          <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-['Outfit'] font-black text-xl">
                <GraduationCap className="w-7 h-7" /> NOTYX EDU
              </div>
              <h2 className="text-2xl font-['Outfit'] font-black text-slate-900 mt-2">{studentName}</h2>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
                DNI: {dni} · Materia: <span className="text-slate-900">{className}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Fecha del Informe</span>
              <span className="font-bold text-slate-800 text-sm">{format(new Date(), "d 'de' MMMM yyyy", { locale: es })}</span>
            </div>
          </div>

          {/* Academic Overview Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block">Promedio General</span>
              <span className="font-['Outfit'] font-black text-3xl text-blue-800 mt-1 block">{percentage}%</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">Asistencia</span>
              <span className="font-['Outfit'] font-black text-xl text-emerald-800 mt-2 block flex items-center justify-center gap-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> {isPresent ? "Presente" : "Ausente"}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 block">Puntaje Total</span>
              <span className="font-['Outfit'] font-black text-2xl text-purple-800 mt-1 block">{totalScore} <span className="text-sm text-purple-400">/ {maxTotal}</span></span>
            </div>
          </div>

          {/* Criteria Evaluation Table */}
          <div>
            <h4 className="font-['Outfit'] font-black text-sm uppercase tracking-widest text-slate-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" /> Calificaciones por Criterio
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="text-left px-4 py-3 font-bold border border-slate-200">Criterio de Evaluación</th>
                    <th className="text-center px-4 py-3 font-bold border border-slate-200">Nota Obtenida</th>
                    <th className="text-center px-4 py-3 font-bold border border-slate-200">Puntaje Máximo</th>
                    <th className="text-right px-4 py-3 font-bold border border-slate-200">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {criteriaScores.map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-bold text-slate-800 border border-slate-200">{c.name}</td>
                      <td className="px-4 py-3 text-center font-black text-base border border-slate-200">
                        {c.score !== null ? c.score : "—"}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-500 border border-slate-200">{c.max_score}</td>
                      <td className="px-4 py-3 text-right border border-slate-200">
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

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .fixed { position: absolute; left: 0; top: 0; background: white; width: 100%; height: auto; }
          .fixed * { visibility: visible; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
