import React from "react";

import { SkeletonBlock, SkeletonLine } from "@/components/skeletons/SkeletonPrimitives";

import styles from "./HistoryView.module.css";

function HistoryTableRowSkeleton() {
  return (
    <div className={`${styles.row} ${styles.historySkeletonRow}`} aria-hidden>
      <div className={styles.colRun}>
        <SkeletonLine style={{ width: "88%", maxWidth: 140 }} />
        <SkeletonLine style={{ width: "62%", maxWidth: 100, marginTop: 8 }} />
      </div>
      <div className={styles.colConfig}>
        <div className={styles.configGrid}>
          <SkeletonBlock style={{ height: 26, width: "100%", borderRadius: 6 }} />
          <SkeletonBlock style={{ height: 26, width: "100%", borderRadius: 6 }} />
          <SkeletonBlock style={{ height: 26, width: "100%", borderRadius: 6 }} />
          <SkeletonBlock style={{ height: 26, width: "100%", borderRadius: 6 }} />
        </div>
      </div>
      <div className={styles.colMetrics}>
        <div className={styles.metricsRow}>
          <div className={styles.metricItem}>
            <SkeletonLine style={{ width: 56 }} />
            <SkeletonLine style={{ width: 40, marginTop: 6 }} />
          </div>
          <div className={styles.metricItem}>
            <SkeletonLine style={{ width: 48 }} />
            <SkeletonLine style={{ width: 36, marginTop: 6 }} />
          </div>
          <div className={styles.metricItem}>
            <SkeletonLine style={{ width: 36 }} />
            <SkeletonLine style={{ width: 44, marginTop: 6 }} />
          </div>
        </div>
      </div>
      <div className={styles.colStatus}>
        <SkeletonBlock style={{ width: 88, height: 26, borderRadius: 6, margin: "0 auto" }} />
      </div>
      <div className={styles.colActions}>
        <SkeletonBlock style={{ width: 132, height: 32, borderRadius: 6, marginLeft: "auto" }} />
      </div>
    </div>
  );
}

export default function HistoryViewSkeleton({ rowCount = 7 }) {
  const n = Math.max(1, Math.min(12, Number(rowCount) || 7));
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <HistoryTableRowSkeleton key={`history-sk-${i}`} />
      ))}
    </>
  );
}
