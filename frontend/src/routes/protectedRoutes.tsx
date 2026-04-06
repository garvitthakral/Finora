import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

type Props = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, token, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Token exists; user may still be fetching (or just got setToken()).
  if (!user) return <div>Loading...</div>;

  if (allowedRoles && !allowedRoles.includes(user.role || "")) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
