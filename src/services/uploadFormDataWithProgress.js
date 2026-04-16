import { buildUrl } from "@/services/axios";
import { clearAuthSession, getCsrfToken, redirectToLogin } from "@/services/auth";

/**
 * Attempt token refresh via POST /auth/refresh.
 * Returns true if backend issued fresh cookies.
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
 * POST multipart FormData with upload progress using XMLHttpRequest.
 * (fetch API does not expose upload progress.)
 *
 * Uses cookie-based auth:
 * - withCredentials = true  → browser sends HttpOnly auth cookies automatically
 * - X-CSRF-Token header     → required for write requests
 *
 * On 401: attempts one token refresh then retries once.
 */
export function postFormDataWithProgress(path, formData, options = {}, _isRetry = false) {
  const { onProgress } = options;

  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === "undefined") {
      reject(new Error("XMLHttpRequest is not available"));
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = buildUrl(path);

    xhr.open("POST", url);
    xhr.withCredentials = true;

    xhr.setRequestHeader("Accept", "application/json");

    const csrfToken = typeof window !== "undefined" ? getCsrfToken() : null;
    if (csrfToken) {
      xhr.setRequestHeader("X-CSRF-Token", csrfToken);
    }

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress({ loaded: event.loaded, total: event.total, percent });
    };

    xhr.onload = async () => {
      // ── 401: try refresh once then retry ──
      if (xhr.status === 401 && !_isRetry && typeof window !== "undefined") {
        const refreshed = await tryRefresh();
        if (refreshed) {
          try {
            const result = await postFormDataWithProgress(path, formData, options, true);
            resolve(result);
          } catch (retryErr) {
            reject(retryErr);
          }
          return;
        }
        clearAuthSession();
        redirectToLogin();
        reject(new Error("Session expired. Please log in again."));
        return;
      }

      const text = xhr.responseText;
      let payload = text;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
        return;
      }

      const message =
        (payload && typeof payload === "object" &&
          (payload.detail || payload.message || payload.error)) ||
        xhr.statusText ||
        "Upload failed";
      const err = new Error(typeof message === "string" ? message : "Upload failed");
      err.status = xhr.status;
      err.payload = payload;
      reject(err);
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}
