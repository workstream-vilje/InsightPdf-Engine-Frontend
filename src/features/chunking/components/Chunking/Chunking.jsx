"use client";
import React, { useState, useCallback } from 'react';
import classNames from 'classnames';
import { useRouter } from "next/navigation";
import { FlaskConical, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChunkingResultsPanel from "@/features/chunking/components/Chunking/ChunkingResultsPanel";
import ChunkingStrategySelector from "@/features/chunking/components/Chunking/ChunkingStrategySelector";
import ChunkPreviewPanel from "@/features/chunking/components/Chunking/ChunkPreviewPanel";
import ChunkStatsPanel from "@/features/chunking/components/Chunking/ChunkStatsPanel";
import PipelineIntegrationBar from "@/features/chunking/components/Chunking/PipelineIntegrationBar";
import { ROUTE_PATHS } from "@/utils/routepaths";
import styles from './Chunking.module.css';

const DEFAULT_CONFIG = {
  chunkSize: 1000,
  overlap: 200,
  tokenizer: "tiktoken",
  maxTokens: 512,
  minChunkLen: 50,
};

const makeConfigs = () => {
  const ids = [
    "recursive",
    "fixed",
    "sentence",
    "paragraph",
    "semantic",
    "token",
    "sliding",
    "structure",
  ];
  return Object.fromEntries(
    ids.map((id) => [id, { ...DEFAULT_CONFIG }]),
  );
};

const ChunkingExperiments = () => {
  const router = useRouter();
  const [selected, setSelected] = useState([
    "recursive",
    "semantic",
  ]);
  const [configs, setConfigs] = useState(makeConfigs);
  const [previewStrategy, setPreviewStrategy] = useState("recursive");

  const handleConfigChange = useCallback(
    (id, config) => {
      setConfigs((prev) => ({ ...prev, [id]: config }));
    },
    [],
  );

  // Keep preview strategy in sync
  const activePreview = selected.includes(previewStrategy)
    ? previewStrategy
    : (selected[0] ?? "recursive");

  return (
    <div className={styles.experimentsPage}>
      {/* Top Bar */}
      <div className={styles.topbar}>
        <div className={styles.leftSection}>
          <button
            onClick={() => router.push(ROUTE_PATHS.HOME)}
            className={styles.logoBtn}
          >
            <img
              src="/logo.jpg"
              alt="Vilje Logo"
              className={styles.logo}
            />
            <span className={styles.title}>
              Vilje RAG Canvas
            </span>
          </button>

          <div className={styles.divider} />

          <div className={styles.pageIndicator}>
            <FlaskConical size={14} className={styles.primaryIcon} />
            <span className={styles.pageLabel}>
              Chunking Experiments
            </span>
          </div>

          <div className={styles.divider} />

          {/* Preview strategy picker */}
          <div className={styles.previewPicker}>
            <span className={styles.metaLabel}>
              Preview:
            </span>
            <Select
              value={activePreview}
              onValueChange={(v) => setPreviewStrategy(v)}
            >
              <SelectTrigger className={styles.previewSelect}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selected.map((id) => (
                  <SelectItem key={id} value={id}>
                    {id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={styles.rightSection}>
          <Badge
            variant="outline"
            className={styles.metaBadge}
          >
            {selected.length} strategies
          </Badge>
          <Button
            size="sm"
            className={classNames(styles.runButton, "glow-primary")}
          >
            <Play size={14} />
            Run Experiment
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left: Strategy Selector + Config */}
        <div className={styles.sidebar}>
          <ChunkingStrategySelector
            selected={selected}
            onSelectedChange={setSelected}
            configs={configs}
            onConfigChange={handleConfigChange}
          />
        </div>

        {/* Center + Right */}
        <div className={styles.workspace}>
          <div className={styles.topPanel}>
            {/* Chunk Preview */}
            <div className={styles.previewRegion}>
              <ChunkPreviewPanel
                strategy={activePreview}
                chunkSize={configs[activePreview]?.chunkSize ?? 1000}
                overlap={configs[activePreview]?.overlap ?? 200}
              />
            </div>
            {/* Chunk Stats */}
            <div className={styles.statsRegion}>
              <ChunkStatsPanel selected={selected} configs={configs} />
            </div>
          </div>

          {/* Bottom: Comparison Results */}
          <div className={styles.resultsRegion}>
            <ChunkingResultsPanel selected={selected} configs={configs} />
          </div>

          {/* Pipeline Integration */}
          <PipelineIntegrationBar
            activeStrategy={selected.length > 0 ? selected[0] : null}
          />
        </div>
      </div>
    </div>
  );
};

export default ChunkingExperiments;
