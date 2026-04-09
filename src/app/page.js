"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken =
      typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
    const projectId = searchParams.get("project");

    if (accessToken) {
      const nextPath = projectId ? `/workspace?project=${projectId}` : "/workspace";
      router.replace(nextPath);
      return;
    }

    router.replace("/login");
  }, [router, searchParams]);

  return null;
}
