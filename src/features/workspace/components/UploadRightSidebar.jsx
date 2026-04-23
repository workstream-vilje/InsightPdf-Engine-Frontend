"use client";

import classNames from "classnames";
import { FolderKanban, PanelRight, PlayCircle, Sparkles } from "lucide-react";
import { UploadPipelineSidebarSkeletonRows } from "./WorkspaceSkeletons";
import styles from "./Home/Projects.module.css";

const UPLOAD_RIGHT_SIDEBAR_ITEMS = [
  { value: "pipeline", label: "Pipeline", icon: PlayCircle },
  { value: "techniques", label: "Techniques", icon: Sparkles },
  { value: "files", label: "Files", icon: FolderKanban },
];

export default function UploadRightSidebar({
  activeWorkspace,
  uploadRightSidebarWide,
  uploadRightSidebarMode,
  setUploadRightSidebarMode,
  isUploadRightSidebarHovered,
  setIsUploadRightSidebarHovered,
  uploadRightActiveSection,
  setUploadRightActiveSection,
  uploadSidebarControlOpen,
  setUploadSidebarControlOpen,
  uploadSidebarControlRef,
  executionState,
  executionStatusLabel,
  executionSummaryItems,
  hasUploadPipelineOutput,
  uploadSidebarTechniquesConfig,
  selectedWorkspaceFile,
}) {
  return (
    <aside
      className={classNames(styles.workspaceRightSidebar, styles.workspaceUploadRightSidebar, {
        [styles.workspaceRightSidebarExpanded]: uploadRightSidebarWide,
      })}
      onMouseEnter={() => { if (uploadRightSidebarMode === "hover") setIsUploadRightSidebarHovered(true); }}
      onMouseLeave={() => { if (uploadRightSidebarMode === "hover") setIsUploadRightSidebarHovered(false); }}
    >
      <div className={styles.workspaceRightInner}>
        <div className={styles.rightSidebarNav}>
          {UPLOAD_RIGHT_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                className={classNames(styles.rightSidebarButton, {
                  [styles.rightSidebarButtonActive]: uploadRightActiveSection === item.value,
                })}
                onClick={() => setUploadRightActiveSection(item.value)}
              >
                <Icon size={16} />
                {uploadRightSidebarWide && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {uploadRightSidebarWide && (
          <div className={styles.rightSidebarPanels}>
            {uploadRightActiveSection === "pipeline" && (
              <div className={styles.insightPanel}>
                <h3>Pipeline</h3>
                {hasUploadPipelineOutput ? (
                  <>
                    <p className={styles.insightPanelMuted}>{executionState.message || "Latest run status."}</p>
                    <div className={styles.uploadSidebarStatusRow}>
                      <span className={classNames(styles.executionStatusBadge, {
                        [styles.executionStatusBadgeRunning]: executionState.status === "running",
                        [styles.executionStatusBadgeSuccess]: executionState.status === "success",
                        [styles.executionStatusBadgeError]: executionState.status === "error",
                      })}>
                        {executionStatusLabel}
                      </span>
                    </div>
                    {executionState.status === "running" ? (
                      <UploadPipelineSidebarSkeletonRows />
                    ) : (
                      executionSummaryItems.slice(0, 6).map((item) => (
                        <div key={item.label} className={styles.uploadSidebarKv}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <p className={styles.insightPanelMuted}>Run the pipeline to see status, chunk counts, and embeddings here.</p>
                )}
              </div>
            )}

            {uploadRightActiveSection === "techniques" && uploadSidebarTechniquesConfig && (
              <div className={styles.insightPanel}>
                <h3>Techniques</h3>
                <dl className={styles.uploadSidebarTechniquesDl}>
                  <dt>Chunk</dt>
                  <dd>{uploadSidebarTechniquesConfig.text_processing?.chunk_size} / overlap {uploadSidebarTechniquesConfig.text_processing?.chunk_overlap}</dd>
                  <dt>Splitter</dt>
                  <dd>{JSON.stringify(uploadSidebarTechniquesConfig.text_processing?.splitter)}</dd>
                  <dt>Extraction</dt>
                  <dd>{JSON.stringify(uploadSidebarTechniquesConfig.data_extraction?.method)}</dd>
                  <dt>Embeddings</dt>
                  <dd>{uploadSidebarTechniquesConfig.embeddings?.provider} / {uploadSidebarTechniquesConfig.embeddings?.model}</dd>
                  <dt>Vector store</dt>
                  <dd>{(uploadSidebarTechniquesConfig.vector_store?.backends || []).join(", ") || "—"}</dd>
                </dl>
              </div>
            )}

            {uploadRightActiveSection === "files" && (
              <div className={styles.insightPanel}>
                <h3>Files</h3>
                <p className={styles.insightPanelMuted}>
                  {activeWorkspace.files.length} file{activeWorkspace.files.length === 1 ? "" : "s"} in this project
                </p>
                {selectedWorkspaceFile && (
                  <p className={styles.insightPanelMuted}>Selected: <strong>{selectedWorkspaceFile.name}</strong></p>
                )}
              </div>
            )}
          </div>
        )}

        <div className={styles.uploadRightSidebarFooter} ref={uploadSidebarControlRef}>
          <button
            type="button"
            className={styles.uploadSidebarFooterButton}
            title="Sidebar layout"
            aria-expanded={uploadSidebarControlOpen}
            aria-haspopup="menu"
            onClick={() => setUploadSidebarControlOpen((o) => !o)}
          >
            <PanelRight size={16} strokeWidth={2} aria-hidden />
            {uploadRightSidebarWide && <span>Layout</span>}
          </button>
          {uploadSidebarControlOpen && (
            <div className={styles.uploadSidebarModeMenu} role="menu">
              {[
                { id: "hover", label: "Expand on hover" },
                { id: "expanded", label: "Always expanded" },
                { id: "collapsed", label: "Collapsed" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitem"
                  className={classNames(styles.uploadSidebarModeOption, {
                    [styles.uploadSidebarModeOptionActive]: uploadRightSidebarMode === opt.id,
                  })}
                  onClick={() => {
                    setUploadRightSidebarMode(opt.id);
                    setUploadSidebarControlOpen(false);
                    if (opt.id === "collapsed") setIsUploadRightSidebarHovered(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
