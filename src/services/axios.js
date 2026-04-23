import { clearAuthSession, getCsrfToken, redirectToLogin } from "@/services/auth";

const normalizeApiBase = (url) => {
  const trimmed = String(url || "").trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  if (/\/api\/v\d+(\/|$)/i.test(trimmed)) return trimmed;
  return `${trimmed}/api/v1`;
};

const getBaseUrl = () => {
  const directBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (directBase && String(directBase).trim()) {
    return normalizeApiBase(directBase).replace(/\/+$/, "");
  }
  const host = process.env.NEXT_PUBLIC_API_HOST || "localhost";
  const port = process.env.NEXT_PUBLIC_API_PORT || "8000";
  return normalizeApiBase(`http://${host}:${port}`).replace(/\/+$/, "");
};

const getStoredUserId = () =>
  typeof window !== "undefined" ? window.localStorage.getItem("user_id") : null;

export const withQuery = (path, params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  if (!query) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
};

export const buildUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBaseUrl()}${normalizedPath}`;
};

const buildHeaders = (method = "GET", extraHeaders = {}) => {
  const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
  const csrfHeader =
    isWriteMethod && typeof window !== "undefined"
      ? { "X-CSRF-Token": getCsrfToken() || "" }
      : {};
  return { Accept: "application/json", ...csrfHeader, ...extraHeaders };
};

// ── Refresh lock — prevents multiple simultaneous refresh calls ──
let _refreshPromise = null;

/**
 * Call POST /auth/refresh with the refresh_token cookie.
 * Backend sets fresh access_token + csrf_token cookies on success.
 * Returns true if refresh succeeded, false if it failed.
 */
const attemptTokenRefresh = async () => {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          // csrf_token cookie is still valid even when access_token has expired
          "X-CSRF-Token": getCsrfToken() || "",
        },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = isJson ? payload?.detail : null;
    const detailMessage =
      typeof detail === "string" ? detail : detail != null ? JSON.stringify(detail) : null;
    const message =
      detailMessage ||
      (isJson && (payload?.message || payload?.error)) ||
      response.statusText ||
      "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

/**
 * Core request function with automatic token refresh on 401.
 *
 * Flow:
 * 1. Make the request with credentials: "include"
 * 2. If 401 → try POST /auth/refresh (browser sends refresh_token cookie)
 * 3. If refresh succeeds → retry the original request once with fresh cookies
 * 4. If refresh fails → clear session and redirect to login
 */
const request = async (path, options = {}, _isRetry = false) => {
  const { headers, body, method = "GET", ...restOptions } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(buildUrl(path), {
    ...restOptions,
    method,
    credentials: "include",
    headers: isFormData
      ? buildHeaders(method, headers)
      : buildHeaders(method, { "Content-Type": "application/json", ...headers }),
    body:
      body == null
        ? undefined
        : isFormData || typeof body === "string"
          ? body
          : JSON.stringify(body),
  });

  // ── 401 handling: try refresh once, then retry ──
  if (response.status === 401 && !_isRetry && typeof window !== "undefined") {
    const refreshed = await attemptTokenRefresh();

    if (refreshed) {
      // Retry the original request with the new cookies
      return request(path, options, true);
    }

    // Refresh failed — session is truly expired
    clearAuthSession();
    redirectToLogin();

    // Throw so callers know the request failed
    const error = new Error("Session expired. Please log in again.");
    error.status = 401;
    throw error;
  }

  return parseResponse(response);
};

const httpClient = {
  get:    (path, options = {}) => request(path, { ...options, method: "GET" }),
  post:   (path, body, options = {}) => request(path, { ...options, method: "POST",   body }),
  put:    (path, body, options = {}) => request(path, { ...options, method: "PUT",    body }),
  patch:  (path, body, options = {}) => request(path, { ...options, method: "PATCH",  body }),
  delete: (path, options = {})       => request(path, { ...options, method: "DELETE" }),
};

export { getBaseUrl, getStoredUserId, request };
export default httpClient;
