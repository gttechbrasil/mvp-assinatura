import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "ADMIN") {
    return <Navigate to="/groups" replace />;
  }

  return <>{children}</>;
}
