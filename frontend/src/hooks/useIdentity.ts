import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { setUserId, setOnUnauthorized, apiFetch } from "../api/http";

interface IdentityUser {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface IdentityContextValue {
  user: IdentityUser | null;
  selectIdentity: (u: IdentityUser) => void;
  clearIdentity: () => void;
  errorMsg: string | null;
  setErrorMsg: (m: string | null) => void;
}

function loadStored(): IdentityUser | null {
  try {
    const raw = sessionStorage.getItem("demo_user");
    if (!raw) return null;
    return JSON.parse(raw) as IdentityUser;
  } catch {
    return null;
  }
}

function storeStored(user: IdentityUser | null): void {
  if (user) {
    sessionStorage.setItem("demo_user", JSON.stringify(user));
  } else {
    sessionStorage.removeItem("demo_user");
  }
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IdentityUser | null>(loadStored);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setOnUnauthorized(() => {
      setUser(null);
      storeStored(null);
      setErrorMsg("That identity is no longer valid - please choose again.");
      window.location.href = "/choose-identity";
    });

    const stored = loadStored();
    if (stored) {
      apiFetch<{ id: number }>(`/tickets?page_size=1`).catch(() => {
        setUser(null);
        storeStored(null);
      });
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const selectIdentity = useCallback((u: IdentityUser) => {
    setUser(u);
    storeStored(u);
    setUserId(u.id);
    setErrorMsg(null);
  }, []);

  const clearIdentity = useCallback(() => {
    setUser(null);
    storeStored(null);
    setUserId(null);
    setErrorMsg(null);
  }, []);

  return createElement(
    IdentityContext.Provider,
    { value: { user, selectIdentity, clearIdentity, errorMsg, setErrorMsg } },
    children
  );
}

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) {
    throw new Error("useIdentity must be used within an IdentityProvider");
  }
  return ctx;
}
