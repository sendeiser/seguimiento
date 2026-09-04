import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { GraduationCap, Mail, Lock, ArrowRight, Loader2, UserPlus, Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "../providers/ThemeProvider";
import { useToast } from "../providers/ToastProvider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast("Error: " + error.message, "error");
    else navigate("/home");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-200/40 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-200/40 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative animate-in fade-in zoom-in-95 duration-300">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4 mt-6">
            <div className="relative p-6 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20 inline-flex items-center justify-center">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-['Outfit'] font-black text-slate-900 tracking-tight">
            NOTYX <span className="text-blue-600">EDU</span>
          </h1>
          
          <p className="font-['DM_Sans'] font-bold text-xs mt-2 tracking-[0.2em] uppercase text-slate-400">
            Acceso a la Plataforma
          </p>
        </div>

        {/* Login Card - Glassmorphism */}
        <Card className="rounded-[2.5rem] border border-slate-200/80 shadow-2xl shadow-slate-900/5 bg-white/95 backdrop-blur-2xl overflow-hidden">
          {/* Gradient top bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
          
          <CardHeader className="text-center pt-8 pb-3 px-8">
            <CardTitle className="text-2xl font-['Outfit'] font-black text-slate-900">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="font-medium text-slate-500 text-xs mt-1">
              Ingresá tus credenciales de docente para continuar
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">Correo Electrónico</label>
                  <div className="input-wrapper group">
                    <Mail className="input-icon w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      placeholder="docente@escuela.edu" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="input input-with-icon h-12 text-sm font-bold text-slate-800 bg-slate-50 border-slate-200 focus:border-blue-600 focus:bg-white" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">Contraseña</label>
                  <div className="input-wrapper group">
                    <Lock className="input-icon w-4 h-4 text-slate-400" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      className="input input-with-icon h-12 text-sm font-bold text-slate-800 bg-slate-50 border-slate-200 focus:border-blue-600 focus:bg-white" 
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-13 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-slate-900/10 active:scale-[0.98]">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Ingresar al Sistema</span> <ArrowRight className="w-4 h-4 text-blue-400" /></>}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">¿No tenés cuenta o sos tutor?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                <Link to="/register" className="w-full">
                  <Button variant="secondary" className="w-full h-11 rounded-xl font-black text-xs uppercase tracking-wider gap-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                    <UserPlus className="w-4 h-4 text-blue-600" /> Crear Cuenta
                  </Button>
                </Link>
                <Link to="/tutor" className="w-full">
                  <Button variant="secondary" className="w-full h-11 rounded-xl font-black text-xs uppercase tracking-wider gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                    <GraduationCap className="w-4 h-4 text-emerald-600" /> Portal Tutores
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-blue-500" /> Notyx Edu Plataforma Académica
        </p>
      </div>
    </div>
  );
}