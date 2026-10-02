import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { CalendarPlus, Plus, Pencil, Trash2, Link as LinkIcon, Copy, Check } from "lucide-react";
import { Button } from "../../ui/button";

export default function ClassSessionsTab({
  classData,
  sessions,
  students,
  allAttendance,
  activeCuatrimestre,
  cuatrimestreFilter,
  setCuatrimestreFilter,
  onCreateSession,
  onEditSession,
  onDeleteSession,
  onOpenCuatrimestreModal,
  copyClassLink,
  copied,
}) {
  const filteredSessions = sessions.filter((s) => {
    if (cuatrimestreFilter === "all") return true;
    const sCuatrimestre = s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1);
    return sCuatrimestre === Number(cuatrimestreFilter);
  });

  return (
    <div className="space-y-6">
      {/* Student Link Share Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white overflow-hidden relative shadow-2xl shadow-blue-600/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-xl border border-white/20">
              <LinkIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="font-black text-xl leading-none mb-1">Acceso de Estudiantes</p>
              <p className="text-blue-100/80 text-sm mb-4 font-medium italic">Compartí este código para que se unan</p>
              <span className="bg-white/10 border border-white/20 px-6 py-3 rounded-2xl text-3xl font-black tracking-[0.3em] uppercase">
                {classData?.short_code || "..."}
              </span>
            </div>
          </div>
          <Button onClick={copyClassLink} className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 rounded-2xl font-black shadow-xl">
            {copied ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
            {copied ? "¡Copiado!" : "Copiar Enlace"}
          </Button>
        </div>
      </div>

      {/* Cuatrimestre Filter & Management Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0">Filtrar:</span>
          <button
            type="button"
            onClick={() => setCuatrimestreFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              cuatrimestreFilter === "all"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Año Completo
          </button>
          <button
            type="button"
            onClick={() => setCuatrimestreFilter("1")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              cuatrimestreFilter === "1"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            1º Cuatrimestre
          </button>
          <button
            type="button"
            onClick={() => setCuatrimestreFilter("2")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              cuatrimestreFilter === "2"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            2º Cuatrimestre
          </button>
        </div>

        <Button
          onClick={onOpenCuatrimestreModal}
          variant="outline"
          className="rounded-2xl h-11 px-5 font-bold border-2 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs w-full sm:w-auto shrink-0 gap-2"
        >
          <CalendarPlus className="w-4 h-4 text-blue-600" />
          Gestión / Resetear 2ºC
        </Button>
      </div>

      {/* Grid of Sessions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          onClick={onCreateSession}
          className="border-2 border-dashed border-slate-200 rounded-[28px] p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all bg-white group min-h-[160px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <h4 className="font-black text-slate-800 text-base">Nueva Sesión</h4>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">
            ({activeCuatrimestre === 2 ? "2º Cuatrimestre" : "1º Cuatrimestre"})
          </span>
        </div>

        {filteredSessions.map((s) => {
          const sCuatrimestre = s.cuatrimestre || (new Date(s.date).getMonth() >= 6 ? 2 : 1);
          // Calculate attendance stats for this session
          const sessionAtt = allAttendance.filter((a) => a.session_id === s.id);
          const presentCount = sessionAtt.filter((a) => {
            if (a.is_present === false) return false;
            return (a.status || "present") === "present" || a.status === "late";
          }).length;
          const totalForSession = students.length;
          const attPct = totalForSession > 0 ? Math.round((presentCount / totalForSession) * 100) : null;

          return (
            <div
              key={s.id}
              className="bg-white rounded-[28px] border border-slate-100 p-5 flex flex-col hover:shadow-xl hover:-translate-y-0.5 transition-all group/card relative overflow-hidden"
            >
              <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-all">
                <Button
                  onClick={() => onEditSession(s)}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg bg-slate-50 hover:bg-white border border-slate-100 shadow-sm"
                >
                  <Pencil className="w-3 h-3 text-slate-500" />
                </Button>
                <Button
                  onClick={() => onDeleteSession(s.id)}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg bg-red-50 hover:bg-white border border-red-100 shadow-sm"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    sCuatrimestre === 2 ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {sCuatrimestre}º C
                </span>
                {attPct !== null && (
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ml-auto ${
                      attPct >= 75 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {attPct}% pres.
                  </span>
                )}
              </div>

              <h4 className="font-black text-slate-900 text-lg capitalize leading-tight">
                {format(new Date(s.date + "T12:00:00"), "EEEE d", { locale: es })}
              </h4>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">
                {format(new Date(s.date + "T12:00:00"), "MMM yyyy", { locale: es })}
              </p>

              {sessionAtt.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${attPct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">
                    {presentCount}/{totalForSession}
                  </span>
                </div>
              )}

              <Link to={`/session/${s.id}`} className="mt-4">
                <Button className="w-full rounded-xl h-10 font-black uppercase text-[10px]">Ingresar Notas</Button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
