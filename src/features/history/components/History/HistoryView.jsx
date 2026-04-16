import React from "react";
import classNames from "classnames";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Cpu,
  Database,
  Zap,
  CheckCircle2,
  Trophy,
  Search,
  ExternalLink,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonBlock } from "@/components/skeletons/SkeletonPrimitives";
import projectApi from "@/services/api/networking/apis/project";
import { ROUTE_PATHS, workspaceUploadUrl } from "@/utils/routepaths";
import HistoryViewSkeleton from "./HistoryViewSkeleton";
import styles from "./HistoryView.module.css";

const csvEscape = (value) => {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const buildHistoryCsv = (entries) => {
  const headers = [
    "Run ID",
    "Date",
    "LLM",
    "Embedding",
    "Vector DB",
    "Retrieval",
    "Accuracy %",
    "Latency",
    "Cost",
    "Status",
    "Optimal run",
  ];
  const lines = [headers.join(",")];
  for (const entry of entries) {
    const c = entry?.config || {};
    const m = entry?.metrics || {};
    lines.push(
      [
        csvEscape(entry?.id),
        csvEscape(entry?.date),
        csvEscape(c.llm),
        csvEscape(c.embedding),
        csvEscape(c.db),
        csvEscape(c.retrieval),
        csvEscape(m.accuracy),
        csvEscape(m.latency),
        csvEscape(m.cost),
        csvEscape(entry?.status),
        csvEscape(entry?.isBest ? "Yes" : "No"),
      ].join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}`;
};

const resolveStatusClass = (status) => {
  const raw = String(status ?? "").toLowerCase();
  if (raw.includes("verif")) return styles.status_verified;
  if (raw.includes("stable")) return styles.status_stable;
  if (raw.includes("expir")) return styles.status_expiring;
  return styles.status_unknown;
};

const HistoryView = () => {
  const router = useRouter();
  const [projects, setProjects] = React.useState([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [historyEntries, setHistoryEntries] = React.useState([]);
  const [projectsLoading, setProjectsLoading] = React.useState(true);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [searchValue, setSearchValue] = React.useState("");

  React.useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      setProjectsLoading(true);
      try {
        const response = await projectApi.fetchAllProjects();
        const projectRows = response?.data || [];
        if (!isMounted) return;
        setProjects(projectRows);
        setSelectedProjectId("");
      } catch (error) {
        if (!isMounted) return;
        setProjects([]);
        setSelectedProjectId("");
      } finally {
        if (isMounted) {
          setProjectsLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await projectApi.fetchUserHistory(selectedProjectId);
        if (!isMounted) return;
        setHistoryEntries(Array.isArray(response) ? response : []);
      } catch (error) {
        if (!isMounted) return;
        setHistoryEntries([]);
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  const filteredEntries = historyEntries.filter((entry) => {
    const search = searchValue.trim().toLowerCase();
    if (!search) return true;

    return [
      entry?.id,
      entry?.date,
      entry?.config?.llm,
      entry?.config?.embedding,
      entry?.config?.db,
      entry?.config?.retrieval,
      entry?.status,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  const handleBack = React.useCallback(() => {
    if (typeof window === "undefined") {
      router.push(ROUTE_PATHS.WORKSPACE_UPLOAD);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const projectFromUrl = params.get("project");
    router.push(projectFromUrl ? workspaceUploadUrl(projectFromUrl) : ROUTE_PATHS.WORKSPACE_UPLOAD);
  }, [router]);

  const handleExportCsv = React.useCallback(() => {
    if (!filteredEntries.length) return;
    const blob = new Blob([buildHistoryCsv(filteredEntries)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    anchor.href = url;
    anchor.download = `history-export-${stamp}.csv`;
    anchor.rel = "noopener";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [filteredEntries]);

  return (
    <div className={styles.logsShell}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <button type="button" className={styles.logsOutlineButton} onClick={handleBack}>
            <ArrowLeft size={16} strokeWidth={2.5} aria-hidden />
            Back
          </button>
          <h1 className={styles.pageTitle}>Run history</h1>
        </div>
        <button
          type="button"
          className={styles.logsPrimaryButton}
          onClick={handleExportCsv}
          disabled={historyLoading || filteredEntries.length === 0}
          title={
            filteredEntries.length === 0
              ? "No rows to export"
              : "Download visible rows as a CSV file"
          }
        >
          <Download size={15} strokeWidth={2.25} aria-hidden />
          Export CSV
        </button>
      </header>

      <div className={styles.utilityBar}>
        <div className={styles.utilityLeft}>
          {projectsLoading ? (
            <div className={styles.utilitySkeleton} aria-hidden>
              <SkeletonBlock style={{ width: 260, height: 36, borderRadius: 6 }} />
              <SkeletonBlock style={{ width: 220, height: 36, borderRadius: 6 }} />
            </div>
          ) : (
            <>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} aria-hidden />
                <input
                  type="search"
                  placeholder="Filter rows…"
                  className={styles.searchInput}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  disabled={historyLoading}
                  aria-label="Filter history rows"
                />
              </div>
              <select
                className={styles.projectSelect}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={historyLoading}
                aria-label="Project filter"
              >
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.tableHeader}>
          <div className={styles.colRun}>Run</div>
          <div className={styles.colConfig}>Pipeline configuration</div>
          <div className={styles.colMetrics}>Metrics</div>
          <div className={styles.colStatus}>Status</div>
          <div className={styles.colActions}>Report</div>
        </div>

        <div className={styles.tableBody}>
          {historyLoading ? (
            <HistoryViewSkeleton rowCount={8} />
          ) : filteredEntries.length ? (
            <AnimatePresence>
              {filteredEntries.map((entry, index) => {
                const cfg = entry?.config || {};
                const metrics = entry?.metrics || {};
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.4) }}
                    className={classNames(styles.row, { [styles.bestRow]: entry.isBest })}
                  >
                    <div className={styles.colRun}>
                      <div className={styles.runInfo}>
                        <span className={styles.runId}>{entry.id}</span>
                        <span className={styles.runDate}>{entry.date}</span>
                      </div>
                      {entry.isBest && (
                        <div className={styles.bestBadge}>
                          <Trophy size={10} aria-hidden />
                          Optimal
                        </div>
                      )}
                    </div>

                    <div className={styles.colConfig}>
                      <div className={styles.configGrid}>
                        <div className={styles.configChip}>
                          <Cpu size={11} aria-hidden />
                          <span title={cfg.llm}>{cfg.llm ?? "—"}</span>
                        </div>
                        <div className={styles.configChip}>
                          <Zap size={11} aria-hidden />
                          <span title={cfg.embedding}>{cfg.embedding ?? "—"}</span>
                        </div>
                        <div className={styles.configChip}>
                          <Database size={11} aria-hidden />
                          <span title={cfg.db}>{cfg.db ?? "—"}</span>
                        </div>
                        <div className={styles.configChip}>
                          <FileText size={11} aria-hidden />
                          <span title={cfg.retrieval}>{cfg.retrieval ?? "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.colMetrics}>
                      <div className={styles.metricsRow}>
                        <div className={styles.metricItem}>
                          <span className={styles.metricLabel}>Accuracy</span>
                          <span className={styles.metricValue}>
                            {metrics.accuracy != null ? `${metrics.accuracy}%` : "—"}
                          </span>
                        </div>
                        <div className={styles.metricItem}>
                          <span className={styles.metricLabel}>Latency</span>
                          <span className={styles.metricValue}>{metrics.latency ?? "—"}</span>
                        </div>
                        <div className={styles.metricItem}>
                          <span className={styles.metricLabel}>Cost</span>
                          <span className={styles.metricValue}>{metrics.cost ?? "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.colStatus}>
                      <div className={classNames(styles.statusBadge, resolveStatusClass(entry.status))}>
                        <CheckCircle2 size={11} aria-hidden />
                        <span>{entry.status ?? "—"}</span>
                      </div>
                    </div>

                    <div className={styles.colActions}>
                      <Button variant="ghost" size="sm" className={styles.reportBtn} type="button">
                        <FileText size={14} aria-hidden />
                        <span>View report</span>
                        <ExternalLink size={11} className={styles.externalIcon} aria-hidden />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className={styles.emptyState}>
              {selectedProjectId
                ? "No history for this project yet."
                : "No history for this account yet."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
