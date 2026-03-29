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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_EXPERIMENTS,
  COMPARISON_DATA
} from "@/lib/dashboard/data";
import styles from './styles.module.css';

const HistoryView = () => {
  // Mock history data based on combinations
  const historyEntries = [
    {
      id: "H-240329-01",
      date: "2024-03-29 14:22",
      config: {
        llm: "GPT-4o",
        embedding: "OpenAI v3-Small",
        db: "PGVector (v0.5)",
        retrieval: "Semantic Rerank",
      },
      metrics: {
        accuracy: 94.2,
        latency: "1.2s",
        cost: "$0.012",
        relevance: 91
      },
      status: "Verified",
      isBest: true
    },
    {
      id: "H-240328-15",
      date: "2024-03-28 09:15",
      config: {
        llm: "Claude 3 Sonnet",
        embedding: "Anthropic v1",
        db: "Pinecone",
        retrieval: "Hybrid Search",
      },
      metrics: {
        accuracy: 88.5,
        latency: "1.5s",
        cost: "$0.009",
        relevance: 84
      },
      status: "Stable",
      isBest: false
    },
    {
      id: "H-240327-11",
      date: "2024-03-27 16:45",
      config: {
        llm: "Mistral Large",
        embedding: "MiniLM-L6",
        db: "FAISS (Local)",
        retrieval: "MMR (k=5)",
      },
      metrics: {
        accuracy: 82.1,
        latency: "0.4s",
        cost: "$0.002",
        relevance: 78
      },
      status: "Expiring",
      isBest: false
    }
  ];

  return (
    <div className={styles.container}>
      {/* ── MINIMAL UTILITY BAR ─────────────────────────────────── */}
      <div className={styles.utilityBar}>
        <div className={styles.utilityLeft}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input type="text" placeholder="Filter combinations..." className={styles.searchInput} />
          </div>
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
          <AnimatePresence>
            {historyEntries.map((entry, index) => (
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
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
