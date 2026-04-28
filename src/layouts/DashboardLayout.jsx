import { useState } from "react";
import { Outlet, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { supabase } from "../lib/supabase";
import { LogOut, GraduationCap, LayoutDashboard, Menu, X, Sun, Moon, Trophy, ShoppingBag } from "lucide-react";
import { useTheme } from "../providers/ThemeProvider";

export default function DashboardLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isTeacher = profile?.role === "teacher";

  const closeMenu = () => setIsMobileMenuOpen(false);

  const NavContent = () => (
    <>
      <div className="p-5 md:p-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2 md:p-2.5 rounded-xl shadow-md shadow-blue-600/20">
            <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-[var(--text-primary)] text-sm md:text-base leading-none tracking-tight">Notyx</p>
            <p className="text-[9px] md:text-[10px] uppercase font-bold text-[var(--text-muted)] mt-1 tracking-widest">Gestión Académica</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        <Link
          to="/home"
          onClick={closeMenu}
          className={`nav-item ${location.pathname === "/home" || location.pathname === "/" ? "active" : ""}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          {isTeacher ? "Mis Clases" : "Mis Materias"}
        </Link>
        {!isTeacher && (
          <>
            <Link
              to="/ranking"
              onClick={closeMenu}
              className={`nav-item ${location.pathname === "/ranking" ? "active" : ""}`}
            >
              <Trophy className="w-4 h-4" />
              Ranking Global
            </Link>
            <Link
              to="/shop"
              onClick={closeMenu}
              className={`nav-item ${location.pathname === "/shop" ? "active" : ""}`}
            >
              <ShoppingBag className="w-4 h-4" />
              Tienda Notyx
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]/50">
        <div className="flex items-center gap-3 px-2">
          <div className="user-avatar">
            {(profile?.full_name || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[var(--text-primary)] truncate leading-none mb-1">{profile?.full_name || "Usuario"}</p>
            <div className="inline-block px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
              {isTeacher ? "Docente" : "Alumno"}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all border border-transparent hover:border-[var(--border)]"
              title="Cambiar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-[var(--bg-primary)] border-r border-[var(--border)]/50 shadow-[1px_0_10px_rgba(0,0,0,0.02)] flex-col z-40 hidden md:flex">
        <NavContent />
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={closeMenu}
        >
          <div
            className="absolute inset-y-0 left-0 w-72 bg-[var(--bg-primary)] flex flex-col shadow-2xl animate-in slide-in-from-left"
            onClick={e => e.stopPropagation()}
          >
            <NavContent />
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <header className="md:hidden z-50 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border)]/50 shadow-sm px-4">
        <div className="flex h-16 items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-1.5 rounded-lg shadow-md shadow-blue-600/20">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-[var(--text-primary)] tracking-tight">Notyx</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md border border-white/20">
              {(profile?.full_name || "?")[0].toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:pl-64 transition-all overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-10 lg:p-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
}