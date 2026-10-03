import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Search, ExternalLink, Trash2, Clock } from "lucide-react";
import { Button } from "../../ui/button";

export default function ClassStudentsTab({
  students,
  houses,
  getStudentName,
  onAddStudent,
  onDeleteStudent,
  updateStudentHouse,
  updateStudentDni,
  onOpenTempEnrollModal,
  tempEnrollInfo,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [newStudentName, setNewStudentName] = useState("");

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    await onAddStudent(newStudentName.trim());
    setNewStudentName("");
  };

  const filteredStudents = students.filter((st) =>
    getStudentName(st).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in slide-up">
      {/* Active Temporary Enrollment Banner */}
      {tempEnrollInfo?.isActive && (
        <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="min-w-0 text-xs sm:text-sm">
              <span className="font-bold">Inscripción activa por enlace temporal:</span>{" "}
              <span className="text-emerald-800">Los alumnos pueden sumarse desde su celular por única vez.</span>
            </div>
          </div>
          {onOpenTempEnrollModal && (
            <Button
              type="button"
              onClick={onOpenTempEnrollModal}
              className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
            >
              Ver Enlace / QR
            </Button>
          )}
        </div>
      )}

      {/* Top Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input
            placeholder="Nombre del alumno..."
            className="bg-white/90 border border-slate-200/80 rounded-2xl h-12 px-5 font-medium text-sm w-full sm:w-80 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all placeholder:text-slate-400"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
          />
          <Button
            type="submit"
            className="rounded-2xl h-12 px-6 font-semibold text-sm w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 active:scale-[0.98] transition-all"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Agregar
          </Button>
        </form>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {onOpenTempEnrollModal && (
            <Button
              type="button"
              onClick={onOpenTempEnrollModal}
              variant="outline"
              className={`rounded-2xl h-12 px-4 font-semibold text-xs sm:text-sm flex items-center gap-2 border transition-all shadow-2xs cursor-pointer w-full sm:w-auto justify-center ${
                tempEnrollInfo?.isActive
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                  : "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700"
              }`}
            >
              <Clock className={`w-4 h-4 ${tempEnrollInfo?.isActive ? "text-emerald-600" : "text-indigo-600"}`} />
              <span>Link Auto-Inscripción</span>
              {tempEnrollInfo?.isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse" />
              )}
            </Button>
          )}

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar en lista..."
              className="bg-white/90 border border-slate-200/80 rounded-2xl h-12 pl-11 pr-5 font-medium text-sm w-full outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Students List Container */}
      <div className="apple-card rounded-3xl overflow-hidden min-w-0">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/70">
                <th className="px-6 py-4 font-semibold text-xs text-slate-500">Estudiante</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500">DNI / Validación</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500">Casa / Escudo</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {filteredStudents.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200/40 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm">
                        {getStudentName(st)[0]}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 text-sm block leading-tight">{getStudentName(st)}</span>
                        <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">
                          ID: {st.public_token?.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      placeholder="DNI del alumno"
                      className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 font-medium text-xs outline-none focus:border-blue-500 focus:bg-white w-36 transition-all"
                      value={st.dni || ""}
                      onChange={(e) => updateStudentDni(st.id, e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 font-medium text-xs outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                      value={st.house_id || ""}
                      onChange={(e) => updateStudentHouse(st.id, e.target.value)}
                    >
                      <option value="">Sin Casa</option>
                      {houses.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.icon} {h.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1.5">
                    <Link to={`/class-live/${st.public_token}`} target="_blank">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-8 w-8 hover:bg-slate-100 active:scale-95 transition-transform"
                        title="Ver Perfil Público"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                      </Button>
                    </Link>
                    <Button
                      onClick={() => onDeleteStudent(st.id)}
                      variant="ghost"
                      size="icon"
                      className="rounded-xl h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-transform"
                      title="Eliminar Estudiante"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden grid grid-cols-1 gap-3 p-4 bg-slate-50/50">
          {filteredStudents.map((st) => (
            <div key={st.id} className="bg-white p-5 rounded-2xl space-y-3.5 shadow-sm border border-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200/40 text-blue-600 flex items-center justify-center font-bold text-base shadow-sm">
                  {getStudentName(st)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 text-base truncate leading-tight">{getStudentName(st)}</h4>
                  <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                    Token: {st.public_token?.slice(0, 8)}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Link to={`/class-live/${st.public_token}`} target="_blank">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200/80 active:scale-95">
                      <ExternalLink className="w-4 h-4 text-slate-600" />
                    </Button>
                  </Link>
                  <Button
                    onClick={() => onDeleteStudent(st.id)}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 ml-1">DNI / Validación</label>
                  <input
                    placeholder="DNI"
                    className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 h-10 w-full font-medium text-xs outline-none focus:border-blue-500 focus:bg-white"
                    value={st.dni || ""}
                    onChange={(e) => updateStudentDni(st.id, e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Casa / Escudo</label>
                  <select
                    className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 h-10 w-full font-medium text-xs outline-none focus:border-blue-500 focus:bg-white"
                    value={st.house_id || ""}
                    onChange={(e) => updateStudentHouse(st.id, e.target.value)}
                  >
                    <option value="">Sin Casa</option>
                    {houses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.icon} {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="p-16 text-center text-slate-500 font-medium text-sm">
            No hay alumnos registrados aún o que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </div>
  );
}
