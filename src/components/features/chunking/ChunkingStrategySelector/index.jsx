"use client";
import React, { useState } from 'react';
import classNames from 'classnames';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { CHUNKING_STRATEGIES } from "@/lib/chunking/data";
import { toggleListItem } from "@/utils/functions/selection-handlers";
import styles from './styles.module.css';

const STRATEGIES = CHUNKING_STRATEGIES;

const FieldLabel = ({ children }) => (
  <Label className={styles.fieldLabel}>{children}</Label>
);

const ConfigBlock = ({
  id,
  config,
  onChange,
}) => {
  const [open, setOpen] = useState(true);
  const strategy = STRATEGIES.find((s) => s.id === id);

  return (
    <div className={styles.configBlock}>
      <button
        onClick={() => setOpen(!open)}
        className={styles.configHeader}
      >
        <div className={styles.configTitleWrapper}>
          {open ? (
            <ChevronDown size={12} className={styles.configIcon} />
          ) : (
            <ChevronRight size={12} className={styles.configIcon} />
          )}
          <span className={styles.configTitle}>{strategy?.label}</span>
        </div>
        <Badge variant="outline" className={styles.configBadge}>
          {config.chunkSize} / {config.overlap}
        </Badge>
      </button>
      {open && (
        <div className={styles.configContent}>
          <div className={styles.fieldGroup}>
            <FieldLabel>Chunk Size</FieldLabel>
            <div className={styles.inputGroup}>
              <Slider
                value={[config.chunkSize]}
                onValueChange={([v]) => onChange({ ...config, chunkSize: v })}
                min={64}
                max={4000}
                step={64}
                className={styles.flex1}
              />
              <Input
                type="number"
                value={config.chunkSize}
                onChange={(e) => onChange({ ...config, chunkSize: Number(e.target.value) })}
                className={styles.smallInput}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <FieldLabel>Chunk Overlap</FieldLabel>
            <div className={styles.inputGroup}>
              <Slider
                value={[config.overlap]}
                onValueChange={([v]) => onChange({ ...config, overlap: v })}
                min={0}
                max={500}
                step={10}
                className={styles.flex1}
              />
              <Input
                type="number"
                value={config.overlap}
                onChange={(e) => onChange({ ...config, overlap: Number(e.target.value) })}
                className={styles.smallInput}
              />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.fieldGroup}>
              <FieldLabel>Tokenizer</FieldLabel>
              <Select
                value={config.tokenizer}
                onValueChange={(v) => onChange({ ...config, tokenizer: v })}
              >
                <SelectTrigger className={styles.fieldSelect}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktoken">tiktoken</SelectItem>
                  <SelectItem value="sentence-transformer">Sentence Transformer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={styles.fieldGroup}>
              <FieldLabel>Max Tokens</FieldLabel>
              <Input
                type="number"
                value={config.maxTokens}
                onChange={(e) => onChange({ ...config, maxTokens: Number(e.target.value) })}
                className={styles.fieldInput}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <FieldLabel>Min Chunk Length</FieldLabel>
            <Input
              type="number"
              value={config.minChunkLen}
              onChange={(e) => onChange({ ...config, minChunkLen: Number(e.target.value) })}
              className={styles.mediumInput}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ChunkingStrategySelector = ({ selected = [], onSelectedChange, configs = {}, onConfigChange }) => {
  const toggle = (id) => {
    onSelectedChange(toggleListItem(selected, id));
  };

  return (
    <div className={styles.strategySelector}>
      <div className={styles.panelHeader}>
        <Layers size={16} className={styles.headerIcon} />
        <span className={styles.headerTitle}>
          Chunking Strategies
        </span>
        <Badge variant="outline" className={styles.headerBadge}>
          {selected.length} selected
        </Badge>
      </div>

      <ScrollArea className={styles.scrollArea}>
        {/* Strategy List */}
        <div className={styles.strategyList}>
          {STRATEGIES.map((s) => (
            <label
              key={s.id}
              className={classNames(styles.strategyItem, {
                [styles.selected]: selected.includes(s.id)
              })}
            >
              <Checkbox
                checked={selected.includes(s.id)}
                onCheckedChange={() => toggle(s.id)}
                className={styles.strategyCheckbox}
              />
              <div className={styles.strategyInfo}>
                <span className={styles.strategyLabel}>{s.label}</span>
                <span className={styles.strategyDesc}>{s.desc}</span>
              </div>
            </label>
          ))}
        </div>

        {/* Config blocks */}
        <div className={styles.configArea}>
          {selected.length === 0 && (
            <p className={styles.emptyText}>
              Select strategies above to configure
            </p>
          )}
          {selected.map((id) => (
            <ConfigBlock
              key={id}
              id={id}
              config={configs[id]}
              onChange={(c) => onConfigChange(id, c)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export { STRATEGIES };
export default ChunkingStrategySelector;
