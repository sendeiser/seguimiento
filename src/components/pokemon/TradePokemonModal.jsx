import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Gift, Coins, Search, User, ChevronRight, AlertCircle, Sparkles, BookOpen } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { proposeTrade } from "../../lib/pokemonStore";
import { useToast } from "../../providers/ToastProvider";

export default function TradePokemonModal({ isOpen, onClose, offeredPokemon, currentStudentId, currentClassStudentId }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [tradeType, setTradeType] = useState('trade'); // 'trade', 'gift', 'sale'
  const [requestedPokemon, setRequestedPokemon] = useState(null);
  const [targetPokemonList, setTargetPokemonList] = useState([]);
  const [coinPrice, setCoinPrice] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen && currentStudentId) {
      fetchStudents();
    } else {
      // Reset state
      setSelectedStudent(null);
      setRequestedPokemon(null);
      setTargetPokemonList([]);
      setCoinPrice(0);
    }
  }, [isOpen, currentStudentId]);

  useEffect(() => {
    if (selectedStudent) {
      fetchTargetPokemon(selectedStudent.student_id);
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("role", "student")
        .neq("id", currentStudentId);

      if (error) throw error;
      
      const unique = data.map(s => ({
        student_id: s.id,
        student_name: s.full_name || "Compañero",
        avatar_url: s.avatar_url
      }));
      
      setStudents(unique);
    } catch (err) {
      console.error("Error fetching students for trade:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargetPokemon = async (studentId, csId = null) => {
    try {
      let query = supabase.from("student_pokemon_store").select("*");
      
      if (studentId && csId) {
        query = query.or(`student_id.eq.${studentId},class_student_id.eq.${csId}`);
      } else if (studentId) {
        query = query.eq("student_id", studentId);
      } else if (csId) {
        query = query.eq("class_student_id", csId);
      } else {
        setTargetPokemonList([]);
        return;
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTargetPokemonList(data);
    } catch (err) {
      console.error("Error fetching target pokemon:", err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudent) return;
    if (tradeType === 'trade' && !requestedPokemon) {
        toast("Debes seleccionar un Pokémon para pedir a cambio.", "warning");
        return;
    }
    if (tradeType === 'sale' && coinPrice <= 0) {
        toast("Debes ingresar un precio en monedas.", "warning");
        return;
    }

    setLoading(true);
    try {
      await proposeTrade({
        sender_id: currentStudentId,
        receiver_id: selectedStudent.student_id,
        offered_instance_id: offeredPokemon.instanceId || offeredPokemon.id,
        requested_instance_id: requestedPokemon?.id || null,
        coin_price: tradeType === 'sale' ? coinPrice : 0,
        trade_type: tradeType,
        status: 'pending'
      });
      toast("¡Propuesta de intercambio enviada con éxito!", "success");
      onClose();
    } catch (err) {
      console.error("Error proposing trade:", err);
      toast("Hubo un error al enviar la propuesta.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !offeredPokemon) return null;

  const filteredStudents = students.filter(s => 
    s.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
              <ArrowRightLeft className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Proponer Intercambio</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Negocia con tus compañeros</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200/50 rounded-2xl transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Your Pokemon Summary */}
          <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50 flex items-center gap-6">
             <div className="w-20 h-20 bg-white rounded-2xl p-2 shadow-sm border border-indigo-100">
                <img src={offeredPokemon.sprite || offeredPokemon.sprite_url} alt={offeredPokemon.pokemon_name} className="w-full h-full object-contain" />
             </div>
             <div className="flex-1">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Estás ofreciendo</span>
                <h3 className="text-xl font-black text-slate-800 capitalize">{offeredPokemon.pokemon_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-indigo-100">Nivel {offeredPokemon.level || 1}</span>
                </div>
             </div>
          </div>

          {/* Trade Type Selector */}
          <div className="grid grid-cols-3 gap-3">
             {[
               { id: 'trade', label: 'Trueque', icon: <ArrowRightLeft className="w-4 h-4" />, color: 'indigo' },
               { id: 'gift', label: 'Regalo', icon: <Gift className="w-4 h-4" />, color: 'rose' },
               { id: 'sale', label: 'Venta', icon: <Coins className="w-4 h-4" />, color: 'amber' }
             ].map(type => (
               <button
                 key={type.id}
                 onClick={() => {
                    setTradeType(type.id);
                    setRequestedPokemon(null);
                 }}
                 className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                   tradeType === type.id 
                    ? `bg-${type.color}-50 border-${type.color}-500 text-${type.color}-700 shadow-md` 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                 }`}
               >
                 {type.icon}
                 <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
               </button>
             ))}
          </div>

          {!selectedStudent ? (
            /* Step 1: Select Student */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800">¿Con quién quieres negociar?</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar compañero..." 
                    className="pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-xs outline-none focus:ring-2 ring-indigo-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {filteredStudents.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 italic text-sm">No se encontraron compañeros</div>
                ) : (
                  filteredStudents.map(student => (
                    <button
                      key={student.student_id}
                      onClick={() => setSelectedStudent(student)}
                      className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                          {student.avatar_url ? (
                            <img src={student.avatar_url} alt={student.student_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                               <User className="w-5 h-5 text-indigo-400" />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{student.student_name}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400" />
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Trade Details */
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                        {selectedStudent.avatar_url ? (
                           <img src={selectedStudent.avatar_url} alt={selectedStudent.student_name} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center bg-slate-100">
                              <User className="w-5 h-5 text-slate-400" />
                           </div>
                        )}
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Negociando con</p>
                        <p className="font-bold text-slate-800">{selectedStudent.student_name}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="text-xs font-bold text-indigo-600 hover:underline">Cambiar</button>
               </div>

               {tradeType === 'trade' && (
                 <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-800">¿Qué Pokémon quieres pedir?</h3>
                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                       {targetPokemonList.length === 0 ? (
                         <div className="col-span-2 py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Este compañero no tiene Pokémon</p>
                         </div>
                       ) : (
                         targetPokemonList.map(p => (
                           <button
                             key={p.id}
                             onClick={() => setRequestedPokemon(p)}
                             className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                               requestedPokemon?.id === p.id 
                                ? 'bg-indigo-50 border-indigo-500 shadow-md' 
                                : 'bg-white border-slate-100 hover:border-slate-200'
                             }`}
                           >
                             <div className="w-12 h-12 bg-slate-50 rounded-xl p-1 shrink-0">
                                <img src={p.sprite_url || p.sprite} alt={p.pokemon_name} className="w-full h-full object-contain" />
                             </div>
                             <div className="text-left overflow-hidden">
                                <p className="font-black text-slate-700 capitalize text-xs truncate">{p.pokemon_name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nivel {p.level || 1}</p>
                             </div>
                           </button>
                         ))
                       )}
                    </div>
                 </div>
               )}

               {tradeType === 'sale' && (
                 <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-800">¿A cuánto lo vendes?</h3>
                    <div className="relative">
                       <Coins className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-amber-500" />
                       <input 
                         type="number" 
                         className="w-full h-16 pl-16 pr-8 bg-slate-50 rounded-3xl text-2xl font-black text-slate-800 outline-none focus:ring-4 ring-amber-500/10 border-2 border-slate-100 focus:border-amber-400 transition-all"
                         placeholder="0"
                         value={coinPrice}
                         onChange={(e) => setCoinPrice(parseInt(e.target.value) || 0)}
                       />
                       <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-amber-600 text-sm tracking-widest">COINS</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium px-2">El compañero deberá aceptar y pagar este monto para recibir el Pokémon.</p>
                 </div>
               )}

               {tradeType === 'gift' && (
                 <div className="py-12 text-center bg-rose-50 rounded-[2.5rem] border-2 border-dashed border-rose-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-200">
                       <Gift className="w-8 h-8 text-rose-500" />
                    </div>
                    <h4 className="text-xl font-black text-rose-700">Regalo Generoso</h4>
                    <p className="text-sm text-rose-600/60 max-w-xs mx-auto mt-2 font-medium">Vas a enviar este Pokémon de forma gratuita. ¡Un gesto digno de un maestro!</p>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-100">
           <button
             disabled={!selectedStudent || loading || (tradeType === 'trade' && !requestedPokemon)}
             onClick={handleSubmit}
             className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
           >
             {loading ? (
               <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
               <>
                 <Sparkles className="w-5 h-5" />
                 Enviar Propuesta
               </>
             )}
           </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
