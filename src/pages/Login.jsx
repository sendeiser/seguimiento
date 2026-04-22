import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { GraduationCap, Mail, Lock, ArrowRight, Loader2, UserPlus, Sun, Moon } from "lucide-react";
import { useTheme } from "../providers/ThemeProvider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error: " + error.message);
    else navigate("/home");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[100px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/5 blur-[100px] rounded-full animate-float-reverse" />
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md animate-in slide-up">
        <div className="text-center mb-8 relative">
          <div className="absolute top-0 left-0">
            <Link to="/">
              <Button variant="ghost" size="sm" className="rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] border-transparent">
                Volver al inicio
              </Button>
            </Link>
          </div>
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-[1.5rem] shadow-2xl shadow-blue-600/20 mb-6 border border-white/20 mt-12">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">Notyx</h1>
          <p className="text-[var(--text-secondary)] font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Progreso en Tiempo Real</p>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 bg-[var(--bg-primary)]/80 backdrop-blur-xl overflow-hidden group">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="space-y-2 pt-10 pb-6 px-10 text-center">
            <CardTitle className="text-2xl font-black text-[var(--text-primary)]">Bienvenido de nuevo</CardTitle>
            <CardDescription className="font-bold text-[var(--text-secondary)]">Gestioná tus clases con un solo clic.</CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="label">Email Institucional</label>
                  <div className="input-wrapper group">
                    <Mail className="input-icon w-5 h-5" />
                    <input
                      type="email"
                      placeholder="nombre@colegio.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input input-with-icon"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="label">Contraseña</label>
                  <div className="input-wrapper group">
                    <Lock className="input-icon w-5 h-5" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input input-with-icon"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl shadow-xl shadow-blue-600/20 font-black text-lg gap-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sesión"}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-[var(--border)] flex flex-col items-center gap-4">
              <p className="text-sm font-bold text-[var(--text-secondary)]">¿Sos docente y no tenés cuenta?</p>
              <Link to="/register" className="w-full">
                <Button variant="outline" className="w-full h-12 rounded-2xl font-black gap-2 hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                  <UserPlus className="w-4 h-4" /> Registrarse como docente
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-[var(--text-secondary)] text-xs font-bold leading-relaxed px-10">
          Uso exclusivo para instituciones educativas. Si sos alumno, solicitá el link a tu docente.
        </p>
      </div>
    </div>
  );
}