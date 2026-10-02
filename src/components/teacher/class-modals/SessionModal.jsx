import { Button } from "../../ui/button";

export default function SessionModal({
  isOpen,
  onClose,
  editingSession,
  sessionForm,
  setSessionForm,
  onSaveSession,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] sm:rounded-[40px] w-full max-w-sm p-6 sm:p-8 shadow-2xl animate-in zoom-in duration-300">
        <h3 className="text-2xl font-black text-slate-900 mb-2">
          {editingSession ? "Editar Sesión" : "Nueva Sesión"}
        </h3>
        <p className="text-slate-500 text-sm font-medium mb-8">
          Seleccioná la fecha de la clase.
        </p>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
              Fecha de la Clase
            </label>
            <input
              type="date"
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none transition-all"
              value={sessionForm.date}
              onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
              Cuatrimestre
            </label>
            <select
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none transition-all"
              value={sessionForm.cuatrimestre || 1}
              onChange={(e) => setSessionForm({ ...sessionForm, cuatrimestre: Number(e.target.value) })}
            >
              <option value={1}>1º Cuatrimestre</option>
              <option value={2}>2º Cuatrimestre</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={onSaveSession}
              className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]"
            >
              {editingSession ? "Actualizar Sesión" : "Comenzar Clase"}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-12 rounded-2xl font-black text-slate-400"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
