import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { UserPlus, Mail, Lock, ArrowRight, Loader2, ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "../providers/ThemeProvider";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'teacher'
        }
      }
    });
    if (error) alert("Error: " + error.message);
    else {
      alert("¡Registro exitoso! Por favor, revisá tu correo para confirmar la cuenta (opcional según config) e iniciá sesión.");
      navigate("/home");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[100px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/5 blur-[100px] rounded-full animate-float-reverse" />
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md animate-in slide-up">
        <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-[var(--text-secondary)] hover:text-blue-600 transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al inicio
        </Link>

        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 bg-[var(--bg-primary)]/80 backdrop-blur-xl overflow-hidden group">
          <div className="h-1.5 bg-gradient-to-r from-purple-500 to-blue-600 opacity-60 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="space-y-2 pt-10 pb-6 px-10">
            <div className="bg-purple-50 dark:bg-purple-900/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Crear Cuenta</CardTitle>
            <CardDescription className="font-bold text-[var(--text-secondary)]">Registrate como docente para empezar.</CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="label">Correo Electrónico</label>
                  <div className="input-wrapper group">
                    <Mail className="input-icon w-5 h-5" />
                    <input
                      type="email"
                      placeholder="ej: prof.gonzalez@colegio.edu"
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
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
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
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-700 shadow-xl shadow-purple-600/20 font-black text-lg gap-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Registrarme"}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}