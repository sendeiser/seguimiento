import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./providers/AuthProvider";

import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import Register from "./pages/Register";
import SetupProfile from "./pages/SetupProfile";
import PublicStudentView from "./pages/student/PublicStudentView";
import PublicClassView from "./pages/student/PublicClassView";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import ClassView from "./pages/teacher/ClassView";
import LiveSession from "./pages/teacher/LiveSession";
import JoinClass from "./pages/JoinClass";
import Gateway from "./pages/Gateway";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentClassView from "./pages/student/StudentClassView";
import GlobalRanking from "./pages/gamification/GlobalRanking";
import GlobalMarketplace from "./pages/gamification/GlobalMarketplace";

const DynamicDashboard = () => {
  const { profile } = useAuth();
  if (profile?.role === "teacher") return <TeacherDashboard />;
  if (profile?.role === "student") return <StudentDashboard />;
  return <SetupProfile />;
};

const RedirectToTeacherClass = () => {
  const { id } = useParams();
  return <Navigate to={`/teacher/class/${id}`} replace />;
};

const RedirectToTeacherSession = () => {
  const { id } = useParams();
  return <Navigate to={`/teacher/session/${id}`} replace />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Gateway />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/live/:token" element={<PublicStudentView />} />
        <Route path="/class-live/:token" element={<PublicClassView />} />
        <Route path="/j/:code" element={<JoinClass />} />

        {/* Legacy redirects */}
        <Route path="/home" element={<DynamicDashboard />} />
        <Route path="/class/:id" element={<RedirectToTeacherClass />} />
        <Route path="/session/:id" element={<RedirectToTeacherSession />} />

        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          {/* Teacher routes */}
          <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/class/:id" element={<ProtectedRoute allowedRoles={['teacher']}><ClassView /></ProtectedRoute>} />
          <Route path="/teacher/session/:id" element={<ProtectedRoute allowedRoles={['teacher']}><LiveSession /></ProtectedRoute>} />

          {/* Student routes */}
          <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/class/:id" element={<ProtectedRoute allowedRoles={['student']}><StudentClassView /></ProtectedRoute>} />
          <Route path="/student/ranking" element={<ProtectedRoute allowedRoles={['student']}><GlobalRanking /></ProtectedRoute>} />
          <Route path="/student/shop" element={<ProtectedRoute allowedRoles={['student']}><GlobalMarketplace /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
