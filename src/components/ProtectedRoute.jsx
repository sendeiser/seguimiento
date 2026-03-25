import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex h-screen w-full items-center justify-center">Cargando...</div>;

  if (!user) return <Navigate to="/" replace />;

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
