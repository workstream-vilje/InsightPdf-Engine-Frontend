"use client";

import classNames from "classnames";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import styles from "./Home/Projects.module.css";

/**
 * Pipeline output card — used both inline in the upload column
 * and in the expanded modal view.
 */
function UploadPipelineOutputCard({
  executionState,
  executionStatusLabel,
  executionSummaryItems,
  selectedWorkspaceFile,
  updateActiveWorkspace,
  variant = "inline",
  onExpand = null,
}) {
  const hideBackToFiles = variant === "inline";
  const scrollClass = variant === "modal" ? styles.uploadPipelineOutputModalBody : undefined;

  return (
    <div
      className={classNames(styles.executionCard, styles.executionCardPro, scrollClass, {
        [styles.executionCardRunning]: executionState.status === "running",
        [styles.executionCardSuccess]: executionState.status === "success",
        [styles.executionCardError]: executionState.status === "error",
      })}
    >
      <div className={styles.executionCardHeader}>
        <div>
          <p className={styles.executionEyebrow}>Pipeline output</p>
          <h3 className={styles.executionTitle}>{executionState.message}</h3>
        </div>
        <div className={styles.executionCardHeaderRight}>
          {onExpand && (
            <Button type="button" variant="outline" size="sm" className={styles.executionShowOutputButton} onClick={onExpand}>
              Expand
            </Button>
          )}
          {hideBackToFiles && executionState.status !== "running" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={styles.executionBackToFilesButton}
              onClick={() => updateActiveWorkspace((current) => ({ ...current, execution: { ...current.execution, visible: false } }))}
            >
              Back to files
            </Button>
          )}
          <span
            className={classNames(styles.executionStatusBadge, {
              [styles.executionStatusBadgeRunning]: executionState.status === "running",
              [styles.executionStatusBadgeSuccess]: executionState.status === "success",
              [styles.executionStatusBadgeError]: executionState.status === "error",
            })}
          >
            {executionStatusLabel}
          </span>
        </div>
      </div>

      <div className={styles.executionFileMeta}>
        <span>{executionState.fileCode || "FILE"}</span>
        <span>{executionState.fileName || selectedWorkspaceFile?.name || "Document"}</span>
      </div>

      <div className={styles.executionRuns}>
        {(executionState.runs || []).map((run) => (
          <div key={run.id} className={styles.executionRunCard}>
            <div className={styles.executionRunHeader}>
              <div className={styles.executionRunHeading}>
                <strong>{run.label}</strong>
                <span>{run.meta}</span>
              </div>
              {run.note && <span className={styles.executionRunNote}>Fallback</span>}
            </div>
            {run.note && <p className={styles.executionRunNotice}>{run.note}</p>}
            <div className={styles.executionEventList}>
              {(run.events || []).map((event) => (
                <div
                  key={event.id}
                  className={classNames(styles.executionEventRow, {
                    [styles.executionEventRowActive]: event.status === "active",
                    [styles.executionEventRowComplete]: event.status === "completed",
                    [styles.executionEventRowFailed]: event.status === "failed",
                    [styles.executionEventRowPending]: event.status === "pending",
                  })}
                >
                  <span
                    className={classNames(styles.executionEventDot, {
                      [styles.executionEventDotActive]: event.status === "active",
                      [styles.executionEventDotComplete]: event.status === "completed",
                      [styles.executionEventDotFailed]: event.status === "failed",
                      [styles.executionEventDotPending]: event.status === "pending",
                    })}
                  />
                  <p className={styles.executionEventMessage}>{event.message}</p>
                  {event.countLabel && <span className={styles.executionEventCount}>{event.countLabel}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {executionSummaryItems.length > 0 && (
        <div className={styles.executionSummaryGrid}>
          {executionSummaryItems.map((item) => (
            <div key={item.label} className={styles.executionSummaryItem}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      )}

      {executionState.details && (
        <div className={styles.executionDetailsSection}>
          <button
            type="button"
            className={styles.executionDetailsToggle}
            onClick={() => updateActiveWorkspace((current) => ({ ...current, execution: { ...current.execution, detailsOpen: !current.execution?.detailsOpen } }))}
          >
            {executionState.detailsOpen ? "Hide details" : "View details"}
          </button>
          <AnimatePresence initial={false}>
            {executionState.detailsOpen && (
              <motion.pre
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={styles.executionDetails}
              >
                {JSON.stringify(executionState.details, null, 2)}
              </motion.pre>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default UploadPipelineOutputCard;
