import { Outlet, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { supabase } from "../lib/supabase";
import { LogOut, GraduationCap, LayoutDashboard, Trophy, ShoppingBag, Sun, Moon } from "lucide-react";
import { useTheme } from "../providers/ThemeProvider";

export default function DashboardLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isTeacher = profile?.role === "teacher";

  const homePath = isTeacher ? "/teacher/dashboard" : "/student/dashboard";
  const isActive = (paths) => paths.some(p => location.pathname.startsWith(p));

  const dockItems = [
    { path: homePath, icon: LayoutDashboard, label: isTeacher ? "Mis Clases" : "Mis Materias", paths: [homePath, "/teacher/class", "/teacher/session"] },
  ];

  if (!isTeacher) {
    dockItems.push(
      { path: "/student/ranking", icon: Trophy, label: "Ranking", paths: ["/student/ranking"] },
      { path: "/student/shop", icon: ShoppingBag, label: "Tienda", paths: ["/student/shop"] },
    );
  }

  const bottomNavItems = [
    { path: homePath, icon: LayoutDashboard, label: "Home", paths: [homePath, "/student/class"] },
  ];

  if (!isTeacher) {
    bottomNavItems.push(
      { path: "/student/ranking", icon: Trophy, label: "Rank", paths: ["/student/ranking"] },
      { path: "/student/shop", icon: ShoppingBag, label: "Shop", paths: ["/student/shop"] },
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app-gradient), hsl(var(--color-bg-primary))" }}>
      {/* Desktop Dock */}
      <aside className="fixed inset-y-0 left-0 dock z-40 hidden md:flex flex-col">
        <div className="dock-section flex flex-col gap-0.5 px-1">
          <div className="flex items-center gap-2.5 p-5 border-b border-[hsla(220,15%,80%,0.06)]">
            <div className="bg-gradient-to-br from-[hsl(262,83%,60%)] to-[hsl(262,70%,50%)] p-2 rounded-xl shadow-lg">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div className="dock-label">
              <p className="font-black text-[var(--text-primary)] text-sm leading-none tracking-tight">Notyx</p>
              <p className="text-[9px] uppercase font-bold text-[var(--text-muted)] mt-1 tracking-widest">Gestión Académica</p>
            </div>
          </div>
        </div>

        <div className="dock-section flex-1 flex flex-col gap-0.5 px-1 py-3">
          {dockItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`dock-item ${isActive(item.paths) ? "active" : ""}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="dock-label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="dock-section px-1 py-3">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="user-avatar w-9 h-9 text-xs">
              {(profile?.full_name || "?")[0].toUpperCase()}
            </div>
            <div className="dock-label min-w-0 flex-1">
              <p className="text-sm font-black text-[var(--text-primary)] truncate leading-none mb-1">{profile?.full_name || "Usuario"}</p>
              <span className="inline-block px-2 py-0.5 rounded-full bg-[hsla(0,0%,100%,0.06)] text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                {isTeacher ? "Docente" : "Alumno"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 px-4 mt-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[hsla(0,0%,100%,0.06)] transition-all border border-transparent hover:border-[hsla(0,0%,100%,0.08)]"
              title="Cambiar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[hsl(0,85%,60%)] hover:bg-[hsla(0,80%,50%,0.1)] transition-all border border-transparent hover:border-[hsla(0,80%,50%,0.2)]"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 flex h-14 items-center justify-between px-4" style={{ background: "hsla(220,15%,8%,0.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid hsla(220,15%,80%,0.08)" }}>
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-[hsl(262,83%,60%)] to-[hsl(262,70%,50%)] p-1.5 rounded-lg shadow-lg">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-[var(--text-primary)] tracking-tight text-sm">Notyx</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[hsla(0,0%,100%,0.06)] transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[hsl(262,83%,60%)] to-[hsl(262,70%,50%)] text-white flex items-center justify-center font-black text-xs shadow-lg border border-white/20">
            {(profile?.full_name || "?")[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:pl-16 transition-all min-h-screen pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 lg:p-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden bottom-nav">
        {bottomNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item ${isActive(item.paths) ? "active" : ""}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}