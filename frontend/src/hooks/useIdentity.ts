import { useState, useEffect, useCallback, useRef } from "react";
import { setUserId, setOnUnauthorized, apiFetch } from "../api/http";

interface IdentityState {
  user: { id: number; email: string; name: string; role: string; created_at: string } | null;
}

function loadStored(): IdentityState["user"] {
  try {
    const raw = sessionStorage.getItem("demo_user");
    if (!raw) return null;
    return JSON.parse(raw) as IdentityState["user"];
  } catch {
    return null;
  }
}

function storeStored(user: IdentityState["user"]): void {
  if (user) {
    sessionStorage.setItem("demo_user", JSON.stringify(user));
  } else {
    sessionStorage.removeItem("demo_user");
  }
}

export function useIdentity() {
  const [user, setUser] = useState<IdentityState["user"]>(loadStored);
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

  const selectIdentity = useCallback(
    (u: { id: number; email: string; name: string; role: string; created_at: string }) => {
      setUser(u);
      storeStored(u);
      setUserId(u.id);
      setErrorMsg(null);
    },
    []
  );

  const clearIdentity = useCallback(() => {
    setUser(null);
    storeStored(null);
    setUserId(null);
    setErrorMsg(null);
  }, []);

  return { user, selectIdentity, clearIdentity, errorMsg, setErrorMsg } as IdentityState & {
    selectIdentity: (u: IdentityState["user"]) => void;
    clearIdentity: () => void;
    errorMsg: string | null;
    setErrorMsg: (m: string | null) => void;
  };
}
