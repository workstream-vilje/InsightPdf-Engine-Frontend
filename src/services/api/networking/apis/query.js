import { buildUrl } from "@/services/axios";
import httpClient from "@/services/axios";
import { clearAuthSession, getCsrfToken, redirectToLogin } from "@/services/auth";
import { runQuery as runQueryPath, fetchSavedResponse } from "@/services/api/networking/endpoints";

/**
 * POST /query with Accept: application/x-ndjson.
 * Streams progress lines `{type:"progress",id,message}` then `{type:"result",data}`.
 * Uses cookie-based auth: credentials:"include" + X-CSRF-Token header.
 */
export async function runQuery(payload, { onProgress, signal } = {}) {
  const csrfToken = typeof window !== "undefined" ? getCsrfToken() : null;

  const response = await fetch(buildUrl(runQueryPath), {
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
  });

  if (response.status === 401 && typeof window !== "undefined") {
    clearAuthSession();
    redirectToLogin();
  }

  if (!response.ok) {
    const text = await response.text();
    let parsed = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    const detail = parsed && typeof parsed === "object" ? parsed.detail : null;
    const detailMessage =
      typeof detail === "string"
        ? detail
        : detail != null
          ? JSON.stringify(detail)
          : null;
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

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

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
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      let obj;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (obj.type === "progress" && typeof onProgress === "function") {
        onProgress({ id: obj.id, message: obj.message });
      }
      if (obj.type === "result") {
        return obj.data;
      }
      if (obj.type === "error") {
        throwFromErrorLine(obj);
      }
    }
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
};

export default queryApi;
