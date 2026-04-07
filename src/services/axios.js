const DEFAULT_BASE_URL = "http://127.0.0.1:8000/api/v1";

const getBaseUrl = () =>
  (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "");

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
