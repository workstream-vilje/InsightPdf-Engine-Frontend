"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ROUTE_PATHS } from "@/utils/routepaths";

export default function ProtectedRoute({
  children,
  redirectTo = ROUTE_PATHS.AUTH_SIGNUP,
  loadingFallback = null,
}) {
  const router = useRouter();
  const { isAuthenticated, isAuthInitialized } = useAuth();

  useEffect(() => {
    if (isAuthInitialized && !isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isAuthInitialized, redirectTo, router]);

  // Avoid redirects while auth is restoring after a hard refresh.
  if (!isAuthInitialized) {
    return loadingFallback;
  }

  if (!isAuthenticated) {
    return loadingFallback;
  }

  return children;
}
