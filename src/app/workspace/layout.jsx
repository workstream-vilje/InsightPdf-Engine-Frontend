"use client";

import { Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ProjectCanvas from "@/features/workspace/components/Home/Projects";

/**
 * Shared layout for /workspace/upload and /workspace/query.
 *
 * By rendering ProjectCanvas here (in the layout) instead of in each page,
 * the component stays mounted when navigating between upload and query modes.
 * This prevents the full remount that caused skeleton flashes and redundant
 * API calls every time the user clicked "Open chat" or "Upload".
 *
 * ProjectCanvas reads workspaceMode and the project id directly from the URL
 * via usePathname / useSearchParams, so it reacts to navigation without
 * needing to be remounted.
 */
export default function WorkspaceLayout() {
  return (
    <ProtectedRoute>
      <Suspense>
        <ProjectCanvas />
      </Suspense>
    </ProtectedRoute>
  );
}
