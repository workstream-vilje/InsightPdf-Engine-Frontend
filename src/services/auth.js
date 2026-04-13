import { ROUTE_PATHS } from "@/utils/routepaths";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_ID_KEY = "user_id";
const USER_NAME_KEY = "user_name";
const USER_MAIL_ID_KEY = "user_mail_id";

const canUseStorage = () => typeof window !== "undefined";

export const getAccessToken = () =>
  canUseStorage() ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;

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
  }

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
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
};

export const clearAuthSession = () => {
  if (!canUseStorage()) {
    return;
  }

  clearTokens();
  window.localStorage.removeItem(USER_ID_KEY);
  window.localStorage.removeItem(USER_NAME_KEY);
  window.localStorage.removeItem(USER_MAIL_ID_KEY);
};

export const hasAccessToken = () => Boolean(getAccessToken());

export const getScopedStorageKey = (baseKey, userId = getCurrentUserId()) =>
  `${baseKey}:${userId || "anonymous"}`;

export const redirectToLogin = () => {
  if (!canUseStorage()) {
    return;
  }

  const currentPath = window.location.pathname;
  if (currentPath.startsWith("/auth/")) {
    return;
  }

  window.location.replace(ROUTE_PATHS.AUTH_LOGIN);
};
