"use client";

/** Format bytes to human-readable KB/MB string. */
export const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/** Format milliseconds to seconds string, e.g. "1.23s". */
export const formatMs = (value) => `${(Number(value || 0) / 1000).toFixed(2)}s`;

/** Format a number with locale-aware thousands separators. */
export const formatNumber = (value) => Number(value || 0).toLocaleString();

/** Format a cost value to 3 or 4 decimal places. */
export const formatCost = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? "-");
  return numeric < 0.001 ? numeric.toFixed(4) : numeric.toFixed(3);
};

/** Format an accuracy value (0–1) as a percentage string. */
export const formatAccuracy = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return `${Math.round(numeric * 100)}%`;
};

/** Return a time-of-day greeting. */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

/** Format a project code from a backend project object. */
export const formatProjectCode = (project) => {
  const backendCode = String(project?.project_code || "").trim();
  if (backendCode) return backendCode.toUpperCase();
  const numericId = Number(project?.id);
  if (Number.isFinite(numericId) && numericId > 0) {
    return `PRO-${String(numericId).padStart(3, "0")}`;
  }
  return "PRO-000";
};
