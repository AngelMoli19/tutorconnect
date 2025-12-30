import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { useAuth } from "./hooks/useAuth";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { UsersPage } from "./pages/UsersPage";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { AdminReportsPage } from "./pages/AdminReportsPage";
import { TutorandoDashboardPage } from "./pages/TutorandoDashboardPage";
import { TutorandoProfilePage } from "./pages/TutorandoProfilePage";
import { TutorandoSessionsPage } from "./pages/TutorandoSessionsPage";
import { TutorSessionsPage } from "./pages/TutorSessionsPage";
import { TutorandoResourcesPage } from "./pages/TutorandoResourcesPage";
import { TutorandoObservationsPage } from "./pages/TutorandoObservationsPage";
import { TutorProfilePage } from "./pages/TutorProfilePage";
import { TutorResourcesPage } from "./pages/TutorResourcesPage";
import { TutorObservationsPage } from "./pages/TutorObservationsPage";
import { TutorTutoradosPage } from "./pages/TutorTutoradosPage";
import { TutorAttendancePage } from "./pages/TutorAttendancePage";
import { TutorChatPage } from "./pages/TutorChatPage";
import { TutorandoChatPage } from "./pages/TutorandoChatPage";
import { TutorandoAttendancePage } from "./pages/TutorandoAttendancePage";
import { RoleRedirect } from "./routes/RoleRedirect";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export function App() {
  const { auth } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={auth?.token ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/*" element={<ResetPasswordPage />} />

      <Route path="/" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<RoleRedirect adminTarget="/usuarios" tutorTarget="/tutor/sesiones" tutorandoTarget="/tutorando/sesiones" fallback="/" />} />
          <Route path="admin" element={<DashboardPage />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="asignaciones" element={<AssignmentsPage />} />
          <Route path="reportes" element={<AdminReportsPage />} />
          <Route path="tutorando" element={<Navigate to="/tutorando/sesiones" replace />} />
          <Route path="tutorando/perfil" element={<TutorandoProfilePage />} />
          <Route path="tutorando/sesiones" element={<TutorandoSessionsPage />} />
          <Route path="tutorando/asistencia" element={<TutorandoAttendancePage />} />
          <Route path="tutorando/recursos" element={<TutorandoResourcesPage />} />
          <Route path="tutorando/observaciones" element={<TutorandoObservationsPage />} />
          <Route path="tutor/sesiones" element={<TutorSessionsPage />} />
          <Route path="tutor/tutorandos" element={<TutorTutoradosPage />} />
          <Route path="tutor/asistencia" element={<TutorAttendancePage />} />
          <Route path="tutor/perfil" element={<TutorProfilePage />} />
          <Route path="tutor/recursos" element={<TutorResourcesPage />} />
          <Route path="tutor/observaciones" element={<TutorObservationsPage />} />
          <Route path="tutor/chat" element={<TutorChatPage />} />
          <Route path="tutorando/chat" element={<TutorandoChatPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
