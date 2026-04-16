"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getAccessToken, subscribeAuthSession } from "@/services/auth";

const AuthContext = createContext({
  isAuthenticated: false,
  isAuthInitialized: false,
  token: null,
  refreshAuthState: () => {},
});

const readAuthState = () => {
  const token = getAccessToken();
  return {
    token,
    isAuthenticated: Boolean(token),
  };
};

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    token: null,
    isAuthenticated: false,
    isAuthInitialized: false,
  });

  useEffect(() => {
    const restoreAuth = () => {
      const next = readAuthState();
      setState((current) => ({
        ...current,
        ...next,
        isAuthInitialized: true,
      }));
    };

    restoreAuth();
    const unsubscribe = subscribeAuthSession(restoreAuth);
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      refreshAuthState: () => {
        const next = readAuthState();
        setState((current) => ({
          ...current,
          ...next,
          isAuthInitialized: true,
        }));
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
