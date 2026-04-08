"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Cpu,
  Database,
  FileText,
  LayoutDashboard,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  CHUNK_ACCURACY_DATA,
  COMPARISON_DATA,
  DASHBOARD_EXPERIMENTS,
  QUALITY_RADAR_DATA,
  RESPONSE_CHART_DATA,
} from "@/lib/dashboard/data";
import { METRICS_NAV_ITEMS } from "@/lib/projects/data";
import { ROUTE_PATHS } from "@/utils/routepaths";
import styles from "./Analytics.module.css";

const TAB_ICONS = {
  experiments: LayoutDashboard,
  comparison: Database,
  charts: BarChart3,
  recommendation: Trophy,
  profiles: Sparkles,
};

const MetricsScreen = ({ projectId, projectName, categoryName }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("experiments");

  const bestComparison = useMemo(
    () => COMPARISON_DATA.find((item) => item.winner) ?? COMPARISON_DATA[0],
    [],
  );

  return (
    <div className={styles.metricsShell}>
      <main className={styles.metricsMain}>
        <header className={styles.metricsHeader}>
          <div>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => router.push(`${ROUTE_PATHS.HOME}?project=${projectId}`)}
            >
              <ArrowLeft size={16} />
              Back to workspace
            </button>
            <p className={styles.eyebrow}>Metrics workspace</p>
            <h1 className={styles.pageTitle}>
              {projectName}
              <span className={styles.categoryPill}>{categoryName}</span>
            </h1>
          </div>
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <Clock size={16} />
              <div>
                <strong>1.3s</strong>
                <span>Average latency</span>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <Cpu size={16} />
              <div>
                <strong>gpt-4o-mini</strong>
                <span>Current LLM</span>
              </div>
            </div>
          </div>
        </header>

        <section className={styles.metricsContent}>
          {activeTab === "experiments" && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <FileText size={18} />
                <h2>Experiments</h2>
              </div>
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>ID</span>
                  <span>LLM</span>
                  <span>Embedding</span>
                  <span>DB</span>
                  <span>Retrieval</span>
                  <span>Accuracy</span>
                </div>
                {DASHBOARD_EXPERIMENTS.map((item) => (
                  <div key={item.id} className={styles.tableRow}>
                    <span>{item.id}</span>
                    <span>{item.llm}</span>
                    <span>{item.embedding}</span>
                    <span>{item.db}</span>
                    <span>{item.retrieval}</span>
                    <strong>{item.accuracy}%</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "comparison" && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <Database size={18} />
                <h2>Comparison</h2>
              </div>
              <div className={styles.comparisonGrid}>
                {COMPARISON_DATA.map((item) => (
                  <div key={item.strategy} className={styles.comparisonCard}>
                    <div className={styles.comparisonHeader}>
                      <h3>{item.strategy}</h3>
                      {item.winner && <span className={styles.winnerBadge}>Recommended</span>}
                    </div>
                    <p>Chunk size: {item.chunkSize}</p>
                    <p>Overlap: {item.overlap}</p>
                    <p>Accuracy: {item.accuracy}%</p>
                    <p>Latency: {item.latency}s</p>
                    <p>Cost/query: ${item.cost.toFixed(4)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "charts" && (
            <div className={styles.chartScroller}>
              <div className={styles.chartStack}>
                <div className={styles.chartCard}>
                  <div className={styles.panelHeader}>
                    <BarChart3 size={18} />
                    <h2>Response Time by Vector Store</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={RESPONSE_CHART_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="time" fill="rgb(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartGrid}>
                  <div className={styles.chartCard}>
                    <div className={styles.panelHeader}>
                      <Sparkles size={18} />
                      <h2>Chunk Accuracy</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={CHUNK_ACCURACY_DATA}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                        <XAxis dataKey="size" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        <Line type="monotone" dataKey="recursive" stroke="#38bdf8" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="semantic" stroke="#2563eb" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={styles.chartCard}>
                    <div className={styles.panelHeader}>
                      <Trophy size={18} />
                      <h2>Quality Radar</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <RadarChart data={QUALITY_RADAR_DATA}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 11 }} />
                        <Radar
                          name="Accuracy"
                          dataKey="A"
                          stroke="#2563eb"
                          fill="#60a5fa"
                          fillOpacity={0.42}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "recommendation" && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <Trophy size={18} />
                <h2>Recommendation</h2>
              </div>
              <div className={styles.recommendationCard}>
                <p className={styles.eyebrow}>Best configuration</p>
                <h3>{bestComparison.strategy}</h3>
                <p>
                  Best accuracy and relevance balance with chunk size {bestComparison.chunkSize} and
                  overlap {bestComparison.overlap}.
                </p>
                <div className={styles.recommendationMetrics}>
                  <span>{bestComparison.accuracy}% accuracy</span>
                  <span>{bestComparison.latency}s latency</span>
                  <span>${bestComparison.cost.toFixed(4)} cost/query</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "profiles" && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <Sparkles size={18} />
                <h2>Profiles</h2>
              </div>
              <div className={styles.profileList}>
                {[
                  "Research papers optimized",
                  "Financial summary retrieval",
                  "Legal agreement review",
                ].map((profile) => (
                  <div key={profile} className={styles.profileCard}>
                    <div>
                      <strong>{profile}</strong>
                      <p>Saved metrics snapshot for this project configuration.</p>
                    </div>
                    <Button size="sm">Open</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <aside className={styles.metricsSidebar}>
        <div className={styles.sidebarHeader}>
          <p className={styles.eyebrow}>Fixed right sidebar</p>
          <h2>Metrics views</h2>
        </div>

        <div className={styles.sidebarNav}>
          {METRICS_NAV_ITEMS.map((item) => {
            const Icon = TAB_ICONS[item.value];
            return (
              <button
                key={item.value}
                type="button"
                className={`${styles.sidebarButton} ${
                  activeTab === item.value ? styles.sidebarButtonActive : ""
                }`}
                onClick={() => setActiveTab(item.value)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
};

export default MetricsScreen;
