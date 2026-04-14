"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";

export default function AppProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
