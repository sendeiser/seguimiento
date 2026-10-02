import { CalendarPlus, X } from "lucide-react";
import { Button } from "../../ui/button";

export default function CuatrimestreModal({
  isOpen,
  onClose,
  activeCuatrimestre,
  setActiveCuatrimestre,
  handleResetCuatrimestreGrades,
  toast,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal max-w-xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="modal-close">
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <CalendarPlus className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            Gestión de Cuatrimestres y Notas
          </h3>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Configurá el cuatrimestre activo o reiniciá las notas cargadas para el nuevo periodo.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Cuatrimestre Activo para Nuevas Sesiones
              </span>
              <span className="text-xs font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-xl">
                {activeCuatrimestre}º Cuatrimestre
              </span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  setActiveCuatrimestre(1);
                  toast("1º Cuatrimestre configurado como activo", "info");
                }}
                variant={activeCuatrimestre === 1 ? "default" : "outline"}
                className="flex-1 rounded-xl font-bold text-xs"
              >
                1º Cuatrimestre
              </Button>
              <Button
                onClick={() => {
                  setActiveCuatrimestre(2);
                  toast("¡2º Cuatrimestre activado para nuevas sesiones!", "success");
                }}
                variant={activeCuatrimestre === 2 ? "default" : "outline"}
                className="flex-1 rounded-xl font-bold text-xs"
              >
                2º Cuatrimestre
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Acciones de Reinicio de Notas
            </h4>

            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-black text-slate-900 text-sm">Resetear Notas del 2º Cuatrimestre</p>
                <p className="text-slate-500 text-xs font-medium">
                  Borra las notas registradas en el 2ºC para empezar de cero. Mantiene el 1ºC intacto.
                </p>
              </div>
              <Button
                onClick={() => handleResetCuatrimestreGrades(2)}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 px-5 font-black text-xs shrink-0"
              >
                Resetear 2ºC
              </Button>
            </div>

            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-black text-red-900 text-sm">Resetear Notas del 1º Cuatrimestre</p>
                <p className="text-red-600/70 text-xs font-medium">
                  Borra únicamente las notas cargadas durante el 1er Cuatrimestre.
                </p>
              </div>
              <Button
                onClick={() => handleResetCuatrimestreGrades(1)}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-100 rounded-xl h-11 px-5 font-black text-xs shrink-0"
              >
                Resetear 1ºC
              </Button>
            </div>
          </div>

          <div className="pt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full h-12 rounded-2xl font-bold text-slate-400"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
