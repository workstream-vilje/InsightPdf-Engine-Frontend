const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const canUseStorage = () => typeof window !== "undefined";

export const getAccessToken = () =>
  canUseStorage() ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;

export const getRefreshToken = () =>
  canUseStorage() ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;

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

export const clearTokens = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const hasAccessToken = () => Boolean(getAccessToken());
