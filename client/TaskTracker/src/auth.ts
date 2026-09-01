import type { AuthUser } from "./types";

const ACCESS_TOKEN_KEY = "tt_token";
const REFRESH_TOKEN_KEY = "tt_refresh_token";
const USER_KEY = "tt_user";

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function getToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
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

export function setSession(
  accessToken: string,
  refreshToken?: string | null,
  user?: AuthUser | null,
): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken !== undefined && refreshToken !== null) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch {
    // LocalStorage write error handling
  }
}

export function setTokens(accessToken: string, refreshToken?: string | null): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken !== undefined && refreshToken !== null) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch {
    // LocalStorage write error handling
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
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
