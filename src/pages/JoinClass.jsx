import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { GraduationCap, AlertCircle } from "lucide-react";

export default function JoinClass() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const redirect = async () => {
      if (!code) return;
      
      const { data, error } = await supabase
        .from("classes")
        .select("public_token")
        .eq("short_code", code.toUpperCase())
        .single();

      if (error || !data) {
        setError("No se encontró ninguna clase con ese código.");
      } else {
        navigate(`/class-live/${data.public_token}`, { replace: true });
      }
    };

    redirect();
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl shadow-slate-900/5 border border-gray-100 animate-in zoom-in-95 duration-500">
        {!error ? (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-600/20 animate-bounce transition-all duration-1000">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Uniendo a la clase...</h1>
            <p className="text-gray-500 font-medium tracking-tight">Estamos validando el código de acceso.</p>
            <div className="flex justify-center gap-2 pt-4">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-red-100">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">¡Ups!</h1>
            <p className="text-red-500 font-bold bg-red-50 py-3 px-6 rounded-2xl border border-red-100">{error}</p>
            <button 
              onClick={() => navigate("/")}
              className="mt-8 w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
            >
              Volver al Inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
