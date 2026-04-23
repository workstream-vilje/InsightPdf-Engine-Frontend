"use client";

import { formatNumber } from "../utils/workspaceFormatters";
import styles from "./Home/Projects.module.css";

export function IngestionReportMetricsDl({ active }) {
  if (!active) return null;
  return (
    <dl className={styles.ingestionReportGrid}>
      <div><dt>File</dt><dd>{active.fileName}</dd></div>
      <div><dt>Code</dt><dd>{active.fileCode || "—"}</dd></div>
      <div>
        <dt>Total chunks</dt>
        <dd>{active.metricsIncomplete ? "—" : formatNumber(active.chunkCount)}</dd>
      </div>
      <div>
        <dt>Vectors stored</dt>
        <dd>{active.metricsIncomplete ? "—" : formatNumber(active.vectorsStored)}</dd>
      </div>
      <div>
        <dt>Processing time</dt>
        <dd>
          {active.metricsIncomplete
            ? "—"
            : active.processingTimeSeconds > 0
              ? `${Number(active.processingTimeSeconds).toFixed(2)}s`
              : "—"}
        </dd>
      </div>
      <div><dt>Embedding</dt><dd>{active.embeddingLabel}</dd></div>
      <div className={styles.ingestionReportSpanWide}>
        <dt>Vector backends</dt>
        <dd>{active.backends?.length ? active.backends.join(", ") : "—"}</dd>
      </div>
    </dl>
  );
}

export function IngestionFileDetailsSection({ workspaceFile, variant }) {
  if (!workspaceFile) return null;
  const isLogs = variant === "logs";
  const pages = workspaceFile.pages ?? workspaceFile.pagesCount ?? workspaceFile.pages_count ?? "—";
  return (
    <div className={!isLogs ? styles.ingestionReportFileDetails : undefined}>
      {!isLogs && <h4 className={styles.ingestionReportFileDetailsTitle}>File details</h4>}
      <dl className={isLogs ? styles.ingestionReportLogsMeta : styles.ingestionReportFileDetailsDl}>
        <div><dt>File code</dt><dd>{workspaceFile.fileCode || "—"}</dd></div>
        <div><dt>Pages</dt><dd>{pages}</dd></div>
        <div><dt>Size</dt><dd>{workspaceFile.size || "—"}</dd></div>
        <div><dt>Category</dt><dd>{workspaceFile.category || "—"}</dd></div>
      </dl>
    </div>
  );
}
