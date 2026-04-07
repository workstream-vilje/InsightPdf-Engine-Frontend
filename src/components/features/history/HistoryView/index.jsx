import React from 'react';
import classNames from 'classnames';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Cpu,
  Database,
  Zap,
  Clock,
  Download,
  MoreVertical,
  CheckCircle2,
  Activity,
  Trophy,
  Filter,
  Search,
  ExternalLink
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import projectApi from "@/networking/apis/project";
import styles from './styles.module.css';

const HistoryView = () => {
  const [projects, setProjects] = React.useState([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [historyEntries, setHistoryEntries] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchValue, setSearchValue] = React.useState("");

  React.useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        const response = await projectApi.fetchAllProjects();
        const projectRows = response?.data || [];
        if (!isMounted) return;
        setProjects(projectRows);
        setSelectedProjectId(projectRows[0]?.id ? String(projectRows[0].id) : "");
      } catch (error) {
        if (!isMounted) return;
        setProjects([]);
        setSelectedProjectId("");
      } finally {
        if (isMounted) {
          setIsLoading(false);
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
      if (!selectedProjectId) {
        if (!isMounted) return;
        setHistoryEntries([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await projectApi.fetchProjectHistory(selectedProjectId);
        if (!isMounted) return;
        setHistoryEntries(Array.isArray(response) ? response : []);
      } catch (error) {
        if (!isMounted) return;
        setHistoryEntries([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
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

  return (
    <div className={styles.container}>
      {/* ── MINIMAL UTILITY BAR ─────────────────────────────────── */}
      <div className={styles.utilityBar}>
        <div className={styles.utilityLeft}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Filter combinations..."
              className={styles.searchInput}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <select
            className={styles.searchInput}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.utilityRight}>
          <Button variant="outline" size="sm" className={styles.filterBtn}>
            <Filter size={14} />
            <span>Filters</span>
          </Button>
          <Button className={styles.exportBtn}>
            <Download size={14} />
            <span>Export Log</span>
          </Button>
        </div>
      </div>

      {/* ── HISTORY LIST/TABLE ───────────────────────────────────── */}
      <div className={styles.content}>
        <div className={styles.tableHeader}>
          <div className={styles.colRun}>RUN IDENTIFIER</div>
          <div className={styles.colConfig}>PIPELINE CONFIGURATION</div>
          <div className={styles.colMetrics}>CORE METRICS</div>
          <div className={styles.colStatus}>STATUS</div>
          <div className={styles.colActions}>REPORT</div>
        </div>

        <div className={styles.tableBody}>
          {isLoading ? (
            <div className={styles.row}>Loading history...</div>
          ) : filteredEntries.length ? (
            <AnimatePresence>
            {filteredEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={classNames(styles.row, { [styles.bestRow]: entry.isBest })}
              >
                {/* Run Info */}
                <div className={styles.colRun}>
                  <div className={styles.runInfo}>
                    <span className={styles.runId}>{entry.id}</span>
                    <span className={styles.runDate}>{entry.date}</span>
                  </div>
                  {entry.isBest && (
                    <div className={styles.bestBadge}>
                      <Trophy size={10} />
                      OPTIMAL
                    </div>
                  )}
                </div>

                {/* Configuration */}
                <div className={styles.colConfig}>
                  <div className={styles.configGrid}>
                    <div className={styles.configChip}>
                      <Cpu size={10} />
                      <span>{entry.config.llm}</span>
                    </div>
                    <div className={styles.configChip}>
                      <Zap size={10} />
                      <span>{entry.config.embedding}</span>
                    </div>
                    <div className={styles.configChip}>
                      <Database size={10} />
                      <span>{entry.config.db}</span>
                    </div>
                    <div className={styles.configChip}>
                      <FileText size={10} />
                      <span>{entry.config.retrieval}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className={styles.colMetrics}>
                  <div className={styles.metricsRow}>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>ACCURACY</span>
                      <span className={styles.metricValue}>{entry.metrics.accuracy}%</span>
                    </div>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>LATENCY</span>
                      <span className={styles.metricValue}>{entry.metrics.latency}</span>
                    </div>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>COST</span>
                      <span className={styles.metricValue}>{entry.metrics.cost}</span>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className={styles.colStatus}>
                  <div className={classNames(styles.statusBadge, styles[`status_${entry.status.toLowerCase()}`])}>
                    <CheckCircle2 size={10} />
                    <span>{entry.status}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.colActions}>
                  <Button variant="ghost" size="sm" className={styles.reportBtn}>
                    <FileText size={14} />
                    <span>View Full Report</span>
                    <ExternalLink size={10} className={styles.externalIcon} />
                  </Button>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          ) : (
            <div className={styles.row}>No history data available for the selected project.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
