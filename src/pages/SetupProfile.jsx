import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useToast } from "../providers/ToastProvider";
import { User, ShieldCheck, ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function SetupProfile() {
  const { user, setProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoading(true);

    const { data: profile, error } = await supabase
      .from("profiles")
      .upsert({ 
        id: user.id, 
        full_name: fullName, 
        role: user.user_metadata?.role || "teacher" 
      })
      .select()
      .single();

    if (error) toast("Error: " + error.message, "error");
    else setProfile(profile);
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-blue-50 w-16 h-16 rounded-[28px] mb-6 shadow-inner ring-4 ring-white">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Casi listo...</h1>
          <p className="text-slate-500 font-medium mt-3">Solo falta completar algunos datos básicos.</p>
        </div>

        <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden group">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pt-10 pb-6 px-10 text-center">
            <CardTitle className="text-2xl font-black text-slate-900">Perfil del Docente</CardTitle>
            <CardDescription className="font-bold text-slate-400 text-sm">¿Cómo te van a ver tus alumnos?</CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                <div className="relative group/input">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Ej: Prof. Ricardo Perez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-500 focus:bg-white rounded-2xl pl-12 pr-5 py-4 text-base font-bold outline-none transition-all placeholder:text-slate-300 shadow-sm shadow-inner"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-2 px-1">Este nombre aparecerá en la parte superior de todas tus planillas compartidas.</p>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 font-bold leading-relaxed">
                  Tu rol ha sido configurado como <span className="underline decoration-blue-300 decoration-2">Docente</span> de forma automática.
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 rounded-2xl shadow-xl shadow-blue-600/20 font-black text-lg gap-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Completar Registro"}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
