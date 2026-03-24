import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentClassView from "./pages/student/StudentClassView";

const DynamicDashboard = () => {
  const { profile } = useAuth();
  if (profile?.role === "teacher") return <TeacherDashboard />;
  if (profile?.role === "student") return <StudentDashboard />;
  return <SetupProfile />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/live/:token" element={<PublicStudentView />} />
        <Route path="/class-live/:token" element={<PublicClassView />} />
        <Route path="/j/:code" element={<JoinClass />} />
        
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DynamicDashboard />} />
          
          {/* Teacher Routes */}
          <Route path="class/:id" element={<ProtectedRoute allowedRoles={['teacher']}><ClassView /></ProtectedRoute>} />
          <Route path="session/:id" element={<ProtectedRoute allowedRoles={['teacher']}><LiveSession /></ProtectedRoute>} />
          
          {/* Student Routes */}
          <Route path="student/class/:id" element={<ProtectedRoute allowedRoles={['student']}><StudentClassView /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
