"use client";
import React, { useState } from 'react';
import classNames from 'classnames';
import { Trophy, Save, BookmarkPlus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THeader, TBody, TR, TH, TD } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CHUNKING_PROFILES } from "@/lib/chunking/data";
import { generateChunkingResult } from "@/utils/functions/data-generators";
import { formatPercent, formatSeconds, formatCurrency, formatMemory } from "@/utils/functions/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { STRATEGIES } from "../ChunkingStrategySelector";
import styles from './styles.module.css';

const TOOLTIP_STYLE = {
  background: "rgb(var(--chart-tooltip-bg))",
  border: "1px solid rgb(var(--chart-tooltip-border))",
  borderRadius: "6px",
  fontSize: "11px",
};

const ChunkingResultsPanel = ({ selected = [], configs = {} }) => {
  const [profileName, setProfileName] = useState("");
  const [profiles, setProfiles] = useState(CHUNKING_PROFILES);

  const results = selected.map((id) => generateChunkingResult(id, configs[id]));
  const best = results.length > 0 ? results.reduce((a, b) => (a.accuracy > b.accuracy ? a : b)) : null;

  const chartData = results.map((r) => ({
    name: r.label.split(" ")[0],
    accuracy: r.accuracy,
    relevance: r.answerRelevance,
    latency: r.latency,
    chunks: r.totalChunks,
  }));

  const radarData = results.length > 0
    ? [
      { metric: "Accuracy", ...Object.fromEntries(results.map((r) => [r.strategy, r.accuracy])) },
      { metric: "Relevance", ...Object.fromEntries(results.map((r) => [r.strategy, r.answerRelevance])) },
      { metric: "Speed", ...Object.fromEntries(results.map((r) => [r.strategy, Math.max(0, 100 - r.latency * 40)])) },
      { metric: "Cost Eff.", ...Object.fromEntries(results.map((r) => [r.strategy, Math.max(0, 100 - r.cost * 3000)])) },
      { metric: "Memory Eff.", ...Object.fromEntries(results.map((r) => [r.strategy, Math.max(0, 100 - r.memory)])) },
    ]
    : [];

  const saveProfile = () => {
    if (!profileName.trim() || selected.length === 0) return;
    setProfiles([
      ...profiles,
      { name: profileName, strategies: [...selected], timestamp: new Date().toISOString().split("T")[0] },
    ]);
    setProfileName("");
  };

  return (
    <div className={styles.resultsPanel}>
      <Tabs defaultValue="Comparison">
        <TabsList className={styles.tabsList}>
          <TabsTrigger value="Comparison">Comparison</TabsTrigger>
          <TabsTrigger value="Charts">Charts</TabsTrigger>
          <TabsTrigger value="Recommendation">Recommendation</TabsTrigger>
          <TabsTrigger value="Profiles">Profiles</TabsTrigger>
        </TabsList>

        <ScrollArea className={styles.tabContentArea}>
          <TabsContent value="Comparison" className={styles.tabContent}>
            <Table>
              <THeader>
                <TR>
                  <TH>Strategy</TH>
                  <TH>Chunk Size</TH>
                  <TH>Overlap</TH>
                  <TH>Chunks</TH>
                  <TH>Accuracy</TH>
                  <TH>Relevance</TH>
                  <TH>Latency</TH>
                  <TH>Cost</TH>
                  <TH>Memory</TH>
                </TR>
              </THeader>
              <TBody>
                {results.map((r) => (
                  <TR
                    key={r.strategy}
                    className={classNames({ [styles.bestRow]: best && r.strategy === best.strategy })}
                  >
                    <TD>
                      <div className={styles.strategyLabelWrapper}>
                        {best && r.strategy === best.strategy && (
                          <Trophy size={12} className={styles.trophyIcon} />
                        )}
                        <span className={styles.monoText}>{r.label}</span>
                      </div>
                    </TD>
                    <TD className={styles.monoText}>{r.chunkSize}</TD>
                    <TD className={styles.monoText}>{r.overlap}</TD>
                    <TD className={styles.monoText}>{r.totalChunks}</TD>
                    <TD>
                      <Badge
                        variant={r.accuracy >= 82 ? 'success' : r.accuracy >= 76 ? 'warning' : 'outline'}
                      >
                        {formatPercent(r.accuracy)}
                      </Badge>
                    </TD>
                    <TD className={styles.monoText}>{formatPercent(r.answerRelevance)}</TD>
                    <TD className={styles.monoText}>{formatSeconds(r.latency)}</TD>
                    <TD className={styles.monoText}>{formatCurrency(r.cost)}</TD>
                    <TD className={styles.monoText}>{formatMemory(r.memory)}</TD>
                  </TR>
                ))}
                {results.length === 0 && (
                  <TR>
                    <TD colSpan={9} className={styles.emptyTableText}>
                      Select chunking strategies and run an experiment
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </TabsContent>

          <TabsContent value="Charts" className={styles.tabContent}>
            <div className={styles.chartGrid}>
              <div className={styles.chartWrapper}>
                <span className={styles.chartTitle}>Chunk Size vs Accuracy</span>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "rgb(var(--chart-label))" }} />
                    <YAxis tick={{ fontSize: 9, fill: "rgb(var(--chart-label))" }} domain={[60, 100]} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="accuracy" fill="rgb(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.chartWrapper}>
                <span className={styles.chartTitle}>Chunk Count vs Latency</span>
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "rgb(var(--chart-label))" }} />
                    <YAxis tick={{ fontSize: 9, fill: "rgb(var(--chart-label))" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="latency" stroke="rgb(var(--warning))" strokeWidth={2} dot={{ fill: "rgb(var(--warning))", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.chartWrapper}>
                <span className={styles.chartTitle}>Quality Radar</span>
                {radarData.length > 0 && results.length > 0 ? (
                  <ResponsiveContainer width="100%" height={170}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgb(var(--chart-tooltip-border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 8, fill: "rgb(var(--chart-label))" }} />
                      <PolarRadiusAxis tick={false} domain={[0, 100]} />
                      {results.slice(0, 3).map((r, i) => (
                        <Radar
                          key={r.strategy}
                          dataKey={r.strategy}
                          stroke={["rgb(var(--primary))", "rgb(var(--success))", "rgb(var(--warning))"][i]}
                          fill={["rgb(var(--primary))", "rgb(var(--success))", "rgb(var(--warning))"][i]}
                          fillOpacity={0.15}
                          strokeWidth={1.5}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.chartPlaceholder}>
                    Run experiment to see radar
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="Recommendation" className={styles.tabContent}>
            <div className={styles.recommendationArea}>
              {best ? (
                <div className={styles.recommendationCard}>
                  <div className={styles.recommendationHeader}>
                    <Trophy size={20} className={styles.trophyIconLarge} />
                    <span className={styles.recommendationTitle}>Best Performing Strategy</span>
                  </div>
                  <div className={styles.recommendationBody}>
                    <div className={styles.recommendationHighlight}>
                      <div className={styles.strategyName}>{best.label}</div>
                      <div className={styles.strategySub}>
                        Chunk Size: {best.chunkSize} · Overlap: {best.overlap}
                      </div>
                    </div>
                    <div className={styles.metricGrid}>
                      <div className={styles.metricBox}>
                        <div className={styles.metricValSuccess}>{formatPercent(best.accuracy)}</div>
                        <div className={styles.metricLabelSmall}>Accuracy</div>
                      </div>
                      <div className={styles.metricBox}>
                        <div className={styles.metricValWarning}>{formatSeconds(best.latency)}</div>
                        <div className={styles.metricLabelSmall}>Latency</div>
                      </div>
                      <div className={styles.metricBox}>
                        <div className={styles.metricValPrimary}>{formatCurrency(best.cost)}</div>
                        <div className={styles.metricLabelSmall}>Cost/Query</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={styles.productionBadge}>
                      ✓ Recommended for production
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className={styles.emptyTextLarge}>
                  Run an experiment to get a recommendation
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="Profiles" className={styles.tabContent}>
            <div className={styles.profilesArea}>
              {/* Save new profile */}
              <div className={styles.profileInputWrapper}>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Profile name..."
                  className={styles.profileInput}
                />
                <Button
                  size="sm"
                  onClick={saveProfile}
                  disabled={!profileName.trim() || selected.length === 0}
                  className={styles.saveProfileButton}
                >
                  <BookmarkPlus size={14} />
                  Save
                </Button>
              </div>

              {/* Saved profiles */}
              <div className={styles.profileList}>
                {profiles.map((p, i) => (
                  <div key={i} className={styles.profileCard}>
                    <div className={styles.profileInfo}>
                      <div className={styles.profileName}>{p.name}</div>
                      <div className={styles.profileTags}>
                        {p.strategies.map((s) => (
                          <Badge key={s} variant="outline" className={styles.tagBadge}>
                            {s}
                          </Badge>
                        ))}
                        <span className={styles.timestamp}>{p.timestamp}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setProfiles(profiles.filter((_, j) => j !== i))}
                      className={styles.deleteButton}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default ChunkingResultsPanel;
