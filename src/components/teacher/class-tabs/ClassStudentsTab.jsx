import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Search, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";

export default function ClassStudentsTab({
  students,
  houses,
  getStudentName,
  onAddStudent,
  onDeleteStudent,
  updateStudentHouse,
  updateStudentDni,
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
    <div className="space-y-8 animate-in slide-up">
      {/* Top Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input
            placeholder="Nombre del alumno..."
            className="bg-white border border-slate-200 rounded-2xl h-14 px-6 font-bold w-full sm:w-80 outline-none focus:border-blue-400 transition-all"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
          />
          <Button type="submit" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px] w-full sm:w-auto">
            <UserPlus className="w-5 h-5 mr-2" /> Agregar
          </Button>
        </form>
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            placeholder="Buscar en lista..."
            className="bg-white border border-slate-200 rounded-2xl h-14 pl-12 pr-6 font-bold w-full outline-none focus:border-blue-400 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Students List Container */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden min-w-0">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Estudiante</th>
                <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">DNI / Validación</th>
                <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Casa / Escudo</th>
                <th className="px-8 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                        {getStudentName(st)[0]}
                      </div>
                      <div>
                        <span className="font-black text-slate-800 text-base">{getStudentName(st)}</span>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">
                          ID: {st.public_token?.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <input
                      placeholder="DNI del alumno"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs outline-none focus:border-blue-400 w-36"
                      value={st.dni || ""}
                      onChange={(e) => updateStudentDni(st.id, e.target.value)}
                    />
                  </td>
                  <td className="px-8 py-6">
                    <select
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs outline-none focus:border-blue-400"
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
                  <td className="px-8 py-6 text-right space-x-2">
                    <Link to={`/class-live/${st.public_token}`} target="_blank">
                      <Button variant="ghost" size="icon" className="rounded-xl" title="Ver Perfil Público">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      onClick={() => onDeleteStudent(st.id)}
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden grid grid-cols-1 gap-3 p-4 bg-slate-50">
          {filteredStudents.map((st) => (
            <div key={st.id} className="bg-white p-6 rounded-[28px] space-y-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg">
                  {getStudentName(st)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-800 text-lg truncate leading-tight">{getStudentName(st)}</h4>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
                    Token: {st.public_token?.slice(0, 8)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/class-live/${st.public_token}`} target="_blank">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100">
                      <ExternalLink className="w-4 h-4 text-slate-600" />
                    </Button>
                  </Link>
                  <Button
                    onClick={() => onDeleteStudent(st.id)}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-red-50 border border-red-100"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI / Validación</label>
                  <input
                    placeholder="DNI"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 w-full font-bold text-sm outline-none focus:border-blue-400"
                    value={st.dni || ""}
                    onChange={(e) => updateStudentDni(st.id, e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Casa / Escudo</label>
                  <select
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 w-full font-bold text-sm outline-none focus:border-blue-400"
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
          <div className="p-16 text-center text-slate-400 font-bold italic">
            No hay alumnos registrados aún o que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </div>
  );
}
