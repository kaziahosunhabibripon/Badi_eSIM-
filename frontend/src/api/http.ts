const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

function loadStoredUserId(): number | null {
  try {
    const raw = sessionStorage.getItem("demo_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: number };
    return typeof parsed.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}

let _userId: number | null = loadStoredUserId();
let _onUnauthorized: (() => void) | null = null;

export function setUserId(id: number | null): void {
  _userId = id;
}

export function getUserId(): number | null {
  return _userId;
}

export function setOnUnauthorized(cb: () => void): void {
  _onUnauthorized = cb;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (_userId !== null) {
    headers["X-User-Id"] = String(_userId);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw { code: "NETWORK_ERROR", message: "Cannot reach the server. Check that the API is running." } as { code: string; message: string };
  }

  if (response.status === 401 && _onUnauthorized) {
    _onUnauthorized();
  }

  if (!response.ok) {
    let body: { error?: { code: string; message: string; details?: Record<string, unknown> } };
    try {
      body = await response.json();
    } catch {
      body = { error: { code: "HTTP_ERROR", message: `Request failed with status ${response.status}`, details: {} } };
    }
    const err = body.error ?? { code: "HTTP_ERROR", message: "Request failed", details: {} };
    throw { code: err.code, message: err.message, status: response.status, details: err.details ?? {} } as { code: string; message: string; status: number; details: Record<string, unknown> };
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
