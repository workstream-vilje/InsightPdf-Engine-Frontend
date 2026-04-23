"use client";

import classNames from "classnames";
import { FileText, Trash2 } from "lucide-react";
import UploadFilesSkeleton from "@/components/skeletons/UploadFilesSkeleton";
import styles from "./Home/Projects.module.css";

/**
 * Shared grid/list of project files for inline upload panel and expanded modal.
 */
function UploadProjectFilesList({
  files,
  uploadFilesViewMode,
  activeWorkspaceFileId,
  ingestionFileReports,
  updateActiveWorkspace,
  onOpenFileReport,
  setWorkspaceFilePendingDelete,
  setDeleteWorkspaceFileNameInput,
  regionClassName,
  emptyClassName,
  emptyMessage,
  isLoadingFiles,
  fileSkeletonCount,
}) {
  if (isLoadingFiles) {
    return <UploadFilesSkeleton viewMode={uploadFilesViewMode} count={fileSkeletonCount} regionClassName={regionClassName} />;
  }
  if (!files?.length) {
    return <div className={emptyClassName}>{emptyMessage}</div>;
  }

  return (
    <div
      className={classNames(
        styles.uploadFilesContentReveal,
        regionClassName,
        uploadFilesViewMode === "grid" ? styles.uploadFileGridLayout : styles.uploadFileListLayout,
      )}
    >
      {files.map((file) => {
        const fileReport = ingestionFileReports.find(
          (r) => r.fileId != null && String(r.fileId) === String(file.fileId),
        );
        const showReportBtn = Boolean(fileReport);
        const isSelected = String(file.fileId) === activeWorkspaceFileId;
        const isProcessed = Boolean(file.processed || file.allowedTechniques || fileReport);
        const indexStatus = file.indexStatus || (isProcessed ? "ready" : "not_processed");

        const statusLabel = isSelected
          ? isProcessed
            ? indexStatus === "checking" ? "Checking…" : "Selected / Processed"
            : "Selected"
          : isProcessed
            ? indexStatus === "checking" ? "Checking…" : "Processed"
            : indexStatus === "not_processed" ? "Index Pending" : "Ready";

        const toggleSelect = () =>
          updateActiveWorkspace((current) => ({
            ...current,
            selectedFileId:
              String(file.fileId) === String(current.selectedFileId)
                ? null
                : file.fileId != null ? Number(file.fileId) : null,
          }));

        const openDelete = (e) => {
          e?.stopPropagation();
          setWorkspaceFilePendingDelete(file);
          setDeleteWorkspaceFileNameInput("");
        };

        const openDeleteKeyDown = (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDelete(e); }
        };

        const openReport = (e) => {
          e?.stopPropagation();
          onOpenFileReport(fileReport);
        };

        const openReportKeyDown = (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openReport(e); }
        };

        if (uploadFilesViewMode === "grid") {
          return (
            <button
              key={file.id}
              type="button"
              className={classNames(styles.uploadFileCard, { [styles.uploadFileCardActive]: String(file.fileId) === activeWorkspaceFileId })}
              onClick={toggleSelect}
            >
              {file.fileId != null && (
                <span role="button" tabIndex={0} className={styles.uploadFileCardDelete} title="Delete file" onClick={openDelete} onKeyDown={openDeleteKeyDown}>
                  <Trash2 size={14} strokeWidth={2} aria-hidden />
                </span>
              )}
              <FileText size={20} className={styles.uploadFileCardIcon} />
              <p className={styles.uploadFileCardTitle}>{file.name}</p>
              <p className={styles.uploadFileCardMeta}>{file.pages ?? file.pagesCount ?? file.pages_count ?? "—"} pg · {file.size}</p>
              <div className={styles.uploadFileCardFooter}>
                <span className={classNames(styles.fileStatusBadge, styles.uploadFileStatusPill, {
                  [styles.fileStatusBadgeActive]: isSelected && isProcessed && indexStatus !== "not_processed",
                  [styles.fileStatusBadgeChecking]: indexStatus === "checking",
                  [styles.fileStatusBadgeNotProcessed]: !isProcessed || indexStatus === "not_processed",
                })}>
                  {statusLabel}
                </span>
                {showReportBtn && (
                  <span role="button" tabIndex={0} className={styles.uploadFileReportTag} title="View ingestion report" onClick={openReport} onKeyDown={openReportKeyDown}>
                    Report
                  </span>
                )}
              </div>
            </button>
          );
        }

        return (
          <button
            key={file.id}
            type="button"
            className={classNames(styles.uploadFileRow, { [styles.uploadFileRowActive]: String(file.fileId) === activeWorkspaceFileId })}
            onClick={toggleSelect}
            aria-pressed={String(file.fileId) === activeWorkspaceFileId}
          >
            <FileText size={18} className={styles.uploadFileRowIcon} />
            <div className={styles.uploadFileRowMain}>
              <p className={styles.fileItemTitle}>{file.name}</p>
              <p className={styles.fileItemMeta}>
                {(file.fileCode || `FILE-${file.id}`) + " · " + `${file.pages ?? file.pagesCount ?? file.pages_count ?? "-"} pages · ${file.size}`}
              </p>
            </div>
            <div className={styles.uploadFileRowActions}>
              <span
                role="button"
                tabIndex={showReportBtn ? 0 : -1}
                className={classNames(styles.uploadFileReportTag, { [styles.uploadFileReportTagHidden]: !showReportBtn })}
                title="View ingestion report"
                aria-hidden={!showReportBtn}
                onClick={(e) => { if (!showReportBtn) return; openReport(e); }}
                onKeyDown={(e) => { if (!showReportBtn) return; openReportKeyDown(e); }}
              >
                Report
              </span>
              <span className={classNames(styles.fileStatusBadge, styles.uploadFileStatusPill, {
                [styles.fileStatusBadgeActive]: isSelected && isProcessed && indexStatus !== "not_processed",
                [styles.fileStatusBadgeChecking]: indexStatus === "checking",
                [styles.fileStatusBadgeNotProcessed]: !isProcessed || indexStatus === "not_processed",
                [styles.fileStatusBadgeSelected]: isSelected,
              })}>
                {statusLabel}
              </span>
              {file.fileId != null && (
                <span role="button" tabIndex={0} className={styles.uploadFileRowDelete} title="Delete file" onClick={openDelete} onKeyDown={openDeleteKeyDown}>
                  <Trash2 size={15} strokeWidth={2} aria-hidden />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default UploadProjectFilesList;
