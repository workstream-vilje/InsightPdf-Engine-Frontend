"use client";

import { SkeletonBlock, SkeletonLine } from "@/components/skeletons/SkeletonPrimitives";
import styles from "./Home/Projects.module.css";

const UPLOAD_PIPELINE_SIDEBAR_METRIC_PLACEHOLDERS = 6;
const EXECUTION_PERFORMANCE_CARD_PLACEHOLDERS = 6;

export function UploadPipelineSidebarSkeletonRows() {
  return (
    <>
      {Array.from({ length: UPLOAD_PIPELINE_SIDEBAR_METRIC_PLACEHOLDERS }, (_, i) => (
        <div key={`upload-pipeline-sk-${i}`} className={styles.uploadSidebarKvSkeleton} aria-hidden>
          <SkeletonLine style={{ width: "46%", maxWidth: 112, height: 11 }} />
          <SkeletonLine style={{ width: "32%", maxWidth: 76, height: 12 }} />
        </div>
      ))}
    </>
  );
}

export function ExecutionPerformanceSkeletonGrid() {
  return (
    <div className={styles.performancePanel}>
      <div className={styles.metricGrid}>
        {Array.from({ length: EXECUTION_PERFORMANCE_CARD_PLACEHOLDERS }, (_, i) => (
          <div key={`perf-sk-${i}`} className={styles.metricCardSkeleton} aria-hidden>
            <SkeletonLine style={{ width: "58%", maxWidth: 120, height: 10 }} />
            <SkeletonBlock style={{ width: "72%", height: 26, borderRadius: 10, maxWidth: 140 }} />
            <SkeletonLine style={{ width: "85%", maxWidth: 160, height: 9 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
