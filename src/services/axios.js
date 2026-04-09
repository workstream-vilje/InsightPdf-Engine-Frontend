/**
 * API base for FastAPI (default uvicorn :8000, routes under /api/v1).
 * Override with NEXT_PUBLIC_API_BASE_URL, or host/port via NEXT_PUBLIC_API_HOST / NEXT_PUBLIC_API_PORT.
 * NEXT_PUBLIC_BACKEND_URL may be origin only (e.g. http://192.168.0.14:8000) — /api/v1 is appended if missing.
 */
const normalizeApiBase = (url) => {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  if (/\/api\/v\d+(\/|$)/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/api/v1`;
};

const defaultBaseFromHostPort = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST || "127.0.0.1";
  const port = process.env.NEXT_PUBLIC_API_PORT || "8000";
  return `http://${host}:${port}/api/v1`;
};

const getBaseUrl = () => {
  const explicit =
    process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  const raw = explicit ? normalizeApiBase(explicit) : defaultBaseFromHostPort();
  return raw.replace(/\/+$/, "");
};

const buildHeaders = (headers = {}) => {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;

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
    const message =
      (isJson && (payload?.detail || payload?.message || payload?.error)) ||
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

export { buildUrl, getBaseUrl, request };
export default httpClient;
