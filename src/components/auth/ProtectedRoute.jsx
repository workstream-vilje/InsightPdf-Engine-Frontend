"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { hasAccessToken } from "@/services/auth";
import { ROUTE_PATHS } from "@/utils/routepaths";

const subscribe = (callback) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

const getSnapshot = () => (typeof window === "undefined" ? false : hasAccessToken());

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthorized = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    if (!isAuthorized) {
      router.replace(ROUTE_PATHS.AUTH_LOGIN);
    }
  }, [isAuthorized, pathname, router]);

  if (!isAuthorized) {
    return null;
  }

  return children;
}
