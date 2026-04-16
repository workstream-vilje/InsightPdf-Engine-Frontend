"use client";
import React, { useState } from "react";
import classNames from "classnames";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Database,
  Activity,
  FileText,
  Clock,
  Cpu,
  DollarSign,
  Target,
  Zap,
  Hash,
  ChevronDown,
  PanelRightClose,
  PanelRight,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import styles from "./RightSidebar.module.css";

const Section = ({
  title,
  icon: Icon,
  badge,
  children,
  defaultOpen = false,
  isCollapsed,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={classNames(styles.section, {
        [styles.sectionOpen]: open,
        [styles.sectionCollapsed]: isCollapsed,
      })}
    >
      <button
        onClick={() => setOpen(!open)}
        className={classNames(styles.sectionHeader, {
          [styles.headerOpen]: open,
          [styles.headerCollapsed]: isCollapsed,
        })}
      >
        <div className={styles.sectionTitleWrapper}>
          <Icon size={14} className={styles.sectionIcon} />
          {!isCollapsed && <span className={styles.sectionTitle}>{title}</span>}
        </div>

        {!isCollapsed && (
          <div className={styles.headerRight}>
            {badge && <span className={styles.sectionBadge}>{badge}</span>}
            <motion.div
              animate={{ rotate: open ? 0 : -90 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <ChevronDown size={14} className={styles.chevron} />
            </motion.div>
          </div>
        )}
      </button>

      <AnimatePresence>
        {open && !isCollapsed && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className={styles.sectionContent}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PerfCard = ({ icon: Icon, label, value, sub }) => (
  <div className={styles.perfCard}>
    <div className={styles.perfCardTop}>
      <Icon size={12} className={styles.perfCardIcon} />
      <span className={styles.perfCardLabel}>{label}</span>
    </div>
    <div className={styles.perfCardValue}>{value}</div>
    <div className={styles.perfCardSub}>{sub}</div>
  </div>
);

const formatMs = (value) => `${(Number(value || 0) / 1000).toFixed(2)}s`;
const formatCurrency = (value) => `$${Number(value || 0).toFixed(3)}`;
const formatNumber = (value) => new Intl.NumberFormat().format(Number(value || 0));

const ResultsPanel = ({ isCollapsed, setIsCollapsed, resultsData }) => {
  const chunks = resultsData?.chunks || [];
  const qualityMetrics = resultsData?.qualityMetrics || [];
  const performance = resultsData?.performance || {};

  return (
    <div
      className={classNames(styles.resultsPanel, {
        [styles.collapsed]: isCollapsed,
      })}
    >
      <div className={styles.panelHeader}>
        {!isCollapsed && (
          <div className={styles.headerLeft}>
            <Activity size={14} className={styles.headerIcon} />
            <span className={styles.headerTitle}>REAL-TIME RESULTS</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={styles.collapseToggle}
          title={isCollapsed ? "Expand Results" : "Collapse Results"}
        >
          {isCollapsed ? (
            <PanelRight size={16} />
          ) : (
            <PanelRightClose size={16} />
          )}
        </button>
      </div>

      <ScrollArea className={styles.scrollArea}>
        <div className={styles.content}>
          <Section title="Response" icon={MessageSquare} isCollapsed={isCollapsed}>
            <div className={styles.responseCard}>
              <p>
                {resultsData?.response ||
                  "Run a query to see the generated response."}
              </p>
            </div>
          </Section>

          <Section
            title="Retrieved Chunks"
            icon={Database}
            badge={`${chunks.length}`}
            isCollapsed={isCollapsed}
          >
            <div className={styles.chunkList}>
              {chunks.map((chunk, index) => (
                <div key={chunk.id || index} className={styles.chunkCard}>
                  <div className={styles.chunkHeader}>
                    <div className={styles.chunkMeta}>
                      <div className={styles.chunkIconBox}>
                        <FileText size={12} />
                      </div>
                      <div className={styles.chunkInfo}>
                        <span className={styles.metaLabel}>DOCUMENT SOURCE</span>
                        <span className={styles.metaValue}>
                          {String(chunk.source || "DOCUMENT").toUpperCase()} | PAGE{" "}
                          {chunk.page}
                        </span>
                      </div>
                    </div>
                    <div className={styles.chunkScoreRow}>
                      <span className={styles.scoreLabel}>SIMILARITY</span>
                      <span className={styles.scoreValue}>
                        {Number(chunk.score || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <p className={styles.chunkText}>{chunk.text}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Execution Performance"
            icon={Activity}
            isCollapsed={isCollapsed}
          >
            <div className={styles.integratedGrid}>
              <PerfCard
                icon={Clock}
                label="Total Time"
                value={formatMs(performance.totalTime)}
                sub="Response latency"
              />
              <PerfCard
                icon={Zap}
                label="Embed Time"
                value={formatMs(performance.embedTime)}
                sub="Vector encoding"
              />
              <PerfCard
                icon={Target}
                label="Retrieval"
                value={formatMs(performance.retrievalTime)}
                sub="Chunk search"
              />
              <PerfCard
                icon={Cpu}
                label="LLM Gen"
                value={formatMs(performance.llmGenTime)}
                sub="Token generation"
              />
              <PerfCard
                icon={Hash}
                label="Tokens"
                value={formatNumber(performance.totalTokens)}
                sub="Input + Output"
              />
              <PerfCard
                icon={DollarSign}
                label="Cost"
                value={formatCurrency(performance.cost)}
                sub="Per query"
              />
            </div>
          </Section>

          <Section title="Quality Metrics" icon={Target} isCollapsed={isCollapsed}>
            <div className={styles.accuracyList}>
              {qualityMetrics.map((metric) => (
                <div key={metric.label} className={styles.accuracyItem}>
                  <div className={styles.accuracyHeader}>
                    <span className={styles.accuracyLabel}>
                      {String(metric.label || "").toUpperCase()}
                    </span>
                    <span className={styles.accuracyValue}>
                      {metric.value}%
                    </span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ResultsPanel;
