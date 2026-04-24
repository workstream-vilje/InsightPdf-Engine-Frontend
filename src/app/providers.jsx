"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { PlanProvider } from "@/contexts/PlanContext";

export default function AppProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <PlanProvider>
          {children}
        </PlanProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
