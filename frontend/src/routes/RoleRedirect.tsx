import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface Props {
  adminTarget: string;
  tutorTarget: string;
  tutorandoTarget: string;
  fallback?: string;
}

export function RoleRedirect({ adminTarget, tutorTarget, tutorandoTarget, fallback = "/" }: Props) {
  const { auth } = useAuth();
  if (auth?.role === "ADMIN") return <Navigate to={adminTarget} replace />;
  if (auth?.role === "TUTOR") return <Navigate to={tutorTarget} replace />;
  if (auth?.role === "TUTORANDO") return <Navigate to={tutorandoTarget} replace />;
  return <Navigate to={fallback} replace />;
}
