const STORAGE_KEY = "tutorconnect.auth";

export interface StoredAuth {
  token: string;
  role: string;
  expiresAt: string;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function saveAuth(auth: StoredAuth) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function loadAuth(): StoredAuth | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.token || !parsed.role) {
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearAuth() {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
}
