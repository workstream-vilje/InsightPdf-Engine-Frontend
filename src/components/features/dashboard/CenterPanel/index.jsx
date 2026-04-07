"use client";
import React, { useState } from 'react';
import classNames from 'classnames';
import { 
  Upload, FileText, X, FolderPlus, MessageSquare, 
  Search, Send, Download, Trash2, PlusCircle, 
  LayoutGrid, List, ArrowUp, Cpu, Folder 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import Select from 'react-select';
import { DASHBOARD_FILES, DASHBOARD_MESSAGES } from "@/lib/dashboard/data";
import styles from './styles.module.css';

// Predefined model options
const initialModelOptions = [
  { value: 'gpt4', label: 'GPT-4 Turbo' },
  { value: 'claude', label: 'Claude 3.5' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'gemini', label: 'Gemini Pro' },
];


// Options for each filter
const projectOptions = [
  { value: 'legal', label: 'Legal Docs (Main)' },
  { value: 'research', label: 'Research Workspace' },
];

const categoryOptions = [
  { value: 'all', label: 'All Documents' },
  { value: 'financial', label: 'Financial Reports' },
  { value: 'technical', label: 'Technical Specs' },
];

const documentOptions = [
  { value: 'annual', label: 'annual_report_2024.pdf' },
  { value: 'technical', label: 'technical_spec_v2.pdf' },
];

// Header Select Styles for Perfect Alignment
const headerSelectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'rgba(var(--surface-1), 0.95)',
    borderColor: state.isFocused ? 'rgba(var(--primary), 0.75)' : 'rgba(var(--border), 0.9)',
    borderRadius: '8px',
    height: '28px',
    minHeight: '28px',
    fontSize: '0.68rem',
    fontFamily: 'var(--font-mono)',
    fontWeight: '700',
    color: 'rgb(var(--foreground))',
    boxShadow: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    '&:hover': {
      borderColor: 'rgba(var(--primary), 0.7)',
      background: 'rgba(var(--surface-1), 1)',
    },
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 8px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    flexWrap: 'nowrap',
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: '26px',
  }),
  menu: (base) => ({
    ...base,
    background: 'rgb(var(--surface-1))',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(var(--border), 0.85)',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(173, 129, 148, 0.16)',
    zIndex: 1000,
    marginTop: '6px',
    overflow: 'hidden',
    width: 'max-content',
    minWidth: '100%',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 5000,
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
  }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? 'rgba(var(--primary), 0.15)' : 'transparent',
    color: state.isSelected ? 'rgb(var(--primary-foreground))' : 'rgba(var(--foreground), 0.88)',
    padding: '8px 12px',
    fontSize: '0.7rem',
    fontWeight: state.isSelected ? '700' : '500',
    cursor: 'pointer',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
    '&:active': {
      background: 'rgba(var(--primary), 0.25)',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: 'rgb(var(--foreground))',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  input: (base) => ({
    ...base,
    color: 'rgb(var(--foreground))',
    margin: 0,
    padding: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: 'rgba(var(--muted-foreground), 0.9)',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: '0 4px',
    color: 'rgba(var(--muted-foreground), 0.9)',
    '&:hover': { color: 'rgb(var(--primary))' },
  }),
  indicatorSeparator: () => ({ display: 'none' }),
};

const CenterPanel = () => {
  const [view, setView] = useState("list");
  const [showScroll, setShowScroll] = useState(false);
  const scrollAreaRef = React.useRef(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Selection states
  const [selectedProject, setSelectedProject] = useState(projectOptions[0]);
  const [selectedCategory, setSelectedCategory] = useState(categoryOptions[0]);
  const [selectedDocument, setSelectedDocument] = useState(documentOptions[0]);

  // Header Modes: 'filters' | 'models' | 'actions'
  const [headerMode, setHeaderMode] = useState('filters');

  // Model states
  const [modelOptions, setModelOptions] = useState(initialModelOptions);
  const [selectedModel, setSelectedModel] = useState(initialModelOptions[0]);
  const [newModelName, setNewModelName] = useState("");

  const files = DASHBOARD_FILES;
  const [messages, setMessages] = useState(DASHBOARD_MESSAGES);
  const [query, setQuery] = useState("");
  const [fileList, setFileList] = useState(DASHBOARD_FILES);
  const [isUploading, setIsUploading] = useState(false);
  const menuPortalTarget = typeof window !== "undefined" ? document.body : null;

  const handleAddNewModel = () => {
    if (!newModelName.trim()) return;
    const newOption = { value: newModelName.toLowerCase().replace(/\s+/g, '-'), label: newModelName };
    setModelOptions([...modelOptions, newOption]);
    setSelectedModel(newOption);
    setNewModelName("");
    setHeaderMode('models');
  };

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      const newFile = {
        name: `ANNUAL_REPORT_24.PDF`,
        category: "Financial",
        pages: 54,
        size: "2.4MB"
      };
      setFileList(prev => [newFile, ...prev]);
      setIsUploading(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!query.trim()) return;
    setMessages([...messages, { role: "user", content: query }]);
    setQuery("");
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "Processing your query through the configured RAG pipeline..." }]);
    }, 500);
  };

  const scrollToTop = () => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScroll = (e) => {
    const target = e.currentTarget;
    setShowScroll(target.scrollTop > 300);
  };

  return (
    <div className={styles.centerPanel}>
      {/* Top Header Aligned with Sidebar/Results */}
      <div className={styles.panelHeader}>
        <MessageSquare size={16} className={styles.headerIcon} />
        <span className={styles.headerTitle}>Knowledge Canvas</span>
      </div>

      {/* Tabbed Integrated Filter Header */}
      <div className={styles.filterHeader}>
        {/* Tab Switcher Icons */}
        <div className={styles.headerTabSwitcher}>
          <button
            className={classNames(styles.tabIconButton, { [styles.activeTab]: headerMode === 'filters' })}
            onClick={() => setHeaderMode('filters')}
            title="Browse Filters"
          >
            <Folder size={14} />
          </button>
          <button
            className={classNames(styles.tabIconButton, { [styles.activeTab]: headerMode === 'models' })}
            onClick={() => setHeaderMode('models')}
            title="Model Selection"
          >
            <Cpu size={14} />
          </button>
          <button
            className={classNames(styles.tabIconButton, { [styles.activeTab]: headerMode === 'actions' })}
            onClick={() => setHeaderMode('actions')}
            title="Quick Actions"
          >
            <PlusCircle size={14} />
          </button>
        </div>

        <div className={styles.headerModeContent}>
          <AnimatePresence mode="wait">
            {headerMode === 'filters' && (
              <motion.div
                key="filters"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', flex: 1, minWidth: 0 }}
              >
                {/* Project Selection */}
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>PROJECT</span>
                  <div style={{ flex: 1, minWidth: '130px' }}>
                    <Select
                      options={projectOptions}
                      value={selectedProject}
                      onChange={setSelectedProject}
                      styles={headerSelectStyles}
                      isSearchable={false}
                      menuPortalTarget={menuPortalTarget}
                      menuPosition="fixed"
                    />
                  </div>
                </div>

                <div className={styles.filterDivider} />

                {/* Category Selection */}
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>CATEGORY</span>
                  <div style={{ flex: 1, minWidth: '130px' }}>
                    <Select
                      options={categoryOptions}
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      styles={headerSelectStyles}
                      isSearchable={false}
                      menuPortalTarget={menuPortalTarget}
                      menuPosition="fixed"
                    />
                  </div>
                </div>

                <div className={styles.filterDivider} />

                {/* Document Selection */}
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>DOCUMENT</span>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <Select
                      options={documentOptions}
                      value={selectedDocument}
                      onChange={setSelectedDocument}
                      styles={headerSelectStyles}
                      isSearchable={false}
                      menuPortalTarget={menuPortalTarget}
                      menuPosition="fixed"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {headerMode === 'models' && (
              <motion.div
                key="models"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', flex: 1, minWidth: 0 }}
              >
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>ACTIVE MODEL</span>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <Select
                      options={modelOptions}
                      value={selectedModel}
                      onChange={setSelectedModel}
                      styles={headerSelectStyles}
                      placeholder="Search model..."
                      isSearchable={true}
                      menuPortalTarget={menuPortalTarget}
                      menuPosition="fixed"
                    />
                  </div>
                </div>
                <div className={styles.filterDivider} />
                <span className={styles.statusTag}>STABLE</span>
              </motion.div>
            )}

            {headerMode === 'actions' && (
              <motion.div
                key="actions"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={styles.inlineFormHeader}
                style={{ flex: 1 }}
              >
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>MODEL INTAKE</span>
                  <Input
                    placeholder="DeepSeek-V3..."
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNewModel()}
                    className={styles.headerInput}
                  />
                </div>
                <Button variant="ghost" size="sm" className={styles.createButtonHeader} onClick={handleAddNewModel}>
                  ADD MODEL
                </Button>
                <div className={styles.filterDivider} />
                <div className={styles.filterGroup}>
                  <Input
                    placeholder="New Project Name..."
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    className={styles.headerInput}
                  />
                  <Button variant="ghost" size="sm" className={styles.createButtonHeader} onClick={() => setHeaderMode('filters')}>
                    CREATE
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ScrollArea
        className={styles.mainScroll}
        ref={scrollAreaRef}
        onScrollCapture={handleScroll}
      >
        <div className={styles.content}>
          {/* PDF Upload Section - Header Removed to Save Space */}
          <div className={styles.uploadArea}>
            {/* Drop Zone */}
            <div className={styles.dropzone} onClick={handleUpload}>
              {isUploading ? (
                <div className={styles.uploadingProgress}>
                  <div className={styles.uploadSpinner} />
                  <p className={styles.droptext}>Uploading technical document...</p>
                </div>
              ) : (
                <>
                  <Upload className={styles.uploadIcon} />
                  <p className={styles.droptext}>Drop PDFs or click to upload</p>
                </>
              )}
            </div>

            {/* File List */}
            <div className={styles.fileList}>
              <AnimatePresence>
                {fileList.map((file, idx) => (
                  <motion.div
                    key={file.name}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.fileCard}
                  >
                    <div className={styles.fileInfo}>
                      <FileText className={styles.fileTypeIcon} />
                      <span className={styles.fileName}>{file.name}</span>
                    </div>
                    <div className={styles.fileMeta}>
                      <Badge variant="outline" className={styles.fileBadge}>{file.category}</Badge>
                      <span className={styles.monoText}>{file.pages}p</span>
                      <span className={styles.monoText}>{file.size}</span>
                      <button className={styles.removeButton}>
                        <X size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Chat Section */}
          <div className={styles.chatSection}>
            <div className={styles.messageList}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={classNames(styles.messageWrapper, {
                    [styles.userWrapper]: msg.role === "user",
                    [styles.assistantWrapper]: msg.role === "assistant"
                  })}
                >
                  <div
                    className={classNames(styles.message, {
                      [styles.userMessage]: msg.role === "user",
                      [styles.assistantMessage]: msg.role === "assistant"
                    })}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Floating Scroll Top Indicator */}
      <AnimatePresence>
        {showScroll && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className={styles.scrollTopWrapper}
          >
            <Button
              variant="outline"
              size="sm"
              className={styles.scrollTopBtn}
              onClick={scrollToTop}
            >
              <ArrowUp size={14} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Query Input fixed to bottom of center panel */}
      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question about the document..."
            className={styles.chatInput}
          />
          <Button onClick={handleSend} className={styles.sendButton}>
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CenterPanel;
