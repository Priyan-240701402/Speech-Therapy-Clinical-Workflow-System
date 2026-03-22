import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function RequireRole({
  allowed,
  children,
}: {
  allowed: Array<"therapist" | "supervisor" | "admin">;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return null;
  if (!allowed.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
