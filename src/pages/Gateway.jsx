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

        <div className="bg-white/90 backdrop-blur-2xl border border-slate-200/80 p-6 md:p-8 rounded-[3rem] shadow-2xl shadow-slate-900/5 space-y-6">
          
          {/* 1. Docentes Access Card */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">1. Para Docentes</span>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-blue-50/80 hover:bg-blue-100/80 border-2 border-blue-200 text-left transition-all group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <UserCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-black text-slate-900 text-base leading-tight">Acceso Docentes</h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">Iniciar sesión o Crear cuenta de profesor</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform mr-1" />
            </button>
          </div>

          {/* 2. Estudiantes Class Code Form */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">2. Para Estudiantes</span>
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Código de Clase (Ej: X7K2P)"
                  className={`w-full h-13 text-center font-['Outfit'] font-extrabold uppercase tracking-widest text-base rounded-2xl ${
                    error ? 'border-2 border-rose-500 shake' : 'border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20'
                  } bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none transition-all`}
                  style={{ animation: error ? 'shake 0.4s ease-in-out' : 'none' }}
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Ingresar a mi Clase <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* 3. Tutor / Familia Access Card */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">3. Para Familias y Tutores</span>
            <button
              type="button"
              onClick={() => navigate("/tutor")}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border-2 border-emerald-200 text-left transition-all group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-black text-slate-900 text-base leading-tight">Portal Familias y Tutores</h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">Consultar boletín escolar por DNI</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform mr-1" />
            </button>
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