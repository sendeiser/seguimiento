import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { GraduationCap, AlertCircle, ArrowLeft } from "lucide-react";

export default function JoinClass() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const redirect = async () => {
      if (!code) return;
      const cleanCode = code.trim();

      try {
        // 1. Check if cleanCode is a class short_code (case-insensitive)
        const { data: classData } = await supabase
          .from("classes")
          .select("public_token")
          .ilike("short_code", cleanCode)
          .maybeSingle();

        if (classData?.public_token) {
          navigate(`/class-live/${classData.public_token}`, { replace: true });
          return;
        }

        // 2. Check if cleanCode is a class public_token directly
        const { data: classByToken } = await supabase
          .from("classes")
          .select("public_token")
          .eq("public_token", cleanCode)
          .maybeSingle();

        if (classByToken?.public_token) {
          navigate(`/class-live/${classByToken.public_token}`, { replace: true });
          return;
        }

        // 3. Check if cleanCode is an individual student public_token
        const { data: studentData } = await supabase
          .from("class_students")
          .select("public_token")
          .eq("public_token", cleanCode)
          .maybeSingle();

        if (studentData?.public_token) {
          navigate(`/live/${studentData.public_token}`, { replace: true });
          return;
        }

        setError("No se encontró ninguna clase o estudiante registrado con ese código.");
      } catch (err) {
        console.error("Error validando código de ingreso:", err);
        setError("Ocurrió un error al validar el código de acceso.");
      }
    };

    redirect();
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-[40px] p-8 md:p-10 shadow-2xl shadow-slate-900/5 border border-slate-200/80 animate-in zoom-in-95 duration-300">
        {!error ? (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[28px] flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-['Outfit'] font-black text-slate-900 tracking-tight">Accediendo a la clase...</h1>
              <p className="text-slate-500 font-medium text-xs mt-1">Validando código de acceso en Notyx Edu</p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-rose-50 rounded-[28px] flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-['Outfit'] font-black text-slate-900 tracking-tight">Código no válido</h1>
              <p className="text-rose-600 font-bold bg-rose-50 py-3 px-4 rounded-2xl border border-rose-200 text-xs mt-3">
                {error}
              </p>
            </div>
            <button 
              onClick={() => navigate("/")}
              className="w-full bg-slate-900 text-white font-black py-3.5 rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al Inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

