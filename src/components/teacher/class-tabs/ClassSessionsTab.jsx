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
    <div className="space-y-4 sm:space-y-5">
      {/* Unified Sessions Control Bar */}
      <div className="bg-white/95 backdrop-blur-md p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Left: Cuatrimestre Filter Tabs */}
        <div className="flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 shadow-2xs overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "Año Completo" },
            { id: "1", label: "1º Cuatrimestre" },
            { id: "2", label: "2º Cuatrimestre" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCuatrimestreFilter(tab.id)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center px-2.5 sm:px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                cuatrimestreFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Actions (Student Code Copy, Cuatrimestre Management, New Session) */}
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {classData?.short_code && (
            <button
              type="button"
              onClick={copyClassLink}
              title="Copiar enlace para que los alumnos ingresen"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                copied
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 hover:border-indigo-200"
              }`}
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{copied ? "¡Copiado!" : `Código: ${classData.short_code}`}</span>
            </button>
          )}

          <Button
            onClick={onOpenCuatrimestreModal}
            variant="outline"
            className="rounded-lg h-7 sm:h-8 px-2.5 font-bold border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs shrink-0 gap-1 active:scale-95 transition-all cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Gestión 2ºC</span>
          </Button>

          <Button
            onClick={onCreateSession}
            className="rounded-lg h-7 sm:h-8 px-3 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Sesión</span>
          </Button>
        </div>
      </div>

      {/* Grid of Sessions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Create Session Card */}
        <div
          onClick={onCreateSession}
          className="apple-card border-2 border-dashed border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group min-h-[170px] active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
            <Plus className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-slate-800 text-base">Nueva Sesión</h4>
          <span className="text-xs font-medium text-blue-600 mt-1">
            {activeCuatrimestre === 2 ? "2º Cuatrimestre" : "1º Cuatrimestre"}
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
              className="apple-card rounded-3xl p-5 flex flex-col justify-between group/card relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="absolute top-3.5 right-3.5 flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                <Button
                  onClick={() => onEditSession(s)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl bg-white/90 hover:bg-white border border-slate-200/80 shadow-sm active:scale-95 transition-transform"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-600" />
                </Button>
                <Button
                  onClick={() => onDeleteSession(s.id)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl bg-white/90 hover:bg-rose-50 border border-slate-200/80 shadow-sm active:scale-95 transition-transform"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                </Button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      sCuatrimestre === 2
                        ? "bg-purple-50 text-purple-700 border border-purple-200/60"
                        : "bg-blue-50 text-blue-700 border border-blue-200/60"
                    }`}
                  >
                    {sCuatrimestre}º Cuatrimestre
                  </span>
                  {attPct !== null && (
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ml-auto ${
                        attPct >= 75
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          : "bg-rose-50 text-rose-700 border border-rose-200/60"
                      }`}
                    >
                      {attPct}% pres.
                    </span>
                  )}
                </div>

                <h4 className="font-semibold text-slate-900 text-lg capitalize leading-snug tracking-tight">
                  {format(new Date(s.date + "T12:00:00"), "EEEE d", { locale: es })}
                </h4>
                <p className="text-slate-600 text-xs font-medium capitalize mt-0.5">
                  {format(new Date(s.date + "T12:00:00"), "MMMM yyyy", { locale: es })}
                </p>

                {sessionAtt.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${attPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 shrink-0">
                      {presentCount}/{totalForSession}
                    </span>
                  </div>
                )}
              </div>

              <Link to={`/session/${s.id}`} className="mt-5">
                <Button className="w-full rounded-2xl h-10 font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm active:scale-[0.98] transition-all">
                  Ingresar Notas
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
