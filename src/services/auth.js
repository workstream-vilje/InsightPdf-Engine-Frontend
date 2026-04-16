import { ROUTE_PATHS } from "@/utils/routepaths";

// ── Non-sensitive user profile keys (still stored in localStorage) ──
const USER_ID_KEY    = "user_id";
const USER_NAME_KEY  = "user_name";
const USER_MAIL_ID_KEY = "user_mail_id";

// ── Cookie names (set by backend) ──
// access_token  → HttpOnly, unreadable by JS
// refresh_token → HttpOnly, unreadable by JS
// csrf_token    → readable by JS, used for CSRF header
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
  const escaped = name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

/** Read the CSRF token from the readable cookie set by the backend. */
export const getCsrfToken = () => readCookie(CSRF_COOKIE_KEY);

/**
 * Auth is considered active when the backend has set the csrf_token cookie.
 * The access_token is HttpOnly so JS cannot read it directly.
 */
export const getAccessToken = () => {
  // csrf_token presence means the user is logged in (backend sets all three cookies together)
  return getCsrfToken();
};

export const getRefreshToken = () => null; // HttpOnly — not readable by JS

export const getCurrentUserId = () =>
  canUseStorage() ? window.localStorage.getItem(USER_ID_KEY) : null;

export const getStoredUserProfile = () => ({
  id:    getCurrentUserId() || "",
  name:  canUseStorage() ? window.localStorage.getItem(USER_NAME_KEY)    || "" : "",
  email: canUseStorage() ? window.localStorage.getItem(USER_MAIL_ID_KEY) || "" : "",
});

// ── Session management ──
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
 * Store only the non-sensitive user profile fields.
 * Tokens are now managed by HttpOnly cookies — never stored in localStorage.
 */
export const setAuthSession = ({ userId, name, mailId } = {}) => {
  if (!canUseStorage()) return;

  if (userId != null) window.localStorage.setItem(USER_ID_KEY,       String(userId));
  if (name)           window.localStorage.setItem(USER_NAME_KEY,     name);
  if (mailId)         window.localStorage.setItem(USER_MAIL_ID_KEY,  mailId);

  emitAuthSessionChanged();
};

// Legacy aliases — kept so existing call-sites don't break
export const setTokens      = () => {};   // no-op: tokens are cookie-managed
export const setUserSession = setAuthSession;

export const clearTokens = () => {
  // Tokens are HttpOnly cookies — the backend clears them on logout.
  // Clear the readable csrf cookie immediately on the frontend as well.
  expireCookie(CSRF_COOKIE_KEY);
  emitAuthSessionChanged();
};

export const clearAuthSession = () => {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(USER_ID_KEY);
  window.localStorage.removeItem(USER_NAME_KEY);
  window.localStorage.removeItem(USER_MAIL_ID_KEY);

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
