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
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 overflow-hidden relative font-sans theme-gateway">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-float-reverse" />
      </div>

      <div className="max-w-md w-full relative z-10 animate-in slide-up">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] mb-6 shadow-2xl shadow-blue-500/20 ring-1 ring-white/20">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            NOTYX <span className="text-blue-500">EDU</span>
          </h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.2em]">
            Plataforma de Seguimiento Académico
          </p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="label-lg text-slate-500 ml-2">
                Código de Acceso
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Escribe tu código aquí..."
                  className={`input input-lg text-center uppercase tracking-widest ${
                    error ? 'border-red-500/50 shake' : 'border-transparent group-focus-within:border-blue-500/50'
                  } bg-slate-800/50 text-white placeholder:text-slate-600`}
                  style={{ animation: error ? 'shake 0.4s ease-in-out' : 'none' }}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-16 rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 border-none ring-1 ring-white/10"
            >
              INGRESAR <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
            <div className="text-center space-y-2 group cursor-help">
              <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all">
                <UserCircle className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Docentes</p>
            </div>
            <div className="text-center space-y-2 group cursor-help">
              <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-all">
                <BookOpen className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estudiantes</p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
          <Sparkles className="w-3 h-3" /> Potenciado con IA Experimental
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