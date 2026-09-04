import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, ArrowRight, Sparkles, UserCircle, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";

export default function Gateway() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCode = code.trim();

    if (cleanCode.toLowerCase() === "docentes_2026") {
      navigate("/login");
    } else if (cleanCode.length > 0) {
      navigate(`/j/${encodeURIComponent(cleanCode)}`);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 overflow-hidden relative font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-200/40 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-200/40 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-md w-full relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2rem] mb-4 shadow-xl shadow-blue-500/20">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-['Outfit'] font-black text-slate-900 tracking-tight">
            NOTYX <span className="text-blue-600">EDU</span>
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">
            Plataforma de Seguimiento Académico
          </p>
        </div>

        {/* Central Card */}
        <div className="bg-white/90 backdrop-blur-2xl border border-slate-200/80 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/5 space-y-6">
          
          <div className="text-center space-y-1">
            <h2 className="font-['Outfit'] font-black text-xl text-slate-900">Código de Acceso</h2>
            <p className="text-slate-500 text-xs font-medium">
              Ingresá tu código de clase o alumno para ingresar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="EJ: X7K2P"
                className={`w-full h-14 text-center font-['Outfit'] font-black uppercase tracking-widest text-lg rounded-2xl ${
                  error 
                    ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900' 
                    : 'border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 bg-slate-50 text-slate-900'
                } placeholder:text-slate-400 outline-none transition-all`}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full h-13 rounded-2xl font-black text-xs uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Ingresar a la Clase <ArrowRight className="w-4 h-4 text-blue-400" />
            </Button>
          </form>

          {/* Quick Links Section */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
              Accesos Directos por Rol
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 text-blue-900 text-xs font-black transition-all shadow-sm active:scale-[0.97]"
              >
                <UserCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Docentes</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/tutor")}
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-900 text-xs font-black transition-all shadow-sm active:scale-[0.97]"
              >
                <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tutores</span>
              </button>
            </div>
          </div>

        </div>

        <p className="mt-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-blue-500" /> Notyx Edu Plataforma Académica
        </p>

      </div>
    </div>
  );
}