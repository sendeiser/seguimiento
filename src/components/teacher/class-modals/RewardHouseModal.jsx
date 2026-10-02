import { Button } from "../../ui/button";

export default function RewardHouseModal({
  showRewardModal,
  showHouseModal,
  onClose,
  editingItem,
  modalForm,
  setModalForm,
  handleSaveReward,
  handleSaveHouse,
}) {
  if (!showRewardModal && !showHouseModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] sm:rounded-[40px] w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-black text-slate-900 mb-6">
          {editingItem ? "Editar" : "Crear"} {showRewardModal ? "Premio" : "Casa"}
        </h3>
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
              Nombre
            </label>
            <input
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none transition-all"
              value={modalForm.name}
              onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
            />
          </div>

          {showRewardModal && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                  Costo en Coins
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none"
                  value={modalForm.cost_coins}
                  onChange={(e) => setModalForm({ ...modalForm, cost_coins: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                  Descripción
                </label>
                <textarea
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none"
                  rows={3}
                  value={modalForm.description}
                  onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                  Categoría
                </label>
                <select
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none"
                  value={modalForm.category}
                  onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                >
                  <option value="item">Objeto Físico / Ventaja</option>
                  <option value="game_pass">Pase de Juego (Temporal)</option>
                </select>
              </div>
              {modalForm.category === "game_pass" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                      🎮 Pase de Juego Temporal
                    </p>
                    <p className="text-xs text-emerald-600 font-medium mt-0.5">
                      El alumno podrá jugar durante el tiempo indicado
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                        Juego a Desbloquear
                      </label>
                      <select
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none"
                        value={modalForm.game_name || "Sudoku"}
                        onChange={(e) => setModalForm({ ...modalForm, game_name: e.target.value })}
                      >
                        <option value="Sudoku">🧩 Sudoku</option>
                        <option value="Pyramid">🔺 Pirámide Numérica</option>
                        <option value="Memory Match">🃏 Memory Match</option>
                        <option value="Math Blitz">⚡ Math Blitz</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                        Duración (minutos)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold focus:border-blue-500 outline-none"
                        value={modalForm.duration_minutes || 60}
                        onChange={(e) => setModalForm({ ...modalForm, duration_minutes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                Icono (Emoji)
              </label>
              <input
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold text-center text-2xl"
                value={modalForm.icon}
                onChange={(e) => setModalForm({ ...modalForm, icon: e.target.value })}
              />
            </div>
            {showHouseModal && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                  Color
                </label>
                <input
                  type="color"
                  className="w-full h-[60px] bg-slate-50 border-2 border-transparent rounded-2xl p-2"
                  value={modalForm.color}
                  onChange={(e) => setModalForm({ ...modalForm, color: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6">
            <Button
              onClick={showRewardModal ? handleSaveReward : handleSaveHouse}
              className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]"
            >
              Guardar Cambios
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 h-14 rounded-2xl font-black text-slate-400"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
