import { ROUTE_PATHS } from "@/utils/routepaths";

// ── Non-sensitive user profile keys stored in localStorage ──
const USER_ID_KEY      = "user_id";
const USER_NAME_KEY    = "user_name";
const USER_MAIL_ID_KEY = "user_mail_id";

// ── Stale token keys from old auth flow — scrubbed on every clearAuthSession ──
const STALE_TOKEN_KEYS = [
  "access_token",
  "refresh_token",
  "vilje.access_token",
  "vilje.refresh_token",
];

// ── Cookie names (set by backend) ──
// access_token  → HttpOnly, unreadable by JS
// refresh_token → HttpOnly, unreadable by JS
// csrf_token    → readable by JS, used for X-CSRF-Token header
const CSRF_COOKIE_KEY = "csrf_token";

const AUTH_SESSION_EVENT = "auth-session-changed";

const canUseStorage = () => typeof window !== "undefined";
const canUseCookies = () => typeof document !== "undefined";

const expireCookie = (name) => {
  if (!canUseCookies()) return;
  const encodedName = encodeURIComponent(name);
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodedName}=; Max-Age=0; path=/${secure}; SameSite=Lax`;
};

// ── Cookie helpers ──
export const readCookie = (name) => {
  if (!canUseCookies()) return null;
  // Escape special regex characters in the cookie name
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

/** Read the CSRF token from the readable cookie set by the backend. */
export const getCsrfToken = () => readCookie(CSRF_COOKIE_KEY);

/**
 * Auth is considered active when the backend has set the csrf_token cookie.
 * access_token is HttpOnly so JS cannot read it directly.
 * csrf_token is set alongside access_token — its presence means the user is logged in.
 */
export const getAccessToken = () => getCsrfToken();

export const getRefreshToken = () => null; // HttpOnly — not readable by JS

export const getCurrentUserId = () =>
  canUseStorage() ? window.localStorage.getItem(USER_ID_KEY) : null;

export const getStoredUserProfile = () => ({
  id:    getCurrentUserId() || "",
  name:  canUseStorage() ? window.localStorage.getItem(USER_NAME_KEY)    || "" : "",
  email: canUseStorage() ? window.localStorage.getItem(USER_MAIL_ID_KEY) || "" : "",
});

// ── Session event ──
const emitAuthSessionChanged = () => {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
};

export const subscribeAuthSession = (callback) => {
  if (!canUseStorage()) return () => {};

  const handleStorage = (event) => {
    if (!event?.key) { callback(); return; }
    if ([USER_ID_KEY, USER_NAME_KEY, USER_MAIL_ID_KEY].includes(event.key)) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUTH_SESSION_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUTH_SESSION_EVENT, callback);
  };
};

/**
 * Store only the non-sensitive user profile fields after login.
 * Tokens are managed by HttpOnly cookies — never stored in localStorage.
 */
export const setAuthSession = ({ userId, name, mailId } = {}) => {
  if (!canUseStorage()) return;

  if (userId != null) window.localStorage.setItem(USER_ID_KEY,       String(userId));
  if (name)           window.localStorage.setItem(USER_NAME_KEY,     name);
  if (mailId)         window.localStorage.setItem(USER_MAIL_ID_KEY,  mailId);

  emitAuthSessionChanged();
};

// Legacy aliases — kept so existing call-sites don't break
export const setTokens      = () => {}; // no-op: tokens are cookie-managed
export const setUserSession = setAuthSession;

export const clearTokens = () => {
  // HttpOnly cookies are cleared by the backend on logout.
  // Scrub any stale token keys that may exist from old auth flows.
  if (!canUseStorage()) return;
  STALE_TOKEN_KEYS.forEach((key) => window.localStorage.removeItem(key));

  // Clear the readable csrf cookie immediately on the frontend as well.
  expireCookie(CSRF_COOKIE_KEY);
  emitAuthSessionChanged();
};

/**
 * Clear all frontend auth state.
 * Called after the backend logout endpoint has cleared the HttpOnly cookies.
 */
export const clearAuthSession = () => {
  if (!canUseStorage()) return;

  // User profile
  window.localStorage.removeItem(USER_ID_KEY);
  window.localStorage.removeItem(USER_NAME_KEY);
  window.localStorage.removeItem(USER_MAIL_ID_KEY);

  // Scrub any stale token keys from old auth flows
  STALE_TOKEN_KEYS.forEach((key) => window.localStorage.removeItem(key));

  // Clear app-specific scoped storage
  Object.keys(window.localStorage).forEach((key) => {
    if (key.startsWith("rag-canvas-projects:") || key.startsWith("rag-canvas-workspaces:")) {
      window.localStorage.removeItem(key);
    }
  });

  expireCookie(CSRF_COOKIE_KEY);

  emitAuthSessionChanged();
};

export const hasAccessToken = () => Boolean(getCsrfToken());

export const getScopedStorageKey = (baseKey, userId = getCurrentUserId()) =>
  `${baseKey}:${userId || "anonymous"}`;

export const redirectToLogin = () => {
  if (!canUseStorage()) return;

  const currentPath = window.location.pathname;
  const authPrefix = `/${String(ROUTE_PATHS.AUTH_LOGIN).split("/").filter(Boolean)[0] || "auth"}/`;
  if (currentPath.startsWith(authPrefix)) return;

  window.location.replace(ROUTE_PATHS.AUTH_LOGIN);
};
