import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, BookOpen, UserCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";

export default function Gateway() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCode = code.trim();

    if (cleanCode === "docentes_2026") {
      navigate("/login");
    } else if (cleanCode.length > 0) {
      navigate(`/j/${cleanCode.toUpperCase()}`);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 overflow-hidden relative font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/40 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-md w-full relative z-10 animate-in slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2rem] mb-6 shadow-xl shadow-blue-500/20">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-['Outfit'] font-black text-slate-900 tracking-tight mb-2">
            NOTYX <span className="text-blue-600">EDU</span>
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">
            Plataforma de Seguimiento Académico
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-2xl border border-slate-200/80 p-6 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-900/5">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-2 block">
                Código de Acceso
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Escribe tu código aquí..."
                  className={`w-full h-14 text-center font-['Outfit'] font-extrabold uppercase tracking-widest text-lg rounded-2xl ${
                    error ? 'border-2 border-rose-500 shake' : 'border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20'
                  } bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none transition-all`}
                  style={{ animation: error ? 'shake 0.4s ease-in-out' : 'none' }}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              INGRESAR <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acceso Directo por Rol</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 text-left transition-all group"
              >
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <UserCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 leading-tight">Docentes / Alumnos</p>
                  <p className="text-[9px] font-bold text-slate-500">Iniciar sesión</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/tutor")}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 text-left transition-all group"
              >
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 leading-tight">Portal Tutores</p>
                  <p className="text-[9px] font-bold text-slate-500">Consulta con DNI</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
          <Sparkles className="w-3 h-3 text-blue-500" /> Notyx Edu Plataforma Académica
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .shake { animation: shake 0.4s ease-in-out; }
      `}} />
    </div>
  );
}