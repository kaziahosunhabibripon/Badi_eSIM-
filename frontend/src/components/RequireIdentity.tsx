import { Navigate } from "react-router-dom";
import { useIdentity } from "../hooks/useIdentity";

export function RequireIdentity({ children }: { children: React.ReactNode }) {
  const { user } = useIdentity();

  if (!user) {
    return <Navigate to="/choose-identity" replace />;
  }

  return <>{children}</>;
}
