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
    className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-semibold tracking-tight transition-all duration-200 active:scale-[0.98]
      ${isActive
        ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-xs"
        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
      }`}
  >
    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-800"}`} />
    {!collapsed && <span>{children}</span>}
  </Link>
));

const MobileNavItem = memo(({ to, icon: Icon, label, isActive }) => (
  <Link
    to={to}
    aria-current={isActive ? "page" : undefined}
    className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 min-w-0
      ${isActive ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800 font-medium"}`}
  >
    <Icon className="w-5 h-5" />
    <span className="text-[11px] tracking-tight leading-none">{label}</span>
  </Link>
));

export default function DashboardLayout() {
  const { user, profile, loading } = useAuth();
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
      { to: "/home", icon: LayoutDashboard, text: "Mis Clases" },
      { to: "/shop", icon: ShoppingBag, text: "Bazar / Tienda" }
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
        { to: "/shop", icon: ShoppingBag, label: "Bazar" },
      ]
    : [
        { to: "/home", icon: LayoutDashboard, label: "Inicio" },
        { to: "/ranking", icon: Trophy, label: "Ranking" },
        { to: "/shop", icon: ShoppingBag, label: "Tienda" },
      ];

  const groups = isTeacher ? teacherNav : studentNav;

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-slate-900">
      {/* Skip link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-xl focus:text-sm focus:font-bold">
        Saltar al contenido principal
      </a>

      {/* Desktop Sidebar */}
      <aside
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-40 bg-white/90 backdrop-blur-2xl border-r border-slate-200/80
        flex-col hidden md:flex transition-all duration-300 shadow-xs
        ${sidebarCollapsed ? "w-16" : "w-52"}`}
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-2.5 border-b border-slate-200/80 px-4 h-16 shrink-0
          ${sidebarCollapsed ? "justify-center" : ""}`}
        >
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-2xl shadow-sm shadow-blue-500/20 shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="font-['Outfit'] font-black text-slate-900 text-sm leading-none tracking-tight">Notyx</p>
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5 tracking-tight">Gestión Académica</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 tracking-tight uppercase">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
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
          className="mx-2 mb-2 p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all hidden lg:flex items-center justify-center cursor-pointer active:scale-95"
          title="Colapsar menú"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
        </button>

        {/* User Card */}
        <div className="border-t border-slate-200/80 p-3 bg-slate-50/70">
          <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-['Outfit'] font-bold text-xs shrink-0 shadow-xs">
              {(profile?.full_name || "?")[0].toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                    {profile?.full_name || "Usuario"}
                  </p>
                  <span className="text-[11px] font-medium text-slate-500">
                    {isTeacher ? "Docente" : "Alumno"}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={handleLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer active:scale-95"
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-2xl border-t border-slate-200/80
        flex items-center justify-around h-16 px-2 safe-area-bottom shadow-lg">
        {mobileNav.map((item) => (
          <MobileNavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={isActive(item.to)} />
        ))}
      </nav>

      {/* Top Bar (Mobile) */}
      <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 rounded-xl shadow-xs shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-['Outfit'] font-bold text-slate-900 tracking-tight text-sm">Notyx</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-['Outfit'] font-bold text-xs shadow-xs">
            {(profile?.full_name || "?")[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" tabIndex="-1" className={`md:pl-52 transition-all duration-300 pb-16 md:pb-0 ${sidebarCollapsed ? "md:pl-16" : ""}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
