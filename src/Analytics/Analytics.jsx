"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import comparisonApi from "@/networking/apis/comparison";
import projectApi from "@/networking/apis/project";
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
  const [historyEntries, setHistoryEntries] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      if (!projectId) return;

      setIsLoadingHistory(true);
      setHistoryError("");

      try {
        const response = await projectApi.fetchProjectHistory(projectId);
        if (!isMounted) return;
        setHistoryEntries(Array.isArray(response) ? response : []);
      } catch (error) {
        if (!isMounted) return;
        setHistoryEntries([]);
        setHistoryError(
          error?.payload?.detail ||
            error?.payload?.message ||
            error?.message ||
            "Failed to load experiment history",
        );
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;

    const loadComparison = async () => {
      if (!projectId) return;

      setIsLoadingComparison(true);
      setComparisonError("");

      try {
        const response = await comparisonApi.fetchComparisonAnalytics(projectId);
        if (!isMounted) return;
        setComparisonData(response?.data || null);
      } catch (error) {
        if (!isMounted) return;
        setComparisonData(null);
        setComparisonError(
          error?.payload?.detail ||
            error?.payload?.message ||
            error?.message ||
            "Failed to load comparison analytics",
        );
      } finally {
        if (isMounted) {
          setIsLoadingComparison(false);
        }
      }
    };

    loadComparison();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const experimentRows = useMemo(
    () =>
      historyEntries.map((entry) => ({
        id: entry?.id || "-",
        llm: entry?.config?.llm || "-",
        embedding: entry?.config?.embedding || "-",
        db: entry?.config?.db || "-",
        retrieval: entry?.config?.retrieval || "-",
        accuracy:
          typeof entry?.metrics?.accuracy === "number"
            ? `${Math.round(entry.metrics.accuracy)}%`
            : "-",
      })),
    [historyEntries],
  );

  const averageLatency = useMemo(() => {
    if (!historyEntries.length) return "0.00s";

    const seconds = historyEntries
      .map((entry) => Number.parseFloat(String(entry?.metrics?.latency || "0").replace("s", "")))
      .filter((value) => Number.isFinite(value));

    if (!seconds.length) return "0.00s";

    return `${(seconds.reduce((sum, value) => sum + value, 0) / seconds.length).toFixed(2)}s`;
  }, [historyEntries]);

  const currentLlm = historyEntries[0]?.config?.llm || "-";
  const responseTimeVsDb = comparisonData?.responseTimeVsDb || [];
  const chunkSizeVsAccuracy = comparisonData?.chunkSizeVsAccuracy || [];
  const embeddingVsAccuracy = comparisonData?.embeddingVsAccuracy || [];
  const retrievalVsAccuracy = comparisonData?.retrievalVsAccuracy || [];
  const dbCostMap = useMemo(() => {
    const buckets = new Map();

    historyEntries.forEach((entry) => {
      const dbName = String(entry?.config?.db || "").trim().toLowerCase();
      const costValue = Number.parseFloat(String(entry?.metrics?.cost || "0").replace("$", ""));

      if (!dbName || !Number.isFinite(costValue)) return;

      const current = buckets.get(dbName) || { total: 0, count: 0 };
      buckets.set(dbName, {
        total: current.total + costValue,
        count: current.count + 1,
      });
    });

    return buckets;
  }, [historyEntries]);

  const comparisonCards = useMemo(
    () =>
      responseTimeVsDb.map((item) => {
        const dbKey = String(item?.name || "").trim().toLowerCase();
        const latency = Number(item?.time || 0) / 1000;
        const costBucket = dbCostMap.get(dbKey);
        const costValue =
          costBucket && costBucket.count > 0 ? costBucket.total / costBucket.count : 0;

        return {
          strategy: item?.name || "Unknown",
          accuracy: Number(item?.accuracy || 0),
          latency,
          cost: costValue,
          winner: false,
        };
      }),
    [dbCostMap, responseTimeVsDb],
  );

  const bestComparison = useMemo(() => {
    if (!comparisonCards.length) return null;
    return comparisonCards.reduce((best, current) =>
      Number(current.accuracy || 0) > Number(best.accuracy || 0) ? current : best,
    );
  }, [comparisonCards]);

  const responseChartData = useMemo(
    () =>
      responseTimeVsDb.map((item) => ({
        name: item?.name || "Unknown",
        time: Number(item?.time || 0) / 1000,
      })),
    [responseTimeVsDb],
  );

  const chunkAccuracyData = useMemo(
    () =>
      chunkSizeVsAccuracy.map((item) => ({
        size: item?.size || 0,
        ...Object.fromEntries(
          Object.entries(item || {})
            .filter(([key]) => key !== "size")
            .map(([key, value]) => [key, Number(value || 0)]),
        ),
      })),
    [chunkSizeVsAccuracy],
  );

  const qualityRadarData = useMemo(() => {
    const bestAccuracy = bestComparison ? Number(bestComparison.accuracy || 0) : 0;
    const avgRetrievalAccuracy =
      retrievalVsAccuracy.length > 0
        ? retrievalVsAccuracy.reduce((sum, item) => sum + Number(item?.accuracy || 0), 0) /
          retrievalVsAccuracy.length
        : 0;
    const avgEmbeddingAccuracy =
      embeddingVsAccuracy.length > 0
        ? embeddingVsAccuracy.reduce((sum, item) => sum + Number(item?.accuracy || 0), 0) /
          embeddingVsAccuracy.length
        : 0;

    return [
      { subject: "Best DB", A: Math.round(bestAccuracy) },
      { subject: "Retrieval", A: Math.round(avgRetrievalAccuracy) },
      { subject: "Embedding", A: Math.round(avgEmbeddingAccuracy) },
      { subject: "History", A: Math.round(Number(historyEntries[0]?.metrics?.accuracy || 0)) },
    ];
  }, [bestComparison, embeddingVsAccuracy, historyEntries, retrievalVsAccuracy]);

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
                <strong>{averageLatency}</strong>
                <span>Average latency</span>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <Cpu size={16} />
              <div>
                <strong>{currentLlm}</strong>
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
                {isLoadingHistory && <div className={styles.tableRow}>Loading experiments...</div>}
                {!isLoadingHistory && historyError && (
                  <div className={styles.tableRow}>{historyError}</div>
                )}
                {!isLoadingHistory &&
                  !historyError &&
                  experimentRows.map((item) => (
                    <div key={item.id} className={styles.tableRow}>
                      <span>{item.id}</span>
                      <span>{item.llm}</span>
                      <span>{item.embedding}</span>
                      <span>{item.db}</span>
                      <span>{item.retrieval}</span>
                      <strong>{item.accuracy}</strong>
                    </div>
                  ))}
                {!isLoadingHistory && !historyError && experimentRows.length === 0 && (
                  <div className={styles.tableRow}>No experiments found for this project.</div>
                )}
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
                {isLoadingComparison && <div className={styles.comparisonCard}>Loading comparison...</div>}
                {!isLoadingComparison && comparisonError && (
                  <div className={styles.comparisonCard}>{comparisonError}</div>
                )}
                {!isLoadingComparison &&
                  !comparisonError &&
                  comparisonCards.map((item) => (
                  <div key={item.strategy} className={styles.comparisonCard}>
                    <div className={styles.comparisonHeader}>
                      <h3>{item.strategy}</h3>
                      {bestComparison?.strategy === item.strategy && (
                        <span className={styles.winnerBadge}>Recommended</span>
                      )}
                    </div>
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
                    <BarChart data={responseChartData}>
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
                      <LineChart data={chunkAccuracyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                        <XAxis dataKey="size" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        {chunkAccuracyData[0] &&
                          Object.keys(chunkAccuracyData[0])
                            .filter((key) => key !== "size")
                            .map((key, index) => (
                              <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={index % 2 === 0 ? "#38bdf8" : "#2563eb"}
                                strokeWidth={3}
                                dot={false}
                              />
                            ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={styles.chartCard}>
                    <div className={styles.panelHeader}>
                      <Trophy size={18} />
                      <h2>Quality Radar</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <RadarChart data={qualityRadarData}>
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
                {bestComparison ? (
                  <>
                    <h3>{bestComparison.strategy}</h3>
                    <p>
                      Highest observed backend accuracy for this project based on
                      stored experiment logs.
                    </p>
                    <div className={styles.recommendationMetrics}>
                      <span>{bestComparison.accuracy}% accuracy</span>
                      <span>{bestComparison.latency}s latency</span>
                      <span>${bestComparison.cost.toFixed(4)} cost/query</span>
                    </div>
                  </>
                ) : (
                  <p>No recommendation available yet.</p>
                )}
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
