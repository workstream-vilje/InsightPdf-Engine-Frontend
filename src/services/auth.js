import { ROUTE_PATHS } from "@/utils/routepaths";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_ID_KEY = "user_id";
const USER_NAME_KEY = "user_name";
const USER_MAIL_ID_KEY = "user_mail_id";
const ACCESS_TOKEN_COOKIE_KEY = "access_token";
const AUTH_SESSION_EVENT = "auth-session-changed";

const canUseStorage = () => typeof window !== "undefined";
const canUseCookies = () => typeof document !== "undefined";

const readCookie = (name) => {
  if (!canUseCookies()) return null;
  const escaped = name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const writeCookie = (name, value, maxAgeSeconds = 60 * 60 * 24 * 7) => {
  if (!canUseCookies()) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
};

const removeCookie = (name) => {
  if (!canUseCookies()) return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
};

const emitAuthSessionChanged = () => {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
};

export const subscribeAuthSession = (callback) => {
  if (!canUseStorage()) {
    return () => {};
  }

  const handleStorage = (event) => {
    if (!event?.key) {
      callback();
      return;
    }
    if (
      event.key === ACCESS_TOKEN_KEY ||
      event.key === REFRESH_TOKEN_KEY ||
      event.key === USER_ID_KEY ||
      event.key === USER_NAME_KEY ||
      event.key === USER_MAIL_ID_KEY
    ) {
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

export const getAccessToken = () =>
  canUseStorage()
    ? window.localStorage.getItem(ACCESS_TOKEN_KEY) || readCookie(ACCESS_TOKEN_COOKIE_KEY)
    : null;

export const getRefreshToken = () =>
  canUseStorage() ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;

export const getCurrentUserId = () =>
  canUseStorage() ? window.localStorage.getItem(USER_ID_KEY) : null;

export const getStoredUserProfile = () => ({
  id: getCurrentUserId() || "",
  name: canUseStorage() ? window.localStorage.getItem(USER_NAME_KEY) || "" : "",
  email: canUseStorage() ? window.localStorage.getItem(USER_MAIL_ID_KEY) || "" : "",
});

export const setTokens = ({ accessToken, refreshToken } = {}) => {
  if (!canUseStorage()) {
    return;
  }

  if (accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    writeCookie(ACCESS_TOKEN_COOKIE_KEY, accessToken);
  }

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  emitAuthSessionChanged();
};

export const setUserSession = ({ userId, name, mailId } = {}) => {
  if (!canUseStorage()) {
    return;
  }

  if (userId != null) {
    window.localStorage.setItem(USER_ID_KEY, String(userId));
  }

  if (name) {
    window.localStorage.setItem(USER_NAME_KEY, name);
  }

  if (mailId) {
    window.localStorage.setItem(USER_MAIL_ID_KEY, mailId);
  }
  emitAuthSessionChanged();
};

export const setAuthSession = ({
  accessToken,
  refreshToken,
  userId,
  name,
  mailId,
} = {}) => {
  setTokens({ accessToken, refreshToken });
  setUserSession({ userId, name, mailId });
};

export const clearTokens = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  removeCookie(ACCESS_TOKEN_COOKIE_KEY);
  emitAuthSessionChanged();
};

export const clearAuthSession = () => {
  if (!canUseStorage()) {
    return;
  }

  clearTokens();
  window.localStorage.removeItem(USER_ID_KEY);
  window.localStorage.removeItem(USER_NAME_KEY);
  window.localStorage.removeItem(USER_MAIL_ID_KEY);
  emitAuthSessionChanged();
};

export const hasAccessToken = () => Boolean(getAccessToken());

export const getScopedStorageKey = (baseKey, userId = getCurrentUserId()) =>
  `${baseKey}:${userId || "anonymous"}`;

export const redirectToLogin = () => {
  if (!canUseStorage()) {
    return;
  }

  const currentPath = window.location.pathname;
  const authPrefix = `/${String(ROUTE_PATHS.AUTH_LOGIN).split("/").filter(Boolean)[0] || "auth"}/`;
  if (currentPath.startsWith(authPrefix)) {
    return;
  }

  window.location.replace(ROUTE_PATHS.AUTH_LOGIN);
};
