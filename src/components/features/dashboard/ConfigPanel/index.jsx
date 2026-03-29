"use client";
import React, { useState } from 'react';
import classNames from 'classnames';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, ChevronDown, ChevronRight, FileText, Database, Share2, Search, Zap, Cpu, MousePointer2, PanelLeftClose, PanelLeft, Maximize2, Minimize2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import styles from './styles.module.css';

const Section = ({ title, icon: Icon, badge, children, defaultOpen = false, index, isCollapsed }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={classNames(styles.section, styles[`sectionStage${index}`], { [styles.sectionCollapsed]: isCollapsed })}>
      <button
        onClick={() => setOpen(!open)}
        className={classNames(styles.sectionHeader, { [styles.headerOpen]: open })}
      >
        <div className={styles.sectionTitleWrapper}>
          <div className={styles.timelineContainer}>
            {!isCollapsed && <div className={styles.timelineLine} />}
            <motion.div
              className={styles.iconWrapper}
              animate={{ scale: open && !isCollapsed ? 1.1 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Icon size={14} className={styles.sectionIcon} />
            </motion.div>
          </div>
          {!isCollapsed && <span className={styles.sectionTitle}>{title}</span>}
        </div>
        {!isCollapsed && (
          <div className={styles.headerRight}>
            {badge && (
              <Badge variant="outline" className={styles.sectionBadge}>
                {badge}
              </Badge>
            )}
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={styles.sectionContent}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div className={styles.fieldGroup}>
    {label && <Label className={styles.fieldLabel}>{label}</Label>}
    {children}
  </div>
);

const ConfigPanel = ({ isCollapsed, setIsCollapsed }) => {
  const [chunkSize, setChunkSize] = useState([1000]);
  const [overlap, setOverlap] = useState([200]);
  const [complexity, setComplexity] = useState([50]);
  const [activeDS, setActiveDS] = useState("ChromaDB");
  const [activeArch, setActiveArch] = useState("Simple Retrieval");

  return (
    <div className={classNames(styles.configPanel, { [styles.collapsed]: isCollapsed })}>
      <div className={styles.panelHeader}>
        <div className={styles.headerTitleGroup}>
          <Settings2 size={16} className={styles.headerIcon} />
          {!isCollapsed && <span className={styles.headerTitle}>Pipeline Config</span>}
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={styles.collapseToggle}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </div>

      <ScrollArea className={styles.scrollArea}>
        <Section title="Text Processing" icon={FileText} defaultOpen={false} index={0} isCollapsed={isCollapsed}>
          <Field label="Splitter Strategy">
            <Select defaultValue="recursive">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recursive">Recursive Text Splitter</SelectItem>
                <SelectItem value="semantic">Semantic Splitter</SelectItem>
                <SelectItem value="token">Token-based Splitter</SelectItem>
                <SelectItem value="fixed">Fixed-Size Splitter</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Chunk Size">
            <div className={styles.sliderGroup}>
              <Slider value={chunkSize} onValueChange={setChunkSize} min={100} max={4000} step={100} className={styles.flex1} />
              <span className={styles.monoValue}>{chunkSize[0]}</span>
            </div>
          </Field>
          <Field label="Overlap">
            <div className={styles.sliderGroup}>
              <Slider value={overlap} onValueChange={setOverlap} min={0} max={1000} step={50} className={styles.flex1} />
              <span className={styles.monoValue}>{overlap[0]}</span>
            </div>
          </Field>
        </Section>

        <Section title="Data Extraction" icon={Database} defaultOpen={false} index={1} isCollapsed={isCollapsed}>
          <Field label="Engine">
            <Select defaultValue="pymupdf">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pymupdf">PyMuPDF (High Performance)</SelectItem>
                <SelectItem value="unstructured">Unstructured.io (Standard)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="Embedding Model" icon={Cpu} index={2} isCollapsed={isCollapsed}>
          <Field label="Provider">
            <Select defaultValue="openai">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (Embed V3 Small)</SelectItem>
                <SelectItem value="ollama">Ollama (nomic-embed)</SelectItem>
                <SelectItem value="anthropic">Anthropic (Voyage 2)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="LLM Selection" icon={Zap} index={3} isCollapsed={isCollapsed}>
          <Field label="Model">
            <Select defaultValue="gpt4">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt4">GPT-4 Turbo (Preview)</SelectItem>
                <SelectItem value="claude">Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="llama">Llama 3 (Ollama)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="Vector Store" icon={Share2} index={4} isCollapsed={isCollapsed}>
          <Field label="Provider">
            <div className={styles.badgeCloud}>
              {["PostgreSQL", "ChromaDB", "FAISS", "Pinecone"].map((db) => (
                <motion.div
                  key={db}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Badge
                    onClick={() => setActiveDS(db)}
                    variant="outline"
                    className={classNames(styles.interactiveBadge, {
                      [styles.activeBadge]: activeDS === db
                    })}
                  >
                    {db}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Retrieval Strategy" icon={Search} index={5} isCollapsed={isCollapsed}>
          <Field label="Search Type">
            <Select defaultValue="semantic">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semantic">Semantic Similarity Search</SelectItem>
                <SelectItem value="hybrid">Hybrid (Keyword + Vector)</SelectItem>
                <SelectItem value="mmr">MMR (Max Marginal Relevance)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="Query Routing" icon={MousePointer2} index={6} isCollapsed={isCollapsed} defaultOpen={false}>
          <Field label="Complexity Threshold">
            <div className={styles.sliderGroup}>
              <Slider value={complexity} onValueChange={setComplexity} min={0} max={100} step={1} className={styles.flex1} />
              <span className={styles.monoValue}>{complexity[0]}%</span>
            </div>
            <div className={styles.rangeLabels}>
              <span className={styles.metaLabel}>Low → Similarity</span>
              <span className={styles.metaLabel}>High → Multi-agent</span>
            </div>
          </Field>
        </Section>

        <Section title="Agent Architecture" icon={Share2} index={7} isCollapsed={isCollapsed} defaultOpen={false}>
          <Field label="Structure">
            <div className={styles.badgeCloud}>
              {["Simple Retrieval", "Meta → Sub Agent", "Multi-Level Sub"].map((arch) => (
                <motion.div
                  key={arch}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Badge
                    onClick={() => setActiveArch(arch)}
                    variant="outline"
                    className={classNames(styles.interactiveBadge, {
                      [styles.activeBadge]: activeArch === arch
                    })}
                  >
                    {arch}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Options" icon={Settings2} index={8} isCollapsed={isCollapsed} defaultOpen={false}>
          <div className={styles.optionsList}>
            <div className={styles.optionRow}>
              <div className={styles.optionInfo}>
                <Label className={styles.optionLabel}>Redis Cache</Label>
                <span className={styles.optionSub}>Semantic caching layer</span>
              </div>
              <Switch checked={true} />
            </div>
            <div className={styles.optionRow}>
              <div className={styles.optionInfo}>
                <Label className={styles.optionLabel}>LangSmith Tracing</Label>
                <span className={styles.optionSub}>Observability pipeline</span>
              </div>
              <Switch />
            </div>
            <div className={styles.optionRow}>
              <div className={styles.optionInfo}>
                <Label className={styles.optionLabel}>RAGAS Evaluation</Label>
                <span className={styles.optionSub}>Automated quality metrics</span>
              </div>
              <Switch checked={true} />
            </div>
          </div>
        </Section>
      </ScrollArea>
    </div>
  );
};

export default ConfigPanel;
