import { useEffect, useState } from "react";

/**
 * Skeleton count aligned with grid columns × rows or list density from viewport.
 */
export function useFileListSkeletonCount(viewMode) {
  const [count, setCount] = useState(() => (viewMode === "list" ? 6 : 8));

  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      if (viewMode === "list") {
        const rows = Math.min(10, Math.max(5, Math.round(w / 110)));
        setCount(rows);
        return;
      }
      const cols = w >= 1400 ? 4 : w >= 1000 ? 3 : w >= 640 ? 2 : 1;
      setCount(cols * 2);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [viewMode]);

  return count;
}
