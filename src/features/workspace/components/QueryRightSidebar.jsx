"use client";

import classNames from "classnames";
import { ChevronRight, Database, FileText, MessageSquare, Sparkles } from "lucide-react";
import { DEFAULT_QUALITY_METRICS } from "@/lib/projects/data";
import { ExecutionPerformanceSkeletonGrid } from "./WorkspaceSkeletons";
import styles from "./Home/Projects.module.css";

const RIGHT_SIDEBAR_ITEMS = [
  { value: "response", label: "Response", icon: MessageSquare },
  { value: "chunks", label: "Retrieved Chunks", icon: FileText },
  { value: "performance", label: "Execution Performance", icon: Sparkles },
  { value: "quality", label: "Quality Metrics", icon: Database },
];

export default function QueryRightSidebar({
  activeWorkspace,
  updateActiveWorkspace,
  queryRightSidebarWide,
  isQueryRightSidebarPinned,
  setIsQueryRightSidebarPinned,
  setIsQueryRightSidebarExpanded,
  perf,
  perfLoading,
  perfError,
  latestPerformanceCards,
  performanceResponseVariants,
  selectedPerformanceResponseIndex,
  setSelectedPerformanceResponseIndex,
  historyEntries,
  historyLoading,
  historyError,
}) {
  return (
    <aside
      className={classNames(styles.workspaceRightSidebar, {
        [styles.workspaceRightSidebarExpanded]: queryRightSidebarWide,
      })}
      onMouseEnter={() => setIsQueryRightSidebarExpanded(true)}
      onMouseLeave={() => { if (!isQueryRightSidebarPinned) setIsQueryRightSidebarExpanded(false); }}
    >
      <div className={styles.workspaceRightInner}>
        <div className={styles.rightSidebarNav}>
          {RIGHT_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                className={classNames(styles.rightSidebarButton, {
                  [styles.rightSidebarButtonActive]: activeWorkspace.activeRightSection === item.value,
                })}
                onClick={() => updateActiveWorkspace((c) => ({ ...c, activeRightSection: item.value }))}
              >
                <Icon size={16} />
                {queryRightSidebarWide && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {queryRightSidebarWide && (
          <div className={styles.rightSidebarPanels}>
            {activeWorkspace.activeRightSection === "response" && (
              <div className={styles.insightPanel}>
                <h3>Response</h3>
                <p>{activeWorkspace.responseVisible ? activeWorkspace.response : "The answer will appear here after query processing completes."}</p>
              </div>
            )}

            {activeWorkspace.activeRightSection === "chunks" && (
              <div className={styles.insightPanel}>
                <h3>Retrieved Chunks</h3>
                <div className={styles.chunkList}>
                  {activeWorkspace.retrievedChunks.map((chunk, index) => (
                    <div key={`${chunk.title}-${index}`} className={styles.chunkItem}>
                      <div className={styles.chunkItemMeta}>
                        <span>{chunk.title}</span>
                        <span>{chunk.score.toFixed(2)}</span>
                      </div>
                      <p>{chunk.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeWorkspace.activeRightSection === "performance" && (
              <div className={styles.insightPanel}>
                <div className={styles.performanceHeader}>
                  <div>
                    <h3>Execution Performance</h3>
                    <p>Switch between responses to view their stored performance metrics.</p>
                  </div>
                  {performanceResponseVariants.length > 0 && (
                    <div className={styles.performanceSelector}>
                      {performanceResponseVariants.slice(0, 2).map((variant, index) => (
                        <button
                          key={variant?.experimentId || `response-${index}`}
                          type="button"
                          className={`${styles.performanceSelectorButton} ${index === selectedPerformanceResponseIndex ? styles.performanceSelectorButtonActive : ""}`}
                          onClick={() => setSelectedPerformanceResponseIndex(index)}
                        >
                          Res-{index + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {perfLoading && <ExecutionPerformanceSkeletonGrid />}
                {perfError && <div>{perfError}</div>}
                {!perfLoading && !perfError && !perf && <div>No stored rows found for this experiment yet.</div>}
                {!perfLoading && !perfError && perf && (
                  <div className={styles.performancePanel}>
                    <div className={styles.metricGrid}>
                      {latestPerformanceCards.map((metric) => (
                        <div key={metric.label} className={styles.metricCard}>
                          <span>{metric.label}</span>
                          <strong>{metric.value}</strong>
                          <small>{metric.sub}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeWorkspace.activeRightSection === "history" && (
              <div className={styles.insightPanel}>
                <h3>Experiment History</h3>
                {historyLoading && <div>Loading history...</div>}
                {historyError && <div>{historyError}</div>}
                {!historyLoading && !historyError && historyEntries.length === 0 && <div>No history data available for this project.</div>}
                {!historyLoading && !historyError && historyEntries.length > 0 && (
                  <div className={styles.metricGrid}>
                    {historyEntries.map((entry) => (
                      <div key={entry.id} className={styles.metricCard}>
                        <span>{entry.id}</span>
                        <strong>{entry.metrics?.accuracy ?? 0}%</strong>
                        <small>{entry.date}</small>
                        <small>Latency: {entry.metrics?.latency || "-"}</small>
                        <small>Cost: {entry.metrics?.cost || "-"}</small>
                        <small>Relevance: {entry.metrics?.relevance ?? 0}%</small>
                        <small>DB: {entry.config?.db || "-"}</small>
                        <small>Retrieval: {entry.config?.retrieval || "-"}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeWorkspace.activeRightSection === "quality" && (
              <div className={styles.insightPanel}>
                <h3>Quality Metrics</h3>
                <div className={styles.qualityList}>
                  {(activeWorkspace.qualityMetrics || DEFAULT_QUALITY_METRICS).map((metric) => (
                    <div key={metric.label} className={styles.qualityRow}>
                      <div className={styles.qualityHeader}>
                        <span>{metric.label}</span>
                        <strong>{Number(metric.value || 0).toFixed(1)}%</strong>
                      </div>
                      <div className={styles.qualityTrack}>
                        <div className={styles.qualityBar} style={{ width: `${Number(metric.value || 0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className={styles.rightSidebarCollapseButton}
          onClick={() => {
            const nextPinned = !isQueryRightSidebarPinned;
            setIsQueryRightSidebarPinned(nextPinned);
            setIsQueryRightSidebarExpanded(nextPinned);
          }}
          title={isQueryRightSidebarPinned ? "Collapse sidebar" : "Keep expanded"}
        >
          <ChevronRight
            size={15}
            className={classNames(styles.rightSidebarCollapseIcon, {
              [styles.rightSidebarCollapseIconOpen]: queryRightSidebarWide,
            })}
          />
          {queryRightSidebarWide && <span>{isQueryRightSidebarPinned ? "Collapse" : "Pin open"}</span>}
        </button>
      </div>
    </aside>
  );
}
