"use client";
import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import {
  Settings2, ChevronDown, ChevronRight, FileText, Database,
  Share2, Search, Zap, Cpu, MousePointer2, PanelLeftClose,
  PanelLeft, Maximize2, Minimize2, X, Ruler
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import styles from './styles.module.css';

// Custom Select Styles for Premium Aesthetics
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'rgba(15, 15, 20, 0.6)',
    borderColor: state.isFocused ? 'rgb(var(--primary))' : 'rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '1px 4px',
    boxShadow: state.isFocused ? '0 0 0 1px rgba(var(--primary), 0.3)' : 'none',
    '&:hover': {
      borderColor: 'rgba(var(--primary), 0.5)',
    },
    minHeight: '36px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
  }),
  menu: (base) => ({
    ...base,
    background: '#0f0f14',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6)',
    overflow: 'hidden',
    zIndex: 100,
    marginTop: '8px',
    padding: '4px',
  }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? 'rgba(var(--primary), 0.15)' : 'transparent',
    color: state.isSelected ? 'rgb(var(--primary))' : 'rgba(255, 255, 255, 0.8)',
    padding: '10px 14px',
    fontSize: '0.75rem',
    fontWeight: state.isSelected ? '600' : '400',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.15s ease',
    '&:active': {
      background: 'rgba(var(--primary), 0.25)',
    },
  }),
  multiValue: (base) => ({
    ...base,
    background: 'rgba(var(--primary), 0.12)',
    borderRadius: '6px',
    border: '1px solid rgba(var(--primary), 0.25)',
    display: 'flex',
    alignItems: 'center',
    margin: '2px',
    overflow: 'hidden',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'rgb(var(--primary))',
    fontSize: '0.68rem',
    fontWeight: '700',
    padding: '2px 6px',
    paddingRight: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'rgb(var(--primary))',
    padding: '2px 4px',
    opacity: 0.7,
    '&:hover': {
      background: 'rgba(var(--primary), 0.2)',
      color: 'rgb(var(--primary))',
      opacity: 1,
    },
    transition: 'all 0.2s ease',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.75rem',
    fontWeight: '500',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: '500',
  }),
  input: (base) => ({
    ...base,
    color: '#ffffff',
    fontSize: '0.75rem',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'rgba(255, 255, 255, 0.4)',
    padding: '4px',
    '&:hover': {
      color: 'rgb(var(--primary))',
    },
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  clearIndicator: (base) => ({
    ...base,
    color: 'rgba(255, 255, 255, 0.4)',
    padding: '4px',
    '&:hover': {
      color: '#ef4444',
    },
  }),
};

// Options
const extractionOptions = [
  { value: 'pymupdf', label: 'PyMuPDF (High Performance)' },
  { value: 'unstructured', label: 'Unstructured.io (Standard)' },
];

const embeddingOptions = [
  { value: 'openai', label: 'OpenAI (text-embedding-3-small)' },
  { value: 'ollama', label: 'Ollama (nomic-embed)' },
];
// C:\Users\vilje.dev19\Documents\RAG_pipeline\InsightPdf-Engine-Frontend\src\components\features\dashboard\ConfigPanel\index.jsx
const llmOptions = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'llama3.2', label: 'Llama 3.2 (Ollama)' },
];

const vectorStoreOptions = [
  { value: 'pgvector', label: 'PostgreSQL (pgvector)' },
  { value: 'chromadb', label: 'ChromaDB' },
  { value: 'faiss', label: 'FAISS' },
  { value: 'pinecone', label: 'Pinecone' },
];

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

const ConfigPanel = ({ isCollapsed, setIsCollapsed, onConfigChange }) => {
  const [chunkLength, setChunkLength] = useState(500);
  const [overlap, setOverlap] = useState([50]);
  const [splitter, setSplitter] = useState({ value: 'recursive', label: 'Recursive Text Splitter' });
  const [retrievalType, setRetrievalType] = useState({ value: 'similarity', label: 'Semantic Similarity Search' });

  // Selection states
  const [extraction, setExtraction] = useState([extractionOptions[0]]);
  const [embeddings, setEmbeddings] = useState([embeddingOptions[0]]);
  const [selectedLLMs, setSelectedLLMs] = useState([llmOptions[0]]);
  const [vectorStores, setVectorStores] = useState([vectorStoreOptions[2]]);

  const [activeArch, setActiveArch] = useState("Simple Retrieval");

  // Custom components for react-select
  const CustomMultiValueRemove = (props) => {
    return (
      <div {...props.innerProps} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0 4px' }}>
        <X size={11} strokeWidth={3} />
      </div>
    );
  };

  useEffect(() => {
    if (!onConfigChange) {
      return;
    }

    const selectedEmbeddings = (embeddings || [])
      .map((item) => {
        if (!item?.value) return null;
        if (item.value === 'ollama') {
          return { provider: 'ollama', model: 'nomic-embed-text' };
        }
        return { provider: 'openai', model: 'text-embedding-3-small' };
      })
      .filter(Boolean);

    const selectedLlm = selectedLLMs?.[0]?.value === 'llama3.2'
      ? { provider: 'ollama', model: 'llama3.2', temperature: 0.2 }
      : { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2 };

    onConfigChange({
      text_processing: {
        chunk_size: Number(chunkLength) || 500,
        chunk_overlap: Number(overlap?.[0]) || 50,
        splitter: splitter?.value || 'recursive',
      },
      data_extraction: {
        method:
          extraction.length > 1
            ? extraction.map((item) => item.value)
            : extraction[0]?.value || 'pymupdf',
      },
      embeddings:
        selectedEmbeddings.length > 1
          ? selectedEmbeddings
          : selectedEmbeddings[0] || { provider: 'openai', model: 'text-embedding-3-small' },
      vector_store: {
        backends: (vectorStores || []).map((item) => item.value),
        collection_name: 'documents',
      },
      query: {
        retrieval_strategy: {
          top_k: 5,
          search_type: retrievalType?.value || 'similarity',
          vector_db:
            vectorStores.length > 1
              ? vectorStores.map((item) => item.value)
              : vectorStores[0]?.value || 'faiss',
          collection_name: 'documents',
        },
        embedding: selectedEmbeddings[0] || { provider: 'openai', model: 'text-embedding-3-small' },
        llm: selectedLlm,
        self_reflection: {
          enabled: true,
          max_retries: 2,
          retrieval_top_k_step: 2,
        },
      },
    });
  }, [
    chunkLength,
    embeddings,
    extraction,
    onConfigChange,
    overlap,
    retrievalType,
    selectedLLMs,
    splitter,
    vectorStores,
  ]);

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
        <Section title="Chunk Length" icon={Ruler} defaultOpen={true} index={0} isCollapsed={isCollapsed}>
          <Field label="Manual length entry">
            <div className={styles.manualInputWrapper}>
              <Input
                type="number"
                value={chunkLength}
                onChange={(e) => setChunkLength(e.target.value)}
                className={styles.manualEntryInput}
                placeholder="e.g. 1000"
              />
              <span className={styles.inputUnit}>chars</span>
            </div>
          </Field>
        </Section>

        <Section title="Text Processing" icon={FileText} defaultOpen={false} index={1} isCollapsed={isCollapsed}>
          <Field label="Splitter Strategy">
            <Select
              instanceId="config-splitter-select"
              options={[
                { value: 'recursive', label: 'Recursive Text Splitter' },
                { value: 'semantic', label: 'Semantic Splitter' },
                { value: 'token', label: 'Token-based Splitter' },
                { value: 'fixed', label: 'Fixed-Size Splitter' },
              ]}
              value={splitter}
              onChange={setSplitter}
              styles={customSelectStyles}
              isSearchable={false}
              menuPlacement="auto"
            />
          </Field>
          <Field label="Overlap">
            <div className={styles.sliderGroup}>
              <Slider value={overlap} onValueChange={setOverlap} min={0} max={1000} step={50} className={styles.flex1} />
              <span className={styles.monoValue}>{overlap[0]}</span>
            </div>
          </Field>
        </Section>

        <Section title="Data Extraction" icon={Database} defaultOpen={false} index={2} isCollapsed={isCollapsed}>
          <Field label="Engines (Multi-select)">
            <Select
              instanceId="config-extraction-select"
              isMulti
              options={extractionOptions}
              value={extraction}
              onChange={setExtraction}
              styles={customSelectStyles}
              components={{ MultiValueRemove: CustomMultiValueRemove }}
              closeMenuOnSelect={false}
              placeholder="Select Engines..."
              menuPlacement="auto"
            />
          </Field>
        </Section>

        <Section title="Embedding Model" icon={Cpu} index={3} isCollapsed={isCollapsed}>
          <Field label="Providers (Multi-select)">
            <Select
              instanceId="config-embeddings-select"
              isMulti
              options={embeddingOptions}
              value={embeddings}
              onChange={setEmbeddings}
              styles={customSelectStyles}
              components={{ MultiValueRemove: CustomMultiValueRemove }}
              closeMenuOnSelect={false}
              placeholder="Select Providers..."
              menuPlacement="auto"
            />
          </Field>
        </Section>

        <Section title="LLM Selection" icon={Zap} index={4} isCollapsed={isCollapsed}>
          <Field label="Models (Multi-select)">
            <Select
              instanceId="config-llm-select"
              isMulti
              options={llmOptions}
              value={selectedLLMs}
              onChange={setSelectedLLMs}
              styles={customSelectStyles}
              components={{ MultiValueRemove: CustomMultiValueRemove }}
              closeMenuOnSelect={false}
              placeholder="Select Models..."
              menuPlacement="auto"
            />
          </Field>
        </Section>

        <Section title="Vector Store" icon={Share2} index={5} isCollapsed={isCollapsed}>
          <Field label="Providers (Multi-select)">
            <Select
              instanceId="config-vector-store-select"
              isMulti
              options={vectorStoreOptions}
              value={vectorStores}
              onChange={setVectorStores}
              styles={customSelectStyles}
              components={{ MultiValueRemove: CustomMultiValueRemove }}
              closeMenuOnSelect={false}
              placeholder="Select Vector Stores..."
              menuPlacement="auto"
            />
          </Field>
        </Section>

        <Section title="Retrieval Strategy" icon={Search} index={6} isCollapsed={isCollapsed}>
          <Field label="Search Type">
            <Select
              instanceId="config-retrieval-select"
              options={[
                { value: 'similarity', label: 'Semantic Similarity Search' },
              ]}
              value={retrievalType}
              onChange={setRetrievalType}
              styles={customSelectStyles}
              isSearchable={false}
              menuPlacement="auto"
            />
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
