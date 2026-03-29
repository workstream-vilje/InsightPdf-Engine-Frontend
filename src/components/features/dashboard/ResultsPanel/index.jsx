"use client";
import React, { useState } from 'react';
import classNames from 'classnames';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RETRIEVED_CHUNKS } from '@/lib/dashboard/data';
import styles from './styles.module.css';

/* ─── Simplified Collapsible Section (Accordion Style) ─────────────────── */
const Section = ({ title, icon: Icon, badge, children, defaultOpen = false, isCollapsed }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={classNames(styles.section, { [styles.sectionOpen]: open, [styles.sectionCollapsed]: isCollapsed })}>
      <button
        onClick={() => setOpen(!open)}
        className={classNames(styles.sectionHeader, { [styles.headerOpen]: open, [styles.headerCollapsed]: isCollapsed })}
      >
        <div className={styles.sectionTitleWrapper}>
          <Icon size={14} className={styles.sectionIcon} />
          {!isCollapsed && <span className={styles.sectionTitle}>{title}</span>}
        </div>

        {!isCollapsed && (
          <div className={styles.headerRight}>
            {badge && (
              <span className={styles.sectionBadge}>{badge}</span>
            )}
            <motion.div
              animate={{ rotate: open ? 0 : -90 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
            animate={{ height: 'auto', opacity: 1 }}
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

/* ─── Performance metric card (Integrated Grid Style) ─────────────────────── */
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

/* ─── Main Panel ─────────────────────────────────────────────────────────── */
const ResultsPanel = ({ isCollapsed, setIsCollapsed }) => {
  const chunks = RETRIEVED_CHUNKS;

  return (
    <div className={classNames(styles.resultsPanel, { [styles.collapsed]: isCollapsed })}>
      {/* Header */}
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
          {isCollapsed ? <PanelRight size={16} /> : <PanelRightClose size={16} />}
        </button>
      </div>

      <ScrollArea className={styles.scrollArea}>
        <div className={styles.content}>

          {/* ── Section 0: Response ────────────────────────────────── */}
          <Section title="Response" icon={MessageSquare} isCollapsed={isCollapsed}>
            <div className={styles.responseCard}>
              <p>
                Revenue grew 23.4% YoY in Q4 2024, reaching $4.2B. Enterprise segment
                growth of 31% and cloud services expansion were primary drivers. Gross
                margin improved to 68.2%.
              </p>
            </div>
          </Section>

          {/* ── Section 1: Retrieved Chunks ───────────────────────── */}
          <Section
            title="Retrieved Chunks"
            icon={Database}
            badge={`${chunks.length}`}
            isCollapsed={isCollapsed}
          >
            <div className={styles.chunkList}>
              {chunks.map((chunk, i) => (
                <div key={i} className={styles.chunkCard}>
                  <div className={styles.chunkHeader}>
                    <div className={styles.chunkMeta}>
                      <div className={styles.chunkIconBox}>
                        <FileText size={12} />
                      </div>
                      <div className={styles.chunkInfo}>
                        <span className={styles.metaLabel}>DOCUMENT SOURCE</span>
                        <span className={styles.metaValue}>
                          ANNUAL_REPORT_24.PDF · PAGE {chunk.page}
                        </span>
                      </div>
                    </div>
                    <div className={styles.chunkScoreRow}>
                      <span className={styles.scoreLabel}>SIMILARITY</span>
                      <span className={styles.scoreValue}>{chunk.score.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className={styles.chunkText}>{chunk.text}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Section 2: Execution Performance ─────────────────── */}
          <Section title="Execution Performance" icon={Activity} isCollapsed={isCollapsed}>
            {/* Integrated 2-column grid pattern for metrics */}
            <div className={styles.integratedGrid}>
              <PerfCard icon={Clock} label="Total Time" value="1.3s" sub="Response latency" />
              <PerfCard icon={Zap} label="Embed Time" value="0.2s" sub="Vector encoding" />
              <PerfCard icon={Target} label="Retrieval" value="0.4s" sub="Chunk search" />
              <PerfCard icon={Cpu} label="LLM Gen" value="0.7s" sub="Token generation" />
              <PerfCard icon={Hash} label="Tokens" value="2,847" sub="Input + Output" />
              <PerfCard icon={DollarSign} label="Cost" value="$0.014" sub="Per query" />
            </div>
          </Section>

          {/* ── Section 3: Quality Metrics ─────────────────────────── */}
          <Section title="Quality Metrics (RAGAS)" icon={Target} isCollapsed={isCollapsed}>
            <div className={styles.accuracyList}>
              {[
                { label: 'FAITHFULNESS', value: 92 },
                { label: 'CONTEXT PRECISION', value: 88 },
                { label: 'CONTEXT RECALL', value: 85 },
                { label: 'ANSWER RELEVANCE', value: 91 },
              ].map((m) => (
                <div key={m.label} className={styles.accuracyItem}>
                  <div className={styles.accuracyHeader}>
                    <span className={styles.accuracyLabel}>{m.label}</span>
                    <span className={styles.accuracyValue}>{m.value}%</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${m.value}%` }}
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
