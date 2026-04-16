"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/toast/ToastProvider";

export default function AppProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
