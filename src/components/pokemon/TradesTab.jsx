import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Clock, CheckCircle2, XCircle, Trash2, ArrowRight, Gift, Coins, Loader2, Sparkles, User } from "lucide-react";
import { getStudentTrades, handleTradeResponse } from "../../lib/pokemonStore";
import { useAuth } from "../../providers/AuthProvider";

export default function TradesTab() {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('incoming'); // 'incoming', 'outgoing', 'history'

  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user]);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const data = await getStudentTrades(user.id);
      setTrades(data);
    } catch (err) {
      console.error("Error fetching trades:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (trade, status) => {
    try {
      await handleTradeResponse(trade, status);
      alert(`Intercambio ${status === 'accepted' ? 'aceptado' : 'rechazado'} con éxito.`);
      fetchTrades();
    } catch (err) {
      console.error("Error handling trade response:", err);
      alert("Error al procesar la respuesta.");
    }
  };

  const incomingPending = trades.filter(t => t.receiver_id === user.id && t.status === 'pending');
  const outgoingPending = trades.filter(t => t.sender_id === user.id && t.status === 'pending');
  const history = trades.filter(t => t.status !== 'pending');

  const displayedTrades = filter === 'incoming' ? incomingPending : filter === 'outgoing' ? outgoingPending : history;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Cargando intercambios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-8">
      {/* Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { id: 'incoming', label: 'Solicitudes Recibidas', count: incomingPending.length, icon: <ArrowRightLeft className="w-4 h-4" /> },
          { id: 'outgoing', label: 'Mis Ofertas', count: outgoingPending.length, icon: <ArrowRight className="w-4 h-4" /> },
          { id: 'history', label: 'Historial', count: 0, icon: <Clock className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
              filter === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[9px] font-black">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {displayedTrades.length === 0 ? (
        <div className="bg-white rounded-[3rem] py-24 text-center border-2 border-dashed border-slate-100">
           <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-slate-200/20 blur-2xl rounded-full" />
              <ArrowRightLeft className="relative w-16 h-16 text-slate-200 mx-auto" />
           </div>
           <h3 className="text-2xl font-black text-slate-300">No hay movimientos</h3>
           <p className="text-slate-400 mt-2">Aquí aparecerán tus intercambios y regalos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayedTrades.map(trade => (
            <div key={trade.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col md:flex-row items-center gap-8 group">
              
              {/* Type Badge */}
              <div className={`shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-3xl ${
                trade.trade_type === 'gift' ? 'bg-rose-50 text-rose-500' : 
                trade.trade_type === 'sale' ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'
              }`}>
                {trade.trade_type === 'gift' ? <Gift className="w-8 h-8" /> : 
                 trade.trade_type === 'sale' ? <Coins className="w-8 h-8" /> : <ArrowRightLeft className="w-8 h-8" />}
                <span className="text-[9px] font-black uppercase tracking-tighter mt-1">{trade.trade_type}</span>
              </div>

              {/* Sender/Receiver Info */}
              <div className="flex-1 flex items-center gap-6 w-full">
                 <div className="flex-1 text-center md:text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filter === 'incoming' ? 'De' : 'Para'}</p>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                       <User className="w-4 h-4 text-slate-300" />
                       <h4 className="text-lg font-black text-slate-800">{filter === 'incoming' ? trade.sender?.full_name : trade.receiver?.full_name}</h4>
                    </div>
                 </div>

                 <div className="hidden md:block">
                    <ArrowRight className="w-6 h-6 text-slate-200" />
                 </div>

                 {/* Offered Pokemon */}
                 <div className="flex flex-col items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 w-32">
                    <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-sm mb-1">
                       <img src={trade.offered_pokemon?.sprite_url} alt="" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-[10px] font-black text-slate-700 capitalize truncate w-full text-center">{trade.offered_pokemon?.pokemon_name}</p>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nivel {trade.offered_pokemon?.level}</span>
                 </div>

                 {trade.trade_type === 'trade' && (
                   <>
                     <div className="flex items-center justify-center">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                     </div>
                     {/* Requested Pokemon */}
                     <div className="flex flex-col items-center bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 w-32">
                        <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-sm mb-1">
                           <img src={trade.requested_pokemon?.sprite_url} alt="" className="w-full h-full object-contain" />
                        </div>
                        <p className="text-[10px] font-black text-indigo-700 capitalize truncate w-full text-center">{trade.requested_pokemon?.pokemon_name}</p>
                        <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Nivel {trade.requested_pokemon?.level}</span>
                     </div>
                   </>
                 )}

                 {trade.trade_type === 'sale' && (
                   <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100">
                      <Coins className="w-4 h-4 text-amber-500" />
                      <span className="font-black text-amber-700">{trade.coin_price}</span>
                   </div>
                 )}
              </div>

              {/* Actions or Status */}
              <div className="shrink-0 w-full md:w-auto flex items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                 {trade.status === 'pending' ? (
                   filter === 'incoming' ? (
                     <>
                        <button 
                          onClick={() => handleResponse(trade, 'accepted')}
                          className="flex-1 md:w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all hover:scale-110"
                          title="Aceptar"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="md:hidden ml-2 font-bold text-xs">Aceptar</span>
                        </button>
                        <button 
                          onClick={() => handleResponse(trade, 'rejected')}
                          className="flex-1 md:w-12 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 transition-all hover:scale-110"
                          title="Rechazar"
                        >
                          <XCircle className="w-5 h-5" />
                          <span className="md:hidden ml-2 font-bold text-xs">Rechazar</span>
                        </button>
                     </>
                   ) : (
                     <button 
                       onClick={() => handleResponse(trade, 'cancelled')}
                       className="w-full md:w-auto px-6 h-12 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                     >
                       Cancelar Oferta
                     </button>
                   )
                 ) : (
                   <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                     trade.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                   }`}>
                     {trade.status === 'accepted' ? 'Completado' : trade.status === 'rejected' ? 'Rechazado' : 'Cancelado'}
                   </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
