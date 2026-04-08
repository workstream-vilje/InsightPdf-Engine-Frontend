"use client";
import React from "react";
import classNames from "classnames";
import { Badge } from "@/components/ui/badge";
import { Table, THeader, TBody, TR, TH, TD } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pipeline } from "@/components/ui/pipeline";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Legend,
} from "recharts";
import {
  Maximize2,
  Minimize2,
  X,
  Search,
  MessageSquare,
  Cpu,
  FileText,
  Database,
  Grid,
  Trophy,
  Activity,
  Zap,
  Layout,
  File,
  Clock,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import styles from "./MonitoringPanel.module.css";

const formatMs = (value) => `${(Number(value || 0) / 1000).toFixed(2)}s`;
const formatCurrency = (value) => `$${Number(value || 0).toFixed(3)}`;

const MonitoringPanel = ({
  state,
  setState,
  onClose,
  isRunning,
  resultsData,
}) => {
  const isMaximized = state === "maximized";
  const chunks = resultsData?.chunks || [];
  const qualityMetrics = resultsData?.qualityMetrics || [];
  const tracingData = resultsData?.tracing || [];
  const comparisonData = resultsData?.comparison || null;
  const experiments = resultsData?.experiment ? [resultsData.experiment] : [];
  const responseChartData = comparisonData?.responseTimeVsDb || [];
  const chunkAccuracyData = comparisonData?.chunkSizeVsAccuracy || [];
  const retrievalComparison = comparisonData?.retrievalVsAccuracy || [];
  const comparisonRows = retrievalComparison.length
    ? retrievalComparison.map((item) => ({
        strategy: item.name,
        chunkSize: "-",
        overlap: "-",
        accuracy: Math.round(Number(item.accuracy || 0)),
        relevance: Math.round(Number(item.accuracy || 0)),
        latency: Number(item.time || 0) / 1000,
        cost: Number(resultsData?.performance?.cost || 0),
      }))
    : [];
  const chunkLatencyData = comparisonData?.responseTimeVsDb?.map((item) => ({
    name: item.name,
    latency: Number(item.time || 0),
  })) || [];

  return (
    <div
      className={classNames(styles.monitoringPanel, {
        [styles.maximized]: isMaximized,
      })}
    >
      <div className={styles.panelControls}>
        <div className={styles.panelTitle}>
          <Activity size={14} className={styles.statsIcon} />
          <span>REAL-TIME RESULTS</span>
        </div>
        <div className={styles.controlButtons}>
          <div className={styles.floatingActions} />
          <button
            onClick={() => setState(isMaximized ? "standard" : "maximized")}
            className={styles.controlBtn}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={onClose} className={styles.controlBtn} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>
      <Tabs defaultValue="results" className={styles.tabsContainer}>
        <TabsList className={styles.tabsList}>
          <TabsTrigger value="results" className={styles.tabsTrigger}>
            RESULTS
          </TabsTrigger>
          <TabsTrigger value="experiments" className={styles.tabsTrigger}>
            EXPERIMENTS
          </TabsTrigger>
          <TabsTrigger value="comparison" className={styles.tabsTrigger}>
            COMPARISON
          </TabsTrigger>
          <TabsTrigger value="charts" className={styles.tabsTrigger}>
            CHARTS
          </TabsTrigger>
          <TabsTrigger value="pipeline" className={styles.tabsTrigger}>
            PIPELINE
          </TabsTrigger>
          <TabsTrigger value="tracing" className={styles.tabsTrigger}>
            TRACING
          </TabsTrigger>
          <TabsTrigger value="recommendation" className={styles.tabsTrigger}>
            RECOMMENDATION
          </TabsTrigger>
          <TabsTrigger value="profiles" className={styles.tabsTrigger}>
            PROFILES
          </TabsTrigger>
        </TabsList>

        <ScrollArea className={styles.tabContentArea}>
          {isRunning && (
            <div className={styles.runningOverlay}>
              <div className={styles.runningInfo}>
                <div className={styles.bigSpinner} />
                <span className={styles.runningLabel}>
                  Executing RAG Pipeline...
                </span>
                <span className={styles.runningSub}>
                  Optimizing vector search & generation
                </span>
              </div>
            </div>
          )}
          <div className={classNames({ [styles.contentLocked]: isRunning })}>
            <TabsContent value="results" className={styles.resultsTabContent}>
              <div className={styles.resultsSection}>
                <div className={styles.sectionHeader}>
                  <MessageSquare size={14} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Response</span>
                </div>
                <div className={styles.responseBox}>
                  {resultsData?.response ||
                    "Run a query to see a live response here."}
                </div>
              </div>

              <div className={styles.resultsSection}>
                <div className={styles.sectionHeader}>
                  <Database size={14} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Retrieved Chunks</span>
                </div>
                <div className={styles.chunksList}>
                  {chunks.length ? chunks.map((chunk, idx) => (
                    <div key={chunk.id || idx} className={styles.chunkCard}>
                      <div className={styles.chunkHeader}>
                        <div className={styles.chunkSourceInfo}>
                          <FileText size={14} className={styles.chunkIcon} />
                          <div className={styles.chunkMeta}>
                            <span className={styles.chunkSourceLabel}>
                              DOCUMENT SOURCE
                            </span>
                            <span className={styles.chunkSourceValue}>
                              {chunk.source || "DOCUMENT"} • PAGE {chunk.page}
                            </span>
                          </div>
                        </div>
                        <div className={styles.chunkSimilarity}>
                          <span className={styles.similarityLabel}>
                            SIMILARITY
                          </span>
                          <span className={styles.similarityValue}>
                            {Number(chunk.score || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className={styles.chunkText}>{chunk.text}</div>
                    </div>
                  )) : <div className={styles.responseBox}>No retrieved chunks yet.</div>}
                </div>
              </div>

              <div className={styles.resultsSection}>
                <div className={styles.sectionHeader}>
                  <Clock size={14} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>
                    Execution Performance
                  </span>
                </div>
                <div className={styles.performanceGrid}>
                  {[
                    {
                      label: "Total Latency",
                      value: formatMs(resultsData?.performance?.totalTime),
                      sub: "System-wide",
                      icon: <Clock size={14} />,
                    },
                    {
                      label: "Inference",
                      value: formatMs(resultsData?.performance?.llmGenTime),
                      sub: "LLM Generation",
                      icon: <Cpu size={14} />,
                    },
                    {
                      label: "Vector Search",
                      value: formatMs(resultsData?.performance?.retrievalTime),
                      sub: "Similarity retrieval",
                      icon: <Zap size={14} />,
                    },
                    {
                      label: "Estimated cost",
                      value: formatCurrency(resultsData?.performance?.cost),
                      sub: "Per query",
                      icon: <DollarSign size={14} />,
                    },
                  ].map((item, idx) => (
                    <div key={idx} className={styles.performanceCard}>
                      <div className={styles.perfItemHeader}>
                        <div className={styles.perfIconWrapper}>{item.icon}</div>
                        <span className={styles.perfTitle}>{item.label}</span>
                      </div>
                      <div className={styles.perfBody}>
                        <span className={styles.perfMainValue}>{item.value}</span>
                        <span className={styles.perfDescription}>{item.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.resultsSection}>
                <div className={styles.sectionHeader}>
                  <CheckCircle2 size={14} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Quality Metrics</span>
                </div>
                <div className={styles.metricsList}>
                  {qualityMetrics.length ? qualityMetrics.map((metric, idx) => (
                    <div key={idx} className={styles.metricItem}>
                      <div className={styles.metricHeader}>
                        <span className={styles.metricLabel}>
                          {String(metric.label || "").toUpperCase()}
                        </span>
                        <span className={styles.metricValue}>
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
                  )) : <div className={styles.responseBox}>No quality metrics available yet.</div>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="experiments" className={styles.tabContent}>
              <Table>
                <THeader>
                  <TR>
                    <TH>ID</TH>
                    <TH>LLM</TH>
                    <TH>Embedding</TH>
                    <TH>DB</TH>
                    <TH>Retrieval</TH>
                    <TH>Accuracy</TH>
                    <TH>Latency</TH>
                  </TR>
                </THeader>
                <TBody>
                  {experiments.map((exp, idx) => (
                    <TR key={idx}>
                      <TD className={styles.primaryText}>{exp.id}</TD>
                      <TD className={styles.monoText}>{exp.llm}</TD>
                      <TD className={styles.monoText}>{exp.embedding}</TD>
                      <TD className={styles.monoText}>{exp.db}</TD>
                      <TD className={styles.monoText}>{exp.retrieval}</TD>
                      <TD>
                        <Badge
                          variant={
                            exp.accuracy >= 90
                              ? "success"
                              : exp.accuracy >= 80
                                ? "warning"
                                : "outline"
                          }
                        >
                          {exp.accuracy}%
                        </Badge>
                      </TD>
                      <TD className={styles.monoText}>
                        {Number(exp.latency || 0).toFixed(2)}s
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              {!experiments.length && (
                <div className={styles.responseBox}>No experiment data available yet.</div>
              )}
            </TabsContent>

            <TabsContent value="comparison" className={styles.tabContent}>
              <Table>
                <THeader>
                  <TR>
                    <TH>STRATEGY</TH>
                    <TH>SIZE</TH>
                    <TH>OVERLAP</TH>
                    <TH>ACCURACY</TH>
                    <TH>RELEVANCE</TH>
                    <TH>LATENCY</TH>
                    <TH>COST/Q</TH>
                  </TR>
                </THeader>
                <TBody>
                  {comparisonRows.map((exp, idx) => (
                    <TR key={idx}>
                      <TD className={styles.strategyName}>{exp.strategy}</TD>
                      <TD className={styles.monoText}>{exp.chunkSize}</TD>
                      <TD className={styles.monoText}>{exp.overlap}</TD>
                      <TD>
                        <div className={styles.miniBarGroup}>
                          <span className={styles.miniBarValue}>
                            {exp.accuracy}%
                          </span>
                          <div className={styles.miniBarBg}>
                            <div
                              className={styles.miniBarFill}
                              style={{ width: `${exp.accuracy}%` }}
                            />
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className={styles.miniBarGroup}>
                          <span className={styles.miniBarValue}>
                            {exp.relevance}%
                          </span>
                          <div className={styles.miniBarBgRelevance}>
                            <div
                              className={styles.miniBarFillRelevance}
                              style={{ width: `${exp.relevance}%` }}
                            />
                          </div>
                        </div>
                      </TD>
                      <TD className={styles.monoTextBold}>
                        {Number(exp.latency || 0).toFixed(2)}s
                      </TD>
                      <TD className={styles.monoTextSmall}>
                        ${Number(exp.cost || 0).toFixed(4)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              {!comparisonRows.length && (
                <div className={styles.responseBox}>No comparison data available yet.</div>
              )}
            </TabsContent>

            <TabsContent value="charts" className={styles.tabContent}>
              <div className={styles.chartsGrid}>
                <div className={styles.chartItem}>
                  <span className={styles.chartTitle}>
                    Response Time vs Database
                  </span>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={responseChartData}>
                      <XAxis dataKey="name" stroke="#666" fontSize={10} />
                      <YAxis stroke="#666" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          background: "#111",
                          border: "1px solid #333",
                          fontSize: "10px",
                        }}
                      />
                      <Bar
                        dataKey="time"
                        fill="rgb(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartItem}>
                  <span className={styles.chartTitle}>
                    Chunk Size vs Accuracy
                  </span>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chunkAccuracyData}>
                      <XAxis dataKey="size" stroke="#666" fontSize={10} />
                      <YAxis stroke="#666" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          background: "#111",
                          border: "1px solid #333",
                          fontSize: "10px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "10px" }}
                      />
                      <Line
                        name="Recursive"
                        type="monotone"
                        dataKey="recursive"
                        stroke="rgba(var(--primary), 0.5)"
                        strokeWidth={2}
                      />
                      <Line
                        name="Semantic"
                        type="monotone"
                        dataKey="semantic"
                        stroke="rgb(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartItem}>
                  <span className={styles.chartTitle}>Chunk Count vs Latency</span>
                  {chunkLatencyData.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chunkLatencyData}>
                        <XAxis dataKey="name" stroke="#666" fontSize={10} />
                        <YAxis stroke="#666" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            background: "#111",
                            border: "1px solid #333",
                            fontSize: "10px",
                          }}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: "10px" }}
                        />
                        <Line
                          name="Latency"
                          type="monotone"
                          dataKey="latency"
                          stroke="rgb(var(--primary))"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={styles.responseBox}>
                      No chart data available yet.
                    </div>
                  )}
                </div>

                <div className={styles.chartItem}>
                  <span className={styles.chartTitle}>Quality Radar</span>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="60%"
                      data={
                        qualityMetrics.map((item) => ({
                          subject: item.label,
                          A: item.value,
                          B: Math.max(0, item.value - 10),
                        }))
                      }
                    >
                      <PolarGrid stroke="rgba(var(--border), 0.2)" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#666", fontSize: 10 }}
                      />
                      <Radar
                        name="Accuracy"
                        dataKey="A"
                        stroke="rgb(var(--primary))"
                        fill="rgb(var(--primary))"
                        fillOpacity={0.6}
                      />
                      <Radar
                        name="Relevance"
                        dataKey="B"
                        stroke="#666"
                        fill="#666"
                        fillOpacity={0.3}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#111",
                          border: "1px solid #333",
                          fontSize: "10px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pipeline" className={styles.tabContent}>
              <div className={styles.pipelineFlexWrapper}>
                <Pipeline
                  steps={[
                    { label: "PDF", icon: <File size={11} /> },
                    { label: "PyMuPDF", icon: <FileText size={11} /> },
                    { label: "Text Splitter", icon: <Grid size={11} /> },
                    { label: "Embeddings", icon: <Cpu size={11} /> },
                    { label: "Vector DB", icon: <Database size={11} /> },
                    { label: "Retriever", icon: <Search size={11} /> },
                    { label: "LLM", icon: <MessageSquare size={11} /> },
                    { label: "Answer", icon: <Layout size={11} /> },
                  ]}
                  activeStep={resultsData?.response ? 7 : 0}
                />
              </div>
            </TabsContent>

            <TabsContent value="tracing" className={styles.tabContent}>
              <div className={styles.tracingContainer}>
                {tracingData.length ? tracingData.map((trace, idx) => (
                  <div key={idx} className={styles.traceNode}>
                    <div className={styles.traceTimeline}>
                      <div
                        className={classNames(styles.traceConnector, {
                          [styles.connectorActive]: true,
                        })}
                      />
                      <div className={styles.traceStatusDotPrimary} />
                    </div>
                    <div className={styles.traceCardClean}>
                      <div className={styles.traceHeader}>
                        <span className={styles.traceTitlePrimary}>
                          {trace.step}
                        </span>
                        <span className={styles.traceTimePrimary}>
                          {trace.time}
                        </span>
                      </div>
                      <div className={styles.traceBodyClean}>{trace.detail}</div>
                    </div>
                  </div>
                )) : <div className={styles.responseBox}>No tracing timeline available yet.</div>}
              </div>
            </TabsContent>

            <TabsContent value="recommendation" className={styles.tabContent}>
              <div className={styles.recommendationWrapper}>
                <div className={styles.recommendationCard}>
                  <div className={styles.recHeader}>
                    <Trophy size={18} className={styles.winnerIcon} />
                    <span className={styles.recTitle}>
                      Best Performing Strategy
                    </span>
                  </div>

                  <div className={styles.recBody}>
                    <div className={styles.recStrategyName}>
                      {retrievalComparison[0]?.name || "Similarity Retrieval"}
                    </div>
                    <div className={styles.recConfig}>
                      Based on the latest query result
                    </div>

                    <div className={styles.recMetricsGrid}>
                      <div className={styles.recMetric}>
                        <span className={styles.recMetricValue}>
                          {qualityMetrics[0]?.value ?? 0}%
                        </span>
                        <span className={styles.recMetricLabel}>Accuracy</span>
                      </div>
                      <div className={styles.recMetric}>
                        <span className={styles.recMetricValue}>
                          {formatMs(resultsData?.performance?.totalTime)}
                        </span>
                        <span className={styles.recMetricLabel}>Latency</span>
                      </div>
                      <div className={styles.recMetric}>
                        <span className={styles.recMetricValue}>
                          {formatCurrency(resultsData?.performance?.cost)}
                        </span>
                        <span className={styles.recMetricLabel}>Cost/Query</span>
                      </div>
                    </div>

                    <div className={styles.recBadge}>
                      <span className={styles.recBadgeCheck}>✓</span>
                      Recommended for current selection
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profiles" className={styles.tabContent}>
              <div className={styles.profilesWrapper}>
                <div className={styles.profileSearchRow}>
                  <input
                    type="text"
                    placeholder="Profile name..."
                    className={styles.profileInput}
                  />
                  <button className={styles.profileSaveButton}>
                    <div className={styles.saveIcon}>+</div>
                    Save
                  </button>
                </div>

                <div className={styles.profileList}>
                  <div className={styles.responseBox}>No saved profiles available yet.</div>
                </div>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default MonitoringPanel;
