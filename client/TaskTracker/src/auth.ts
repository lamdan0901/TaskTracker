import type { AuthUser } from "./types";

const TOKEN_KEY = "tt_token";
const USER_KEY = "tt_user";

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user?: AuthUser | null): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch {
    // LocalStorage write error handling
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // LocalStorage remove error handling
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function onUnauthorized(callback: UnauthorizedListener): () => void {
  unauthorizedListeners.add(callback);
  return () => {
    unauthorizedListeners.delete(callback);
  };
}

export function notifyUnauthorized(): void {
  clearSession();
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error("Error in unauthorized listener", e);
    }
  });
}
