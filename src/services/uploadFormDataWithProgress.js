import { buildUrl } from "@/services/axios";
import { getAccessToken } from "@/services/auth";

/**
 * POST multipart FormData with upload progress (fetch API does not expose upload progress).
 * @param {string} path API path (e.g. /project/1/upload?user_id=…)
 * @param {FormData} formData
 * @param {{ onProgress?: (p: { loaded: number; total: number; percent: number }) => void }} [options]
 */
export function postFormDataWithProgress(path, formData, options = {}) {
  const { onProgress } = options;

  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === "undefined") {
      reject(new Error("XMLHttpRequest is not available"));
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = buildUrl(path);

    xhr.open("POST", url);
    xhr.setRequestHeader("Accept", "application/json");

    const token = typeof window !== "undefined" ? getAccessToken() : null;
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent,
      });
    };

    xhr.onload = () => {
      const text = xhr.responseText;
      let payload = text;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = text;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
        return;
      }

      const message =
        (payload && typeof payload === "object" && (payload.detail || payload.message || payload.error)) ||
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
