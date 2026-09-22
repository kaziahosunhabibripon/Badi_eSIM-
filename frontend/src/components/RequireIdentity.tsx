import { Navigate } from "react-router-dom";
import { useIdentity } from "../hooks/useIdentity";
import type { User } from "../types";

export function RequireIdentity({ children }: { children: React.ReactNode }) {
  const { user } = useIdentity();

  if (!user) {
    return <Navigate to="/choose-identity" replace />;
  }

  return <>{children}</>;
}

export function IsAgent({ user }: { user: User }) {
  return user.role === "AGENT";
}
