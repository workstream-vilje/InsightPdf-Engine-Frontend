import classNames from "classnames";

import { SkeletonBlock, SkeletonLine } from "@/components/skeletons/SkeletonPrimitives";
import workspaceStyles from "@/features/workspace/components/Home/Projects.module.css";

function UploadFileCardSkeleton() {
  return (
    <div className={workspaceStyles.uploadFileCard} aria-hidden>
      <SkeletonBlock style={{ position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: 6 }} />
      <SkeletonBlock style={{ width: 28, height: 28, borderRadius: 8 }} />
      <SkeletonLine style={{ width: "88%", marginTop: 4 }} />
      <SkeletonLine style={{ width: "62%", marginTop: 6 }} />
      <SkeletonBlock style={{ width: 72, height: 20, borderRadius: 999, marginTop: "auto" }} />
    </div>
  );
}

function UploadFileRowSkeleton() {
  return (
    <div className={workspaceStyles.uploadFileRow} aria-hidden>
      <SkeletonBlock style={{ width: 22, height: 22, borderRadius: 6 }} />
      <div className={workspaceStyles.uploadFileRowMain}>
        <SkeletonLine style={{ width: "70%" }} />
        <SkeletonLine style={{ width: "50%", marginTop: 8 }} />
      </div>
      <div className={workspaceStyles.uploadFileRowActions}>
        <SkeletonBlock style={{ width: 56, height: 22, borderRadius: 8 }} />
        <SkeletonBlock style={{ width: 22, height: 22, borderRadius: 6 }} />
      </div>
    </div>
  );
}

export default function UploadFilesSkeleton({ viewMode, count, regionClassName }) {
  const safeCount = Math.max(1, Number(count) || 1);

  if (viewMode === "list") {
    return (
      <div className={classNames(regionClassName, workspaceStyles.uploadFileListLayout)}>
        {Array.from({ length: safeCount }, (_, i) => (
          <UploadFileRowSkeleton key={`uf-sk-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <div className={classNames(regionClassName, workspaceStyles.uploadFileGridLayout)}>
      {Array.from({ length: safeCount }, (_, i) => (
        <UploadFileCardSkeleton key={`uf-sk-${i}`} />
      ))}
    </div>
  );
}
