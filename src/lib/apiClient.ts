/**
 * Typed HTTP client for the dashboard-sales-backend API.
 * Reads VITE_API_URL from env and attaches the stored JWT token to every request.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

let onUnauthorizedCallback: (() => void) | null = null;

export function onUnauthorized(callback: () => void) {
  onUnauthorizedCallback = callback;
}

// Custom error that carries the HTTP status so callers can inspect it.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message: string;
    try {
      const json = await response.json();
      message = json?.message ?? response.statusText;
    } catch {
      message = response.statusText;
    }
    if (response.status === 401) {
      removeToken();
      onUnauthorizedCallback?.();
    }
    throw new ApiError(response.status, message);
  }

  // 204 No Content – return undefined cast as T
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export default apiClient;
