"use client";
import React, { useState } from 'react';
import classNames from 'classnames';
import { Upload, FileText, X, FolderPlus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select as SelectOriginal, 
  SelectContent as SelectContentOriginal, 
  SelectItem as SelectItemOriginal, 
  SelectTrigger as SelectTriggerOriginal, 
  SelectValue as SelectValueOriginal 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import Select from 'react-select';
import { Search, Send, Download, Trash2, PlusCircle, LayoutGrid, List, ArrowUp, Cpu } from "lucide-react";
import { DASHBOARD_FILES, DASHBOARD_MESSAGES } from "@/lib/dashboard/data";
import styles from './styles.module.css';

// Predefined model options
const initialModelOptions = [
  { value: 'gpt4', label: 'GPT-4 Turbo' },
  { value: 'claude', label: 'Claude 3.5' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'gemini', label: 'Gemini Pro' },
];

// Header Select Styles
const headerSelectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'rgba(255, 255, 255, 0.03)',
    borderColor: state.isFocused ? 'rgba(var(--primary), 0.5)' : 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    height: '28px',
    minHeight: '28px',
    fontSize: '0.68rem',
    fontFamily: 'var(--font-mono)',
    fontWeight: '700',
    color: '#ffffff',
    boxShadow: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    '&:hover': {
      borderColor: 'rgba(var(--primary), 0.4)',
      background: 'rgba(255, 255, 255, 0.05)',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 8px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: '26px',
  }),
  menu: (base) => ({
    ...base,
    background: '#0f0f14',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    marginTop: '6px',
    overflow: 'hidden',
    width: '180px',
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
  }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? 'rgba(var(--primary), 0.15)' : 'transparent',
    color: state.isSelected ? 'rgb(var(--primary))' : 'rgba(255, 255, 255, 0.8)',
    padding: '8px 12px',
    fontSize: '0.7rem',
    fontWeight: state.isSelected ? '700' : '500',
    cursor: 'pointer',
    borderRadius: '6px',
    '&:active': {
      background: 'rgba(var(--primary), 0.25)',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: '#ffffff',
    margin: 0,
  }),
  input: (base) => ({
    ...base,
    color: '#ffffff',
    margin: 0,
    padding: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: 'rgba(255, 255, 255, 0.3)',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: '0 4px',
    color: 'rgba(255, 255, 255, 0.3)',
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
  
  // Model states
  const [modelOptions, setModelOptions] = useState(initialModelOptions);
  const [selectedModel, setSelectedModel] = useState(initialModelOptions[0]);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newModelName, setNewModelName] = useState("");

  const files = DASHBOARD_FILES;
  const [messages, setMessages] = useState(DASHBOARD_MESSAGES);
  const [query, setQuery] = useState("");
  const [fileList, setFileList] = useState(DASHBOARD_FILES);
  const [isUploading, setIsUploading] = useState(false);

  const handleAddNewModel = () => {
    if (!newModelName.trim()) return;
    const newOption = { value: newModelName.toLowerCase().replace(/\s+/g, '-'), label: newModelName };
    setModelOptions([...modelOptions, newOption]);
    setSelectedModel(newOption);
    setNewModelName("");
    setIsAddingModel(false);
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

      {/* 100% Integrated Filter Header with Context-Aware Ingestion Controls */}
      <div className={styles.filterHeader}>
        <AnimatePresence mode="wait">
          {!isCreating && !isAddingModel ? (
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
                <SelectOriginal defaultValue="legal">
                  <SelectTriggerOriginal className={styles.filterTrigger}>
                    <SelectValueOriginal placeholder="Project" />
                  </SelectTriggerOriginal>
                  <SelectContentOriginal>
                    <SelectItemOriginal value="legal">Legal Docs (Main)</SelectItemOriginal>
                    <SelectItemOriginal value="research">Research Workspace</SelectItemOriginal>
                  </SelectContentOriginal>
                </SelectOriginal>
              </div>

              <div className={styles.filterDivider} />

              {/* Model Selection (The New Addition) */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>MODEL</span>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <Select 
                    options={modelOptions}
                    value={selectedModel}
                    onChange={setSelectedModel}
                    styles={headerSelectStyles}
                    placeholder="Search model..."
                    isSearchable={true}
                  />
                </div>
              </div>

              <div className={styles.filterDivider} />

              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>CATEGORY</span>
                <SelectOriginal defaultValue="all">
                  <SelectTriggerOriginal className={styles.filterTrigger}>
                    <SelectValueOriginal placeholder="Category" />
                  </SelectTriggerOriginal>
                  <SelectContentOriginal>
                    <SelectItemOriginal value="all">All Documents</SelectItemOriginal>
                    <SelectItemOriginal value="financial">Financial Reports</SelectItemOriginal>
                    <SelectItemOriginal value="technical">Technical Specs</SelectItemOriginal>
                  </SelectContentOriginal>
                </SelectOriginal>
              </div>

              <div className={styles.filterDivider} />

              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>DOCUMENT</span>
                <SelectOriginal defaultValue="annual">
                  <SelectTriggerOriginal className={styles.filterTrigger}>
                    <SelectValueOriginal placeholder="Document" />
                  </SelectTriggerOriginal>
                  <SelectContentOriginal>
                    <SelectItemOriginal value="annual">annual_report_2024.pdf</SelectItemOriginal>
                    <SelectItemOriginal value="technical">technical_spec_v2.pdf</SelectItemOriginal>
                  </SelectContentOriginal>
                </SelectOriginal>
              </div>
            </motion.div>
          ) : isAddingModel ? (
            <motion.div
              key="addingModel"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={styles.inlineFormHeader}
            >
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>MODEL NAME</span>
                <Input
                  placeholder="Enter Model Name (e.g. GPT-5)"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNewModel()}
                  className={styles.headerInput}
                />
              </div>
              <Button
                size="sm"
                className={styles.createButtonHeader}
                onClick={handleAddNewModel}
              >
                ADD TO PROJECT
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="creation"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={styles.inlineFormHeader}
            >
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>NEW PROJECT</span>
                <Input
                  placeholder="Enter Project Name"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  className={styles.headerInput}
                />
              </div>

              <div className={styles.filterDivider} />

              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>NEW CATEGORY</span>
                <Input
                  placeholder="Enter Category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={styles.headerInput}
                />
              </div>

              <Button
                size="sm"
                className={styles.createButtonHeader}
                onClick={() => setIsCreating(false)}
              >
                CREATE PROJECT
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginLeft: 'auto' }}>
          <Button
            variant="ghost"
            size="sm"
            className={classNames(styles.iconButtonHeader, { [styles.activeButton]: isAddingModel })}
            onClick={() => { setIsAddingModel(!isAddingModel); setIsCreating(false); }}
            title="Add Custom Model"
          >
            <Cpu size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={classNames(styles.iconButtonHeader, { [styles.activeButton]: isCreating })}
            onClick={() => { setIsCreating(!isCreating); setIsAddingModel(false); }}
            title="New Project"
          >
            {isCreating ? <X size={16} /> : <FolderPlus size={16} />}
          </Button>
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
