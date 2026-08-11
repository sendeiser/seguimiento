import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./providers/AuthProvider";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const SetupProfile = lazy(() => import("./pages/SetupProfile"));
const PublicStudentView = lazy(() => import("./pages/student/PublicStudentView"));
const PublicClassView = lazy(() => import("./pages/student/PublicClassView"));
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const ClassView = lazy(() => import("./pages/teacher/ClassView"));
const LiveSession = lazy(() => import("./pages/teacher/LiveSession"));
const JoinClass = lazy(() => import("./pages/JoinClass"));
const Gateway = lazy(() => import("./pages/Gateway"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentClassView = lazy(() => import("./pages/student/StudentClassView"));
const GlobalRanking = lazy(() => import("./pages/gamification/GlobalRanking"));
const GlobalMarketplace = lazy(() => import("./pages/gamification/GlobalMarketplace"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full border-[3px] border-[var(--primary)] border-t-transparent animate-spin" />
      <p className="text-sm font-bold text-[var(--text-muted)] tracking-widest uppercase">Cargando</p>
    </div>
  </div>
);

const DynamicDashboard = () => {
  const { profile } = useAuth();
  if (profile?.role === "teacher") return <TeacherDashboard />;
  if (profile?.role === "student") return <StudentDashboard />;
  return <SetupProfile />;
};

export default function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Gateway />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/live/:token" element={<PublicStudentView />} />
          <Route path="/class-live/:token" element={<PublicClassView />} />
          <Route path="/j/:code" element={<JoinClass />} />

          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/home" element={<DynamicDashboard />} />
            <Route path="/ranking" element={<GlobalRanking />} />
            <Route path="/shop" element={<GlobalMarketplace />} />

            {/* Teacher Routes */}
            <Route path="/class/:id" element={<ProtectedRoute allowedRoles={['teacher']}><ClassView /></ProtectedRoute>} />
            <Route path="/session/:id" element={<ProtectedRoute allowedRoles={['teacher']}><LiveSession /></ProtectedRoute>} />

            {/* Student Routes */}
            <Route path="/student/class/:id" element={<ProtectedRoute allowedRoles={['student']}><StudentClassView /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
