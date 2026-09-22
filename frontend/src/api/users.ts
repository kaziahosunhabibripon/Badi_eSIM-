import type { User } from "../types";
import { apiFetch } from "./http";

export async function listUsers(role?: string): Promise<User[]> {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  const qs = params.toString();
  return apiFetch<User[]>(`/users${qs ? `?${qs}` : ""}`);
}

export async function getDemoUsers(): Promise<User[]> {
  return apiFetch<User[]>("/users/demo");
}
