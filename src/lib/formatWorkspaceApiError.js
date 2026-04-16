/**
 * Normalize FastAPI / fetch error payloads for display (string detail, validation array, etc.).
 */
export function formatWorkspaceApiError(error, fallback) {
  const d = error?.payload?.detail;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (Array.isArray(d)) {
    const parts = d
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return item.msg || item.message || "";
        }
        return "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  if (d && typeof d === "object" && !Array.isArray(d)) {
    try {
      const s = JSON.stringify(d);
      if (s && s !== "{}") return s;
    } catch {
      /* ignore */
    }
  }
  const msg = error?.payload?.message || error?.message;
  return (typeof msg === "string" && msg.trim()) || fallback;
}
