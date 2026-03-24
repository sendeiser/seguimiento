import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { UserPlus, Mail, Lock, ArrowRight, Loader2, ArrowLeft } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          role: 'teacher' // Default role for manual registration
        }
      }
    });
    if (error) alert("Error: " + error.message);
    else {
      alert("¡Registro exitoso! Por favor, revisá tu correo para confirmar la cuenta (opcional según config) e iniciá sesión.");
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/5 blur-[100px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-black text-slate-400 hover:text-blue-600 transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver a Notyx
        </Link>
        
        <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl overflow-hidden group">
          <div className="h-1.5 bg-gradient-to-r from-purple-500 to-blue-600 opacity-60 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="space-y-2 pt-10 pb-6 px-10">
            <div className="bg-purple-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-inner shadow-purple-100">
              <UserPlus className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">Crear Cuenta</CardTitle>
            <CardDescription className="font-bold text-slate-400 text-sm">Registrate como docente para empezar.</CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correo Electrónico</label>
                  <div className="relative group/input">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/input:text-purple-500 transition-colors" />
                    <input
                      type="email"
                      placeholder="ej: prof.gonzalez@colegio.edu"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-50 focus:border-purple-500 focus:bg-white rounded-2xl pl-12 pr-5 py-4 text-base font-bold outline-none transition-all placeholder:text-slate-300 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contraseña</label>
                  <div className="relative group/input">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/input:text-purple-500 transition-colors" />
                    <input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-50 focus:border-purple-500 focus:bg-white rounded-2xl pl-12 pr-5 py-4 text-base font-bold outline-none transition-all placeholder:text-slate-300 shadow-sm"
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
