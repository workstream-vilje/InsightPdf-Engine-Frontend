import { clearAuthSession, getAccessToken, redirectToLogin } from "@/services/auth";

/**
 * API base defaults to the local FastAPI backend.
 * Set NEXT_PUBLIC_API_HOST or NEXT_PUBLIC_API_PORT only when overriding localhost:8000.
 */
const normalizeApiBase = (url) => {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  if (/\/api\/v\d+(\/|$)/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/api/v1`;
};

const getBaseUrl = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST || "localhost";
  const port = process.env.NEXT_PUBLIC_API_PORT || "8000";
  const raw = normalizeApiBase(`http://${host}:${port}`);
  return raw.replace(/\/+$/, "");
};

const getStoredUserId = () =>
  typeof window !== "undefined" ? window.localStorage.getItem("user_id") : null;

const withQuery = (path, params = {}) => {
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

const buildHeaders = (headers = {}) => {
  const token = typeof window !== "undefined" ? getAccessToken() : null;

  return {
    Accept: "application/json",
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const buildUrl = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBaseUrl()}${normalizedPath}`;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearAuthSession();
      redirectToLogin();
    }

    const detail = isJson ? payload?.detail : null;
    const detailMessage =
      typeof detail === "string"
        ? detail
        : detail != null
          ? JSON.stringify(detail)
          : null;

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

const request = async (path, options = {}) => {
  const { headers, body, ...restOptions } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(buildUrl(path), {
    ...restOptions,
    headers: isFormData
      ? buildHeaders(headers)
      : buildHeaders({
          "Content-Type": "application/json",
          ...headers,
        }),
    body:
      body == null
        ? undefined
        : isFormData || typeof body === "string"
        ? body
        : JSON.stringify(body),
  });

  return parseResponse(response);
};

const httpClient = {
  get: (path, options = {}) => request(path, { ...options, method: "GET" }),
  post: (path, body, options = {}) =>
    request(path, { ...options, method: "POST", body }),
  put: (path, body, options = {}) =>
    request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options = {}) =>
    request(path, { ...options, method: "PATCH", body }),
  delete: (path, options = {}) => request(path, { ...options, method: "DELETE" }),
};

export { buildUrl, getBaseUrl, getStoredUserId, request, withQuery };
export default httpClient;
