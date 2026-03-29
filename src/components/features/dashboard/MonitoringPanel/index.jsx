"use client";
import React from 'react';
import classNames from 'classnames';
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
  PolarRadiusAxis,
  Legend
} from "recharts";
import {
  BarChart2,
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
  CheckCircle2
} from "lucide-react";
import {
  DASHBOARD_EXPERIMENTS,
  COMPARISON_DATA,
  RESPONSE_CHART_DATA,
  CHUNK_ACCURACY_DATA,
  CHUNK_LATENCY_DATA,
  TRACING_DATA,
  ACCURACY_METRICS,
  QUALITY_RADAR_DATA,
  RETRIEVED_CHUNKS
} from "@/lib/dashboard/data";
import styles from './styles.module.css';

const MonitoringPanel = ({ state, setState, onClose, isRunning }) => {
  const isMaximized = state === 'maximized';

  return (
    <div className={classNames(styles.monitoringPanel, { [styles.maximized]: isMaximized })}>
      <div className={styles.panelControls}>
        <div className={styles.panelTitle}>
          <Activity size={14} className={styles.statsIcon} />
          <span>REAL-TIME RESULTS</span>
        </div>
        <div className={styles.controlButtons}>
          <div className={styles.floatingActions}>
          </div>
          <button
            onClick={() => setState(isMaximized ? 'standard' : 'maximized')}
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
          <TabsTrigger value="results" className={styles.tabsTrigger}>RESULTS</TabsTrigger>
          <TabsTrigger value="experiments" className={styles.tabsTrigger}>EXPERIMENTS</TabsTrigger>
          <TabsTrigger value="comparison" className={styles.tabsTrigger}>COMPARISON</TabsTrigger>
          <TabsTrigger value="charts" className={styles.tabsTrigger}>CHARTS</TabsTrigger>
          <TabsTrigger value="pipeline" className={styles.tabsTrigger}>PIPELINE</TabsTrigger>
          <TabsTrigger value="tracing" className={styles.tabsTrigger}>TRACING</TabsTrigger>
          <TabsTrigger value="recommendation" className={styles.tabsTrigger}>RECOMMENDATION</TabsTrigger>
          <TabsTrigger value="profiles" className={styles.tabsTrigger}>PROFILES</TabsTrigger>
        </TabsList>

        <ScrollArea className={styles.tabContentArea}>
          {isRunning && (
            <div className={styles.runningOverlay}>
              <div className={styles.runningInfo}>
                <div className={styles.bigSpinner} />
                <span className={styles.runningLabel}>Executing RAG Pipeline...</span>
                <span className={styles.runningSub}>Optimizing vector search & generation</span>
              </div>
            </div>
          )}
          <div className={classNames({ [styles.contentLocked]: isRunning })}>
            <TabsContent value="results" className={styles.resultsTabContent}>
              {/* RESPONSE */}
              <div className={styles.resultsSection}>
                <div className={styles.sectionHeader}>
                  <MessageSquare size={14} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Response</span>
                </div>
                <div className={styles.responseBox}>
                  Revenue grew 23.4% YoY in Q4 2024, reaching $4.2B. Enterprise segment growth of 31% and cloud services expansion were primary drivers. Gross margin improved to 68.2%.
                </div>
              </div>

              {/* RETRIEVED CHUNKS */}
              <div className={styles.resultsSection}>
                <div className={styles.sectionHeader}>
                  <Database size={14} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Retrieved Chunks</span>
                </div>
                <div className={styles.chunksList}>
                  {RETRIEVED_CHUNKS.map((chunk, idx) => (
                    <div key={idx} className={styles.chunkCard}>
                      <div className={styles.chunkHeader}>
                        <div className={styles.chunkSourceInfo}>
                          <FileText size={14} className={styles.chunkIcon} />
                          <div className={styles.chunkMeta}>
                            <span className={styles.chunkSourceLabel}>DOCUMENT SOURCE</span>
                            <span className={styles.chunkSourceValue}>ANNUAL_REPORT_24.PDF • PAGE {chunk.page}</span>
                          </div>
                        </div>
                        <div className={styles.chunkSimilarity}>
                          <span className={styles.similarityLabel}>SIMILARITY</span>
                          <span className={styles.similarityValue}>{chunk.score.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className={styles.chunkText}>
                        {chunk.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* EXECUTION PERFORMANCE */}
              <div className={styles.resultsSection}>
                <div className={styles.sectionHeader}>
                  <Clock size={14} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Execution Performance</span>
                </div>
                <div className={styles.performanceGrid}>
                  {[
                    { label: "Total Latency", value: "1.3s", sub: "System-wide", icon: <Clock size={14} /> },
                    { label: "Inference", value: "0.7s", sub: "LLM Generation", icon: <Cpu size={14} /> },
                    { label: "Vector Search", value: "0.4s", sub: "Similarity retrieval", icon: <Zap size={14} /> },
                    { label: "Estimated cost", value: "$0.014", sub: "Per query", icon: <DollarSign size={14} /> }
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

              {/* QUALITY METRICS */}
              <div className={styles.resultsSection}>
                <div className={styles.sectionHeader}>
                  <CheckCircle2 size={14} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Quality Metrics (RAGAS)</span>
                </div>
                <div className={styles.metricsList}>
                  {ACCURACY_METRICS.map((metric, idx) => (
                    <div key={idx} className={styles.metricItem}>
                      <div className={styles.metricHeader}>
                        <span className={styles.metricLabel}>{metric.label.toUpperCase()}</span>
                        <span className={styles.metricValue}>{metric.value}%</span>
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
                  {DASHBOARD_EXPERIMENTS.map((exp, idx) => (
                    <TR key={idx}>
                      <TD className={styles.primaryText}>{exp.id}</TD>
                      <TD className={styles.monoText}>{exp.llm}</TD>
                      <TD className={styles.monoText}>{exp.embedding}</TD>
                      <TD className={styles.monoText}>{exp.db}</TD>
                      <TD className={styles.monoText}>{exp.retrieval}</TD>
                      <TD>
                        <Badge variant={exp.accuracy >= 90 ? 'success' : exp.accuracy >= 80 ? 'warning' : 'outline'}>
                          {exp.accuracy}%
                        </Badge>
                      </TD>
                      <TD className={styles.monoText}>{exp.latency}s</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
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
                  {COMPARISON_DATA.map((exp, idx) => (
                    <TR key={idx} className={classNames({ [styles.winnerRow]: exp.winner })}>
                      <TD className={styles.strategyName}>
                        {exp.winner ? (
                          <div className={styles.winnerPill}>
                            <Trophy size={11} className={styles.winnerIcon} />
                            {exp.strategy}
                          </div>
                        ) : (
                          exp.strategy
                        )}
                      </TD>
                      <TD className={styles.monoText}>{exp.chunkSize}</TD>
                      <TD className={styles.monoText}>{exp.overlap}</TD>
                      <TD>
                        <div className={styles.miniBarGroup}>
                          <span className={styles.miniBarValue}>{exp.accuracy}%</span>
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
                          <span className={styles.miniBarValue}>{exp.relevance}%</span>
                          <div className={styles.miniBarBgRelevance}>
                            <div
                              className={styles.miniBarFillRelevance}
                              style={{ width: `${exp.relevance}%` }}
                            />
                          </div>
                        </div>
                      </TD>
                      <TD className={styles.monoTextBold}>{exp.latency}s</TD>
                      <TD className={styles.monoTextSmall}>${exp.cost.toFixed(4)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TabsContent>

            <TabsContent value="charts" className={styles.tabContent}>
              <div className={styles.chartsGrid}>
                <div className={styles.chartItem}>
                  <span className={styles.chartTitle}>Response Time vs Database</span>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={RESPONSE_CHART_DATA}>
                      <XAxis dataKey="name" stroke="#666" fontSize={10} />
                      <YAxis stroke="#666" fontSize={10} />
                      <Tooltip
                        contentStyle={{ background: '#111', border: '1px solid #333', fontSize: '10px' }}
                      />
                      <Bar dataKey="time" fill="rgb(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartItem}>
                  <span className={styles.chartTitle}>Chunk Size vs Accuracy</span>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={CHUNK_ACCURACY_DATA}>
                      <XAxis dataKey="size" stroke="#666" fontSize={10} />
                      <YAxis stroke="#666" fontSize={10} />
                      <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', fontSize: '10px' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      <Line name="Recursive" type="monotone" dataKey="recursive" stroke="rgba(var(--primary), 0.5)" strokeWidth={2} />
                      <Line name="Semantic" type="monotone" dataKey="semantic" stroke="rgb(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartItem}>
                  <span className={styles.chartTitle}>Chunk Count vs Latency</span>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={CHUNK_LATENCY_DATA}>
                      <XAxis dataKey="count" stroke="#666" fontSize={10} />
                      <YAxis stroke="#666" fontSize={10} />
                      <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', fontSize: '10px' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      <Line name="Recursive" type="monotone" dataKey="recursive" stroke="rgba(var(--primary), 0.5)" strokeDasharray="3 3" />
                      <Line name="Semantic" type="monotone" dataKey="semantic" stroke="rgb(var(--primary))" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartItem}>
                  <span className={styles.chartTitle}>Quality Radar</span>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={QUALITY_RADAR_DATA}>
                      <PolarGrid stroke="rgba(var(--border), 0.2)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10 }} />
                      <Radar name="Accuracy" dataKey="A" stroke="rgb(var(--primary))" fill="rgb(var(--primary))" fillOpacity={0.6} />
                      <Radar name="Relevance" dataKey="B" stroke="#666" fill="#666" fillOpacity={0.3} />
                      <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', fontSize: '10px' }} />
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
                  activeStep={7}
                />
              </div>
            </TabsContent>

            <TabsContent value="tracing" className={styles.tabContent}>
              <div className={styles.tracingContainer}>
                {TRACING_DATA.map((trace, idx) => (
                  <div key={idx} className={styles.traceNode}>
                    <div className={styles.traceTimeline}>
                      <div className={classNames(styles.traceConnector, { [styles.connectorActive]: true })} />
                      <div className={styles.traceStatusDotPrimary} />
                    </div>
                    <div className={styles.traceCardClean}>
                      <div className={styles.traceHeader}>
                        <span className={styles.traceTitlePrimary}>{trace.step}</span>
                        <span className={styles.traceTimePrimary}>{trace.time}</span>
                      </div>
                      <div className={styles.traceBodyClean}>
                        {trace.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="recommendation" className={styles.tabContent}>
              <div className={styles.recommendationWrapper}>
                <div className={styles.recommendationCard}>
                  <div className={styles.recHeader}>
                    <Trophy size={18} className={styles.winnerIcon} />
                    <span className={styles.recTitle}>Best Performing Strategy</span>
                  </div>

                  <div className={styles.recBody}>
                    <div className={styles.recStrategyName}>Semantic Chunking</div>
                    <div className={styles.recConfig}>Chunk Size: 1000  ·  Overlap: 200</div>

                    <div className={styles.recMetricsGrid}>
                      <div className={styles.recMetric}>
                        <span className={styles.recMetricValue}>85%</span>
                        <span className={styles.recMetricLabel}>Accuracy</span>
                      </div>
                      <div className={styles.recMetric}>
                        <span className={styles.recMetricValue}>1.55s</span>
                        <span className={styles.recMetricLabel}>Latency</span>
                      </div>
                      <div className={styles.recMetric}>
                        <span className={styles.recMetricValue}>$0.0176</span>
                        <span className={styles.recMetricLabel}>Cost/Query</span>
                      </div>
                    </div>

                    <div className={styles.recBadge}>
                      <span className={styles.recBadgeCheck}>✓</span>
                      Recommended for production
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
                  {[
                    { name: "Research Papers Optimized", tags: ["recursive", "semantic"], date: "2024-12-15" },
                    { name: "Legal Documents Profile", tags: ["structure", "paragraph"], date: "2024-12-10" },
                    { name: "Large Technical Docs", tags: ["sliding", "token"], date: "2024-12-08" },
                  ].map((profile) => (
                    <div key={profile.name} className={styles.profileItem}>
                      <div className={styles.profileMain}>
                        <span className={styles.profileNameTxt}>{profile.name}</span>
                        <div className={styles.profileTags}>
                          {profile.tags.map(tag => (
                            <span key={tag} className={styles.profileTag}>{tag}</span>
                          ))}
                          <span className={styles.profileDate}>{profile.date}</span>
                        </div>
                      </div>
                      <button className={styles.profileDelete}>
                        <span className={styles.trashIcon}>🗑</span>
                      </button>
                    </div>
                  ))}
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
