import { useState } from "react";
import { Outlet, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { supabase } from "../lib/supabase";
import { LogOut, GraduationCap, LayoutDashboard, Menu, X } from "lucide-react";

export default function DashboardLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <div className="p-6 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2.5 rounded-xl shadow-md shadow-blue-600/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-base leading-none tracking-tight">Notyx</p>
            <p className="text-[10px] uppercase font-bold text-gray-400 mt-1 tracking-widest">Gestión Académica</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        <Link
          to="/home"
          onClick={closeMenu}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
            location.pathname === "/home" || location.pathname === "/"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-900"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          {isTeacher ? "Mis Clases" : "Mis Materias"}
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md">
            {(profile?.full_name || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-gray-900 truncate leading-none mb-1">{profile?.full_name || "Usuario"}</p>
            <div className="inline-block px-2 py-0.5 rounded-full bg-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-600">
              {isTeacher ? "Docente" : "Alumno"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200/50 shadow-[1px_0_10px_rgba(0,0,0,0.02)] flex-col z-40 hidden md:flex">
        <NavContent />
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={closeMenu}
        >
          <div 
            className="absolute inset-y-0 left-0 w-72 bg-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-300"
            onClick={e => e.stopPropagation()}
          >
            <NavContent />
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm px-4">
        <div className="flex h-16 items-center justify-between">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-1.5 rounded-lg shadow-md shadow-blue-600/20">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-gray-900 tracking-tight">Notyx</span>
          </div>

          <div className="w-9" /> {/* Spacer */}
        </div>
      </header>

      {/* Main Content */}
      <main className="md:pl-64 transition-all overflow-x-hidden">
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
