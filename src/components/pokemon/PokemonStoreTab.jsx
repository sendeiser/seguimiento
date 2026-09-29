import React, { useEffect, useState, useCallback } from "react";
import { Loader2, Search, Lock, CheckCircle2, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { listPokemon, getPokemonDetails } from "../../lib/pokemonService";
import { getStudentPokemon, addPokemonToStore } from "../../lib/pokemonStore";
import PokemonCard from "./PokemonCard";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { supabase } from "../../lib/supabase";

export default function PokemonStoreTab({ 
  notyxCoins, 
  onBuySuccess, 
  onBuyRequest, 
  ownedPokemonIds, 
  classStudentId,
  isTeacher = false,
  isDark: explicitIsDark
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = explicitIsDark !== undefined ? explicitIsDark : theme === 'dark';

  const [page, setPage] = useState(1);
  const [pokemonList, setPokemonList] = useState([]);
  const [ownedIds, setOwnedIds] = useState(new Set(ownedPokemonIds || []));
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Settings: Enable/Disable & Custom Prices
  const [storeEnabled, setStoreEnabled] = useState(true);
  const [customPrices, setCustomPrices] = useState({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [togglingStore, setTogglingStore] = useState(false);

  const pokemonTypes = [
    { id: 'all', label: 'Todos', icon: '✨' },
    { id: 'fire', label: 'Fuego', icon: '🔥' },
    { id: 'water', label: 'Agua', icon: '💧' },
    { id: 'grass', label: 'Planta', icon: '🍃' },
    { id: 'electric', label: 'Eléctrico', icon: '⚡' },
    { id: 'psychic', label: 'Psíquico', icon: '🔮' },
    { id: 'ice', label: 'Hielo', icon: '❄️' },
    { id: 'dragon', label: 'Dragón', icon: '🐲' },
    { id: 'fighting', label: 'Lucha', icon: '🥊' },
  ];

  // Fetch store settings (status and custom prices)
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("pokemon_settings")
        .select("*")
        .eq("id", "global")
        .single();
      
      if (!error && data) {
        setStoreEnabled(data.store_enabled !== false);
        setCustomPrices(data.custom_prices || {});
        return data;
      }
    } catch (e) {
      console.error("Error fetching pokemon_settings:", e);
    } finally {
      setLoadingSettings(false);
    }
    return null;
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (ownedPokemonIds) {
      setOwnedIds(new Set(ownedPokemonIds));
    } else if (user || classStudentId) {
      fetchOwned();
    }
  }, [user, ownedPokemonIds, classStudentId]);

  useEffect(() => {
    fetchPokemon();
  }, [page, selectedType]);

  const fetchOwned = async () => {
    if (!user && !classStudentId) return;
    try {
      const owned = await getStudentPokemon(user?.id, classStudentId);
      setOwnedIds(new Set(owned.map(o => o.pokemon_id)));
    } catch (e) {
      console.error("Error fetching owned pokemon", e);
    }
  };

  const fetchPokemon = async () => {
    setLoading(true);
    try {
      let results = [];
      if (selectedType === "all") {
        const data = await listPokemon(page, 12);
        results = data.results;
      } else {
        const res = await fetch(`https://pokeapi.co/api/v2/type/${selectedType}`);
        const data = await res.json();
        const start = (page - 1) * 12;
        results = data.pokemon.slice(start, start + 12).map(p => p.pokemon);
      }

      // Fetch fresh settings or use state customPrices
      const currentSettings = await fetchSettings();
      const currentPrices = currentSettings?.custom_prices || customPrices;

      const detailed = await Promise.all(
        results.map(p => getPokemonDetails(p.url))
      );

      const merged = detailed.map(p => {
        const custom = currentPrices[p.id];
        return {
          ...p,
          cost_coins: custom !== undefined ? custom : p.cost_coins,
          isCustomPrice: custom !== undefined
        };
      });

      setPokemonList(merged);
    } catch (e) {
      console.error("Error fetching pokemon list", e);
    }
    setLoading(false);
  };

  // Toggle store enabled / disabled (teachers only)
  const handleToggleStore = async () => {
    if (!isTeacher || togglingStore) return;
    const newStatus = !storeEnabled;
    setTogglingStore(true);
    try {
      const { error } = await supabase
        .from("pokemon_settings")
        .update({ 
          store_enabled: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", "global");

      if (error) throw error;
      setStoreEnabled(newStatus);
      toast(
        newStatus 
          ? "✅ Tienda Pokémon habilitada para todos los alumnos" 
          : "🔒 Tienda Pokémon deshabilitada para los alumnos", 
        "success"
      );
    } catch (e) {
      console.error("Error toggling store status:", e);
      toast("Error al cambiar el estado de la tienda", "error");
    } finally {
      setTogglingStore(false);
    }
  };

  // Update a single Pokemon's price (teachers only)
  const handleUpdatePrice = async (pokemonId, newPrice) => {
    const priceNum = Math.max(0, parseInt(newPrice, 10) || 0);
    const updatedPrices = { ...customPrices, [pokemonId]: priceNum };
    
    // Update local state immediately
    setCustomPrices(updatedPrices);
    setPokemonList(prev => prev.map(p => 
      p.id === pokemonId ? { ...p, cost_coins: priceNum, isCustomPrice: true } : p
    ));

    try {
      const { error } = await supabase
        .from("pokemon_settings")
        .update({ 
          custom_prices: updatedPrices, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", "global");

      if (error) throw error;
      toast("✅ Precio del Pokémon actualizado correctamente", "success");
    } catch (e) {
      console.error("Error updating pokemon price:", e);
      toast("Error al guardar precio en el servidor", "error");
    }
  };

  const handleBuy = async (pokemon) => {
    if (!isTeacher && !storeEnabled) {
      toast("La tienda Pokémon está deshabilitada temporalmente.", "warning");
      return;
    }

    if (notyxCoins < pokemon.cost_coins) {
      toast("No tienes suficientes Notyx Coins.", "warning");
      return;
    }
    
    // In PublicStudentView, handle buy through modal/DNI
    if (!user && onBuyRequest) {
      onBuyRequest(pokemon);
      return;
    }
    
    try {
      await addPokemonToStore(user?.id, pokemon, classStudentId);
      setOwnedIds(prev => new Set(prev).add(pokemon.id));
      toast(`¡Has capturado a ${pokemon.name}!`, "success");
      if (onBuySuccess) onBuySuccess(pokemon.cost_coins);
    } catch (e) {
      console.error(e);
      toast("Hubo un error al guardar el Pokémon.", "error");
    }
  };

  const filteredPokemon = pokemonList.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.original_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 mt-6 animate-in fade-in duration-700">
      {/* Teacher Store Control Banner */}
      {isTeacher && (
        <div 
          className="p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden transition-all border shadow-xl"
          style={{
            background: isDark 
              ? 'linear-gradient(145deg, hsl(220 20% 14% / 0.9), hsl(220 25% 9% / 0.7))' 
              : 'linear-gradient(145deg, #ffffff, #f8fafc)',
            borderColor: isDark ? 'hsl(0 0% 100% / 0.12)' : 'rgba(0,0,0,0.08)',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div 
                className="p-4 rounded-2xl border"
                style={{
                  background: storeEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  borderColor: storeEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
                  color: storeEnabled ? '#10b981' : '#f43f5e'
                }}
              >
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span 
                    className="font-['Outfit'] font-black text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                    style={{
                      background: isDark ? 'hsl(220 20% 22%)' : 'hsl(220 20% 90%)',
                      color: isDark ? '#cbd5e1' : '#475569'
                    }}
                  >
                    Control Docente
                  </span>
                  <span 
                    className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full font-['Outfit'] font-black text-[10px] uppercase tracking-wider ${
                      storeEnabled 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${storeEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    {storeEnabled ? 'Tienda Habilitada' : 'Tienda Deshabilitada'}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-['Outfit'] font-black tracking-tight" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Configuración de la Tienda Pokémon
                </h3>
                <p className="text-xs md:text-sm font-['DM_Sans'] font-medium mt-1" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Habilita o deshabilita la compra de Pokémon para los alumnos y personaliza los precios en cada tarjeta.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={togglingStore}
                onClick={handleToggleStore}
                className={`px-6 py-3.5 rounded-2xl font-['Outfit'] font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 ${
                  storeEnabled 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                }`}
              >
                {togglingStore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : storeEnabled ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{storeEnabled ? 'Deshabilitar Tienda' : 'Habilitar Tienda'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Disabled Screen for Students */}
      {!isTeacher && !storeEnabled ? (
        <div 
          className="py-24 text-center rounded-[3rem] p-8 transition-all border my-6"
          style={{
            background: isDark 
              ? 'linear-gradient(145deg, hsl(220 20% 13% / 0.9), hsl(220 25% 8% / 0.6))' 
              : '#ffffff',
            borderColor: isDark ? 'hsl(0 0% 100% / 0.1)' : '#e2e8f0',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)'
          }}
        >
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-30 bg-rose-500 animate-pulse" />
            <div 
              className="relative w-24 h-24 rounded-3xl flex items-center justify-center border shadow-lg mx-auto"
              style={{
                background: isDark ? 'hsl(220 25% 15%)' : 'hsl(0 100% 97%)',
                borderColor: 'rgba(244,63,94,0.3)'
              }}
            >
              <Lock className="w-10 h-10 text-rose-500" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-['Outfit'] font-black" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
            Tienda Pokémon Deshabilitada
          </h3>
          <p className="font-['DM_Sans'] font-medium mt-3 max-w-md mx-auto text-sm md:text-base leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            El docente ha pausado temporalmente el Centro Pokémon para los estudiantes. ¡Vuelve a consultar más tarde cuando esté habilitado!
          </p>
        </div>
      ) : (
        /* Normal Store Content */
        <>
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl md:text-4xl font-['Outfit'] font-extrabold tracking-tight" style={{ color: isDark ? 'hsl(220 20% 95%)' : 'hsl(220 10% 12%)' }}>
                  Centro Pokémon
                </h2>
                <p className="font-['DM_Sans'] text-sm mt-1" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Desbloquea y colecciona compañeros legendarios con tus Notyx Coins.
                </p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-6">
              <div className="relative group max-w-2xl mx-auto w-full">
                <Search className={`absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  isDark ? 'text-slate-400 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-500'
                }`} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre (ej: Pikachu, Charizard, Gengar...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full h-16 pl-16 pr-8 rounded-[2rem] border-2 outline-none transition-all font-medium shadow-xl ${
                    isDark 
                      ? 'bg-slate-900/60 border-slate-700/60 focus:border-indigo-500/60 text-white placeholder-slate-400 shadow-black/30' 
                      : 'bg-white border-slate-100 focus:border-indigo-500 text-slate-900 shadow-slate-200/20'
                  }`}
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {pokemonTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => { setSelectedType(type.id); setPage(1); }}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${
                      selectedType === type.id 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' 
                        : isDark 
                          ? 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60 border border-slate-700/50' 
                          : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm'
                    }`}
                  >
                    <span>{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Consultando la PokéDex...</p>
            </div>
          ) : (
            <>
              {filteredPokemon.length === 0 ? (
                <div 
                  className={`py-24 text-center rounded-[3rem] border-2 border-dashed ${
                    isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100'
                  }`}
                >
                  <p className="text-slate-400 font-bold">No se encontraron Pokémon que coincidan</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredPokemon.map(p => (
                    <PokemonCard 
                      key={p.id} 
                      pokemon={p} 
                      owned={ownedIds.has(p.id)} 
                      onBuy={() => handleBuy(p)} 
                      isTeacher={isTeacher}
                      onUpdatePrice={handleUpdatePrice}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-center gap-6 mt-12">
                <button 
                  onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  disabled={page === 1}
                  className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs disabled:opacity-30 transition-all shadow-sm cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800/80 border border-slate-700 text-slate-200 hover:bg-slate-700' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Anterior
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Página</span>
                  <span className="text-xl font-black text-indigo-500">{page}</span>
                </div>
                <button 
                  onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-sm cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800/80 border border-slate-700 text-slate-200 hover:bg-slate-700' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
