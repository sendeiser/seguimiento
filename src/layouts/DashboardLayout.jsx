import { useState, memo, useCallback } from "react";
import { Outlet, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { supabase } from "../lib/supabase";
import {
  LogOut, GraduationCap, LayoutDashboard, Sun, Moon, Trophy, ShoppingBag,
  ChevronLeft
} from "lucide-react";
import { useTheme } from "../providers/ThemeProvider";

const NavItem = memo(({ to, icon: Icon, children, collapsed, isActive }) => (
  <Link
    to={to}
    aria-current={isActive ? "page" : undefined}
    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
      ${isActive
        ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-sm"
        : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
      }`}
  >
    <Icon className="w-4 h-4 shrink-0" />
    {!collapsed && <span>{children}</span>}
    {isActive && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-[var(--primary)]" />
    )}
  </Link>
));

const MobileNavItem = memo(({ to, icon: Icon, label, isActive }) => (
  <Link
    to={to}
    aria-current={isActive ? "page" : undefined}
    className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all min-w-0
      ${isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
  >
    <Icon className="w-5 h-5" />
    <span className="text-[10px] font-bold leading-none">{label}</span>
  </Link>
));

export default function DashboardLayout() {
  const { user, profile, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/login");
  }, [navigate]);

  const isTeacher = profile?.role === "teacher";

  const isActive = useCallback((path) => {
    if (path === "/home") return location.pathname === "/home";
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const teacherNav = [
    { label: "Principal", items: [
      { to: "/home", icon: LayoutDashboard, text: "Mis Clases" }
    ]},
  ];

  const studentNav = [
    { label: "Navegación", items: [
      { to: "/home", icon: LayoutDashboard, text: "Dashboard" },
      { to: "/ranking", icon: Trophy, text: "Ranking" },
      { to: "/shop", icon: ShoppingBag, text: "Tienda" },
    ]},
  ];

  const mobileNav = isTeacher
    ? [
        { to: "/home", icon: LayoutDashboard, label: "Clases" },
      ]
    : [
        { to: "/home", icon: LayoutDashboard, label: "Inicio" },
        { to: "/ranking", icon: Trophy, label: "Ranking" },
        { to: "/shop", icon: ShoppingBag, label: "Tienda" },
      ];

  const groups = isTeacher ? teacherNav : studentNav;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Skip link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-white focus:rounded-xl focus:text-sm focus:font-bold">
        Saltar al contenido principal
      </a>

      {/* Desktop Sidebar */}
      <aside aria-label="Navegación principal" className={`fixed inset-y-0 left-0 z-40 bg-[var(--bg-primary)] border-r border-[var(--border)]/50
        flex-col hidden md:flex transition-all duration-300
        ${sidebarCollapsed ? "w-16" : "w-48"}`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2.5 border-b border-[var(--border)]/50 px-4 h-16 shrink-0
          ${sidebarCollapsed ? "justify-center" : ""}`}
        >
          <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] p-2 rounded-xl shadow-md shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="font-black text-[var(--text-primary)] text-sm leading-none tracking-tight">Notyx</p>
              <p className="text-[9px] uppercase font-bold text-[var(--text-muted)] mt-0.5 tracking-widest">Gestión Académica</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.to} to={item.to} icon={item.icon} collapsed={sidebarCollapsed} isActive={isActive(item.to)}>
                    {item.text}
                  </NavItem>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mx-2 mb-2 p-1.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all hidden lg:flex items-center justify-center"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
        </button>

        {/* User */}
        <div className="border-t border-[var(--border)]/50 p-3 bg-[var(--bg-secondary)]/50">
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md">
              {(profile?.full_name || "?")[0].toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-[var(--text-primary)] truncate leading-none mb-0.5">
                    {profile?.full_name || "Usuario"}
                  </p>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {isTeacher ? "Docente" : "Alumno"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={toggleTheme}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all"
                    aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                  >
                    {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={handleLogout}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"
                    aria-label="Cerrar sesión"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-t border-[var(--border)]/50
        flex items-center justify-around h-16 px-2 safe-area-bottom">
        {mobileNav.map((item) => (
          <MobileNavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={isActive(item.to)} />
        ))}
      </nav>

      {/* Top Bar (Mobile) */}
      <header className="md:hidden sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border)]/50 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] p-1.5 rounded-lg shadow-md shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-[var(--text-primary)] tracking-tight text-sm">Notyx</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-all"
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-black text-xs shadow-md">
            {(profile?.full_name || "?")[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" tabIndex="-1" className={`md:pl-48 transition-all duration-300 pb-16 md:pb-0 ${sidebarCollapsed ? "md:pl-16" : ""}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
