import { useState } from "react";
import {
  ShoppingBag,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Coins as LucideCoins,
  ShoppingCart,
  CheckCircle2,
  Save,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "../../ui/button";
import { RewardIcon, getSkinByName } from "../../../lib/skinThemes";

export default function ClassGamificationTab({
  rewards,
  houses,
  purchases,
  skinRewards,
  skinPriceDrafts,
  setSkinPriceDrafts,
  savingSkinId,
  savingAllSkins,
  onOpenCreateReward,
  onEditReward,
  onDeleteReward,
  onOpenCreateHouse,
  onEditHouse,
  onDeleteHouse,
  handleUpdatePurchaseStatus,
  handleUpdateSkinPrice,
  handleSaveAllSkinPrices,
}) {
  const [gamificationSubTab, setGamificationSubTab] = useState("items"); // "items" | "skins"
  const [skinSearchTerm, setSkinSearchTerm] = useState("");
  const [skinSortFilter, setSkinSortFilter] = useState("all"); // "all" | "cheapest" | "expensive" | "modified"

  const modifiedCount = skinRewards.filter(
    (s) =>
      skinPriceDrafts[s.id] !== undefined &&
      parseInt(skinPriceDrafts[s.id], 10) !== s.cost_coins
  ).length;

  const filteredSkins = skinRewards
    .filter((s) => s.name.toLowerCase().includes(skinSearchTerm.toLowerCase()))
    .sort((a, b) => {
      if (skinSortFilter === "cheapest") return a.cost_coins - b.cost_coins;
      if (skinSortFilter === "expensive") return b.cost_coins - a.cost_coins;
      if (skinSortFilter === "modified") {
        const aM = parseInt(skinPriceDrafts[a.id], 10) !== a.cost_coins;
        const bM = parseInt(skinPriceDrafts[b.id], 10) !== b.cost_coins;
        return (bM ? 1 : 0) - (aM ? 1 : 0);
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-8">
      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/50">
        <button
          type="button"
          onClick={() => setGamificationSubTab("items")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black tracking-tight transition-all ${
            gamificationSubTab === "items"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Items & Casas
        </button>
        <button
          type="button"
          onClick={() => setGamificationSubTab("skins")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black tracking-tight transition-all ${
            gamificationSubTab === "skins"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles className="w-4 h-4" /> Skins de Tarjetas
          {modifiedCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* ---- SUB-TAB: ITEMS & CASAS ---- */}
      {gamificationSubTab === "items" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Rewards Management */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tienda Notyx</h3>
              <Button
                onClick={onOpenCreateReward}
                className="rounded-2xl bg-orange-500 hover:bg-orange-600 h-10 px-5 gap-2 font-black text-[10px] uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" /> Crear Premio
              </Button>
            </div>
            <div className="grid gap-3">
              {rewards.map((r) => (
                <div
                  key={r.id}
                  className={`bg-white rounded-3xl p-5 border flex items-center justify-between hover:shadow-lg transition-all group ${
                    r.category === "game_pass"
                      ? "border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white"
                      : "border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                        r.category === "game_pass"
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-slate-50 border-slate-100"
                      }`}
                    >
                      <RewardIcon
                        reward={r}
                        name={r.name}
                        icon={r.icon}
                        className="w-6 h-6 text-slate-700"
                        textClassName="text-2xl"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-black text-slate-800 leading-none">{r.name}</h4>
                        {r.category === "game_pass" && (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                            🎮 Pase de Juego
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium">
                        {r.category === "game_pass" && r.metadata?.game_name
                          ? `${r.metadata.game_name} · ${r.metadata.duration_minutes || 60} min`
                          : r.description || "Sin descripción"}
                      </p>
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                        <LucideCoins className="w-3 h-3" /> {r.cost_coins} Coins
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <Button onClick={() => onEditReward(r)} variant="ghost" size="icon" className="rounded-xl">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => onDeleteReward(r.id)}
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {rewards.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-bold italic">No hay premios creados.</p>
              )}
            </div>

            {/* Pending Purchases Section */}
            <div className="pt-10 space-y-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-emerald-500" />
                Compras Pendientes
              </h3>
              <div className="space-y-3">
                {purchases
                  .filter((p) => p.status === "pending")
                  .map((p) => (
                    <div
                      key={p.id}
                      className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 flex items-center justify-between animate-in zoom-in duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-emerald-200">
                          <RewardIcon
                            reward={p.rewards}
                            name={p.rewards?.name}
                            icon={p.rewards?.icon}
                            className="w-5 h-5 text-emerald-600"
                            textClassName="text-xl"
                          />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 leading-none mb-1">{p.profiles?.full_name}</h4>
                          <p className="text-xs text-emerald-700 font-medium">
                            Compró: <span className="font-black uppercase tracking-tight">{p.rewards?.name}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdatePurchaseStatus(p.id, "delivered")}
                          className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Entregar
                        </Button>
                        <Button
                          onClick={() => handleUpdatePurchaseStatus(p.id, "cancelled")}
                          variant="ghost"
                          className="text-red-500 hover:bg-red-100 rounded-xl h-10 font-black text-[10px] uppercase tracking-widest"
                        >
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  ))}
                {purchases.filter((p) => p.status === "pending").length === 0 && (
                  <div className="bg-slate-50 rounded-3xl p-8 text-center border border-dashed border-slate-200">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 font-bold italic text-sm">No hay compras por entregar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* House Management */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Casas y Escudos</h3>
              <Button
                onClick={onOpenCreateHouse}
                className="rounded-2xl bg-blue-600 hover:bg-blue-700 h-10 px-5 gap-2 font-black text-[10px] uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" /> Nueva Casa
              </Button>
            </div>
            <div className="grid gap-6">
              {houses.map((h) => (
                <div
                  key={h.id}
                  className="bg-white rounded-[40px] p-8 border border-slate-100 hover:shadow-2xl transition-all relative group overflow-hidden"
                >
                  <div
                    className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl pointer-events-none"
                    style={{ backgroundColor: h.color }}
                  />
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="text-4xl w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center border-2 border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
                        {h.icon}
                      </div>
                      <div>
                        <h4 className="font-black text-2xl text-slate-800">{h.name}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: h.color }} />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Identificador de Casa
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <Button onClick={() => onEditHouse(h)} variant="outline" size="icon" className="rounded-xl">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => onDeleteHouse(h.id)}
                        variant="outline"
                        size="icon"
                        className="rounded-xl text-red-400 hover:text-red-600 border-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {houses.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-bold italic">No hay casas registradas.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- SUB-TAB: SKINS DE TARJETAS ---- */}
      {gamificationSubTab === "skins" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-200 bg-white/10 px-3 py-0.5 rounded-full">
                    Bazar Global
                  </span>
                  <h2 className="text-2xl font-black tracking-tight mt-1">Precios de Skins</h2>
                  <p className="text-violet-200 text-sm font-medium mt-0.5">
                    {skinRewards.length} skins disponibles ·{" "}
                    {modifiedCount > 0 ? `${modifiedCount} cambios pendientes` : "Sin cambios pendientes"}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSaveAllSkinPrices}
                disabled={savingAllSkins || modifiedCount === 0}
                className="bg-white text-violet-700 hover:bg-violet-50 rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 shadow-lg"
              >
                {savingAllSkins ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Todo ({modifiedCount})
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar skin..."
                value={skinSearchTerm}
                onChange={(e) => setSkinSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
              {[
                { id: "all", label: "Todas" },
                { id: "cheapest", label: "Más baratas" },
                { id: "expensive", label: "Más caras" },
                { id: "modified", label: "Modificadas" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSkinSortFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-tight transition-all ${
                    skinSortFilter === opt.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Skin Grid */}
          {filteredSkins.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-bold italic">No se encontraron skins.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSkins.map((skin) => {
                const currentDraft = skinPriceDrafts[skin.id] ?? skin.cost_coins;
                const isDirty = parseInt(currentDraft, 10) !== skin.cost_coins;
                const isSaving = savingSkinId === skin.id;
                const skinTheme = getSkinByName(skin.name);

                return (
                  <div
                    key={skin.id}
                    className={`bg-white rounded-3xl border overflow-hidden transition-all hover:shadow-xl group ${
                      isDirty ? "border-violet-300 shadow-violet-100 shadow-md" : "border-slate-100"
                    }`}
                  >
                    {/* Skin Preview */}
                    <div
                      className="h-28 relative flex items-center justify-center overflow-hidden"
                      style={{
                        background: skinTheme
                          ? `linear-gradient(135deg, ${skinTheme.bg?.dark || "#1e1b4b"}, ${skinTheme.bg?.light || "#3b1f6e"})`
                          : "linear-gradient(135deg, #1e293b, #334155)",
                      }}
                    >
                      <div className="absolute inset-0 opacity-10">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute rounded-full"
                            style={{
                              width: `${20 + i * 15}px`,
                              height: `${20 + i * 15}px`,
                              background: skinTheme?.accent || "rgba(255,255,255,0.3)",
                              top: `${(i * 37) % 100}%`,
                              left: `${(i * 53) % 100}%`,
                              transform: "translate(-50%,-50%)",
                            }}
                          />
                        ))}
                      </div>
                      <div className="relative z-10 text-center">
                        <p className="text-white font-black text-sm tracking-tight drop-shadow">{skin.name}</p>
                        {skinTheme?.icon && (
                          <skinTheme.icon
                            className="w-6 h-6 mx-auto mt-1 opacity-70"
                            style={{ color: skinTheme.accent || "#fff" }}
                          />
                        )}
                      </div>
                      {isDirty && (
                        <div className="absolute top-2 right-2 bg-violet-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                          Editado
                        </div>
                      )}
                    </div>

                    {/* Price Editor */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Precio actual
                        </span>
                        <span className="text-xs font-black text-slate-600 flex items-center gap-1">
                          <LucideCoins className="w-3 h-3 text-amber-500" /> {skin.cost_coins}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <LucideCoins className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500" />
                          <input
                            type="number"
                            min={0}
                            value={currentDraft}
                            onChange={(e) =>
                              setSkinPriceDrafts((prev) => ({ ...prev, [skin.id]: e.target.value }))
                            }
                            className={`w-full pl-8 pr-2 py-2 rounded-xl border text-sm font-black text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                              isDirty
                                ? "border-violet-300 bg-violet-50 focus:ring-violet-300"
                                : "border-slate-200 bg-slate-50 focus:ring-violet-200"
                            }`}
                          />
                        </div>
                        <Button
                          onClick={() => handleUpdateSkinPrice(skin.id)}
                          disabled={!isDirty || isSaving}
                          size="icon"
                          className={`rounded-xl w-9 h-9 flex-shrink-0 transition-all ${
                            isDirty
                              ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md"
                              : "bg-slate-100 text-slate-300"
                          }`}
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
