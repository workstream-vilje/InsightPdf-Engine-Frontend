import { buildUrl } from "@/services/axios";
import httpClient from "@/services/axios";
import { clearAuthSession, getCsrfToken, redirectToLogin } from "@/services/auth";
import { runQuery as runQueryPath, fetchSavedResponse, chatHistory } from "@/services/api/networking/endpoints";

/**
 * Attempt to refresh the access token via POST /auth/refresh.
 * The browser sends the refresh_token HttpOnly cookie automatically.
 * Returns true if the backend issued fresh cookies, false otherwise.
 */
async function tryRefresh() {
  try {
    const res = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-CSRF-Token": getCsrfToken() || "",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Build the fetch options for the streaming query request.
 */
function buildQueryFetchOptions(payload, signal) {
  const csrfToken = typeof window !== "undefined" ? getCsrfToken() : null;
  return {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/x-ndjson",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    signal,
    body: JSON.stringify(payload),
  };
}

/**
 * POST /query with Accept: application/x-ndjson.
 * Streams progress lines `{type:"progress",id,message}` then `{type:"result",data}`.
 *
 * On 401: attempts one token refresh then retries the stream once.
 * If refresh fails: clears session and redirects to login.
 */
export async function runQuery(payload, { onProgress, signal } = {}, _isRetry = false) {
  const response = await fetch(buildUrl(runQueryPath), buildQueryFetchOptions(payload, signal));

  // ── 401: try refresh once ──
  if (response.status === 401 && !_isRetry && typeof window !== "undefined") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return runQuery(payload, { onProgress, signal }, true);
    }
    clearAuthSession();
    redirectToLogin();
    const err = new Error("Session expired. Please log in again.");
    err.status = 401;
    throw err;
  }

  if (!response.ok) {
    const text = await response.text();
    let parsed = text;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    const detail = parsed && typeof parsed === "object" ? parsed.detail : null;
    const detailMessage =
      typeof detail === "string" ? detail : detail != null ? JSON.stringify(detail) : null;
    const message =
      detailMessage ||
      (parsed && typeof parsed === "object" && (parsed.message || parsed.error)) ||
      response.statusText ||
      "Request failed";
    const err = new Error(typeof message === "string" ? message : "Request failed");
    err.status = response.status;
    err.payload = parsed;
    throw err;
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  const throwFromErrorLine = (obj) => {
    const d = obj.detail;
    const msg = typeof d === "string" ? d : d != null ? JSON.stringify(d) : "Query failed";
    const err = new Error(msg);
    err.status = obj.status_code || 500;
    err.payload = obj;
    throw err;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let obj;
      try { obj = JSON.parse(trimmed); } catch { continue; }
      if (obj.type === "progress" && typeof onProgress === "function") {
        onProgress({ id: obj.id, message: obj.message });
      }
      if (obj.type === "result") return obj.data;
      if (obj.type === "error") throwFromErrorLine(obj);
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    let obj;
    try {
      obj = JSON.parse(trailing);
    } catch {
      obj = null;
    }

    if (obj?.type === "result") return obj.data;
    if (obj?.type === "error") throwFromErrorLine(obj);
  }

  throw new Error("Query stream ended without a result");
}

export const queryApi = {
  runQuery,
  fetchSavedResponse: ({ projectId, fileId, experimentId }) =>
    httpClient.get(
      `${fetchSavedResponse}?project_id=${projectId}&file_id=${fileId}&experiment_id=${experimentId}`,
      {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
        },
      },
    ),
  fetchChatHistory: ({ projectId, fileId }) =>
    httpClient.get(`${chatHistory}?file_id=${fileId}&project_id=${projectId}`),
};

export default queryApi;
