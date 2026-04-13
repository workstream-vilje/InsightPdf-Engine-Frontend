import React from 'react';
import classNames from 'classnames';
import { BarChart3, Hash, ArrowUpDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CHUNKING_STRATEGIES } from "@/lib/chunking/data";
import styles from './ChunkStatsPanel.module.css';

const generateStats = (strategy, chunkSize) => {
  const base = Math.floor(4000 / (chunkSize || 1000)) + 2;
  const totalChunks = base + Math.floor(Math.random() * 4);
  const avgTokens = Math.floor((chunkSize || 1000) / 4.2);
  return {
    strategy,
    totalChunks,
    avgTokens,
    largest: (chunkSize || 1000) + Math.floor((chunkSize || 1000) * 0.15),
    smallest: Math.max(50, (chunkSize || 1000) - Math.floor((chunkSize || 1000) * 0.3)),
    distribution: Array.from({ length: 8 }, () => Math.floor(Math.random() * totalChunks * 0.4) + 1),
  };
};

const StatBox = ({ icon, label, value }) => (
  <div className={styles.statBox}>
    <div className={styles.statHeader}>
      {React.cloneElement(icon, { className: styles.statIcon })}
      <span className={styles.statLabel}>{label}</span>
    </div>
    <div className={styles.statValue}>{value}</div>
  </div>
);

const MiniHistogram = ({ data }) => {
  const max = Math.max(...data);
  return (
    <div className={styles.histogram}>
      {data.map((v, i) => (
        <div
          key={i}
          className={styles.histogramBar}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
};

const ChunkStatsPanel = ({ selected = [], configs = {} }) => {
  if (selected.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <p className={styles.emptyText}>Select strategies to see statistics</p>
      </div>
    );
  }

  const allStats = selected.map((id) => generateStats(id, configs[id]?.chunkSize));

  return (
    <div className={styles.statsPanel}>
      <div className={styles.panelHeader}>
        <BarChart3 size={16} className={styles.headerIcon} />
        <span className={styles.headerTitle}>
          Chunk Statistics
        </span>
      </div>

      <ScrollArea className={styles.scrollArea}>
        <div className={styles.content}>
          {allStats.map((stats) => {
            const label = CHUNKING_STRATEGIES.find((s) => s.id === stats.strategy)?.label ?? stats.strategy;
            return (
              <div key={stats.strategy} className={styles.strategyBlock}>
                <div className={styles.strategyHeader}>
                  <Badge variant="outline" className={styles.strategyBadge}>
                    {label}
                  </Badge>
                </div>
                <div className={styles.statGrid}>
                  <StatBox icon={<Hash />} label="Total Chunks" value={stats.totalChunks} />
                  <StatBox icon={<TrendingUp />} label="Avg Tokens" value={stats.avgTokens} />
                  <StatBox icon={<ArrowUpDown />} label="Largest" value={`${stats.largest} chars`} />
                  <StatBox icon={<ArrowUpDown />} label="Smallest" value={`${stats.smallest} chars`} />
                </div>
                <div className={styles.distributionBox}>
                  <span className={styles.distributionLabel}>
                    Distribution
                  </span>
                  <MiniHistogram data={stats.distribution} />
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChunkStatsPanel;
