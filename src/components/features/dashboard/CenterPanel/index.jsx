"use client";
import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { 
  Upload, FileText, X, MessageSquare, 
  Send, PlusCircle, RefreshCw,
  ArrowUp, Cpu, Folder 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import Select from 'react-select';
import projectApi from "@/networking/apis/project";
import fileApi from "@/networking/apis/file";
import styles from './styles.module.css';

const initialModelOptions = [];


// Options for each filter
const initialProjectOptions = [];

const defaultCategoryOption = { value: 'general', label: 'General' };

const initialDocumentOptions = [];

const defaultProcessingConfig = {
  text_processing: {
    chunk_size: 500,
    chunk_overlap: 50,
    splitter: "recursive",
  },
  data_extraction: {
    method: "pymupdf",
  },
  embeddings: {
    provider: "openai",
    model: "text-embedding-3-small",
  },
  vector_store: {
    backends: ["faiss"],
    collection_name: "documents",
  },
};

// Header Select Styles for Perfect Alignment
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
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    '&:hover': {
      borderColor: 'rgba(var(--primary), 0.4)',
      background: 'rgba(255, 255, 255, 0.06)',
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
    background: '#0f0f14',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    marginTop: '6px',
    overflow: 'hidden',
    width: 'max-content',
    minWidth: '100%',
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
    whiteSpace: 'nowrap',
    '&:active': {
      background: 'rgba(var(--primary), 0.25)',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: '#ffffff',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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

const CenterPanel = ({ onRunQuery, onSelectionChange, isRunning, processingConfig }) => {
  const [showScroll, setShowScroll] = useState(false);
  const scrollAreaRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [projectListOptions, setProjectListOptions] = useState(initialProjectOptions);
  const [documentListOptions, setDocumentListOptions] = useState(initialDocumentOptions);
  const [categoryListOptions, setCategoryListOptions] = useState([defaultCategoryOption]);

  // Selection states
  const [selectedProject, setSelectedProject] = useState(initialProjectOptions[0] ?? null);
  const [selectedCategory, setSelectedCategory] = useState(defaultCategoryOption);
  const [selectedDocument, setSelectedDocument] = useState(initialDocumentOptions[0] ?? null);

  // Header Modes: 'filters' | 'models' | 'actions'
  const [headerMode, setHeaderMode] = useState('filters');

  // Model states
  const [modelOptions, setModelOptions] = useState(initialModelOptions);
  const [selectedModel, setSelectedModel] = useState(null);
  const [newModelName, setNewModelName] = useState("");

  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [fileList, setFileList] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingFileIds, setProcessingFileIds] = useState([]);

  const normalizeProjectValue = (value) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const mapProjectToOption = React.useCallback((project) => ({
    value:
      normalizeProjectValue(project?.project_code || project?.project_name || `project-${project?.id || Date.now()}`) ||
      `project-${project?.id || Date.now()}`,
    label: project?.project_name || 'Untitled Project',
    projectId: project?.id ?? null,
    category: project?.category || 'General',
    projectCode: project?.project_code || null,
  }), []);

  const mapUploadedFileToCard = React.useCallback((file) => ({
    id: file?.id,
    name: file?.file_name || 'Unknown file',
    category: selectedProject?.category || selectedCategory?.label || 'Document',
    pages: file?.pages_count ?? '-',
    size:
      typeof file?.file_size === 'number'
        ? `${(file.file_size / (1024 * 1024)).toFixed(2)} MB`
        : '0 MB',
    fileType: file?.file_type || 'application/pdf',
    projectId: selectedProject?.projectId || null,
  }), [selectedCategory?.label, selectedProject?.category, selectedProject?.projectId]);

  const mapFileToDocumentOption = React.useCallback((file) => ({
    value: String(file?.id ?? file?.file_code ?? file?.file_name ?? Date.now()),
    label: file?.file_name || 'Unknown file',
    fileId: file?.id ?? null,
    fileCode: file?.file_code || null,
    fileType: file?.file_type || null,
    pagesCount: file?.pages_count ?? null,
  }), []);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        const response = await projectApi.fetchAllProjects();
        const options = (response?.data || []).map(mapProjectToOption);

        if (!isMounted) return;

        setProjectListOptions(options);
        setSelectedProject((prev) => {
          if (prev?.projectId) {
            const matched = options.find((item) => item.projectId === prev.projectId);
            return matched || prev;
          }
          return options[0] || null;
        });
      } catch (error) {
        if (!isMounted) return;
        setProjectListOptions([]);
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [mapProjectToOption]);

  useEffect(() => {
    if (!onSelectionChange) {
      return;
    }

    onSelectionChange({
      projectId: selectedProject?.projectId || null,
      fileId: selectedDocument?.fileId || null,
      documentLabel: selectedDocument?.label || "",
    });
  }, [onSelectionChange, selectedProject, selectedDocument]);

  useEffect(() => {
    if (!selectedProject?.category) {
      setCategoryListOptions([defaultCategoryOption]);
      setSelectedCategory(defaultCategoryOption);
      return;
    }

    const categoryOption = {
      value: normalizeProjectValue(selectedProject.category) || 'general',
      label: selectedProject.category,
    };

    setCategoryListOptions([categoryOption]);
    setSelectedCategory(categoryOption);
  }, [selectedProject]);

  useEffect(() => {
    let isMounted = true;

    const loadProjectFiles = async () => {
      if (!selectedProject?.projectId) {
        if (!isMounted) return;
        setDocumentListOptions([]);
        setSelectedDocument(null);
        return;
      }

      try {
        const response = await fileApi.fetchProjectFiles(selectedProject.projectId);
        const files = response?.data || [];

        if (!isMounted) return;

        const options = files.map(mapFileToDocumentOption);
        setDocumentListOptions(options);
        setSelectedDocument((prev) => {
          if (prev?.fileId) {
            const matched = options.find((item) => item.fileId === prev.fileId);
            return matched || options[0] || null;
          }
          return options[0] || null;
        });
        setFileList(files.map(mapUploadedFileToCard));
      } catch (error) {
        if (!isMounted) return;
        setDocumentListOptions([]);
        setSelectedDocument(null);
        setFileList([]);
      }
    };

    loadProjectFiles();

    return () => {
      isMounted = false;
    };
  }, [mapFileToDocumentOption, mapUploadedFileToCard, selectedProject]);

  const handleAddNewModel = () => {
    if (!newModelName.trim()) return;
    const newOption = { value: newModelName.toLowerCase().replace(/\s+/g, '-'), label: newModelName };
    setModelOptions([...modelOptions, newOption]);
    setSelectedModel(newOption);
    setNewModelName("");
    setHeaderMode('models');
  };

  const handleUpload = () => {
    if (!selectedProject?.projectId) {
      if (typeof window !== 'undefined') {
        window.alert('Please create or select a backend project first.');
      }
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileSelection = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    if (!selectedProject?.projectId) {
      if (typeof window !== 'undefined') {
        window.alert('Please create or select a backend project first.');
      }
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    setIsUploading(true);

    try {
      const response = await fileApi.uploadProjectFiles(selectedProject.projectId, formData);
      const uploadedFiles = response?.data || [];

      await Promise.all(
        uploadedFiles
          .filter((file) => file?.id)
          .map((file) =>
            fileApi.processProjectFile(
              selectedProject.projectId,
              file.id,
              processingConfig || defaultProcessingConfig,
            ),
          ),
      );

      const uploadedCards = uploadedFiles.map(mapUploadedFileToCard);
      const uploadedDocumentOptions = uploadedFiles.map(mapFileToDocumentOption);

      setFileList((prev) => [...uploadedCards, ...prev]);
      setDocumentListOptions((prev) => [...uploadedDocumentOptions, ...prev]);
      if (uploadedDocumentOptions[0]) {
        setSelectedDocument(uploadedDocumentOptions[0]);
      }
    } catch (error) {
      const message =
        error?.payload?.detail ||
        error?.payload?.message ||
        error?.message ||
        'Failed to upload files';
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleCreateProject = async () => {
    const trimmedProjectName = newProject.trim();
    const categoryLabel =
      newCategory.trim() ||
      selectedCategory?.label ||
      'General';

    if (!trimmedProjectName || isCreating) return;

    setIsCreating(true);

    try {
      const response = await projectApi.createProject({
        project_name: trimmedProjectName,
        category: categoryLabel,
      });

      const createdProject = response?.data;
      const option = mapProjectToOption(createdProject);

      setProjectListOptions((prev) => {
        const alreadyExists = prev.some((item) => item.projectId === option.projectId);
        return alreadyExists ? prev : [option, ...prev];
      });
      setSelectedProject(option);
      setNewProject("");
      setNewCategory("");
      setHeaderMode('filters');
    } catch (error) {
      const message =
        error?.payload?.detail ||
        error?.payload?.message ||
        error?.message ||
        'Failed to create project';
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteFile = async (file) => {
    if (!file) return;

    if (!file.id || !selectedProject?.projectId) {
      setFileList((prev) => prev.filter((item) => item !== file));
      return;
    }

    try {
      await fileApi.deleteProjectFile(selectedProject.projectId, file.id);
      setFileList((prev) => prev.filter((item) => item.id !== file.id));
      setDocumentListOptions((prev) => prev.filter((item) => item.fileId !== file.id));
      setSelectedDocument((prev) => (prev?.fileId === file.id ? null : prev));
    } catch (error) {
      const message =
        error?.payload?.detail ||
        error?.payload?.message ||
        error?.message ||
        'Failed to delete file';
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    }
  };

  const handleProcessFile = async (file) => {
    if (!file?.id || !selectedProject?.projectId) {
      return;
    }

    setProcessingFileIds((prev) => (
      prev.includes(file.id) ? prev : [...prev, file.id]
    ));

    try {
      await fileApi.processProjectFile(
        selectedProject.projectId,
        file.id,
        processingConfig || defaultProcessingConfig,
      );
      if (typeof window !== 'undefined') {
        window.alert(`Processed "${file.name}" successfully.`);
      }
    } catch (error) {
      const message =
        error?.payload?.detail ||
        error?.payload?.message ||
        error?.message ||
        'Failed to process file';
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setProcessingFileIds((prev) => prev.filter((id) => id !== file.id));
    }
  };

  const handleSend = () => {
    if (!query.trim() || isRunning) return;

    const currentQuery = query.trim();
    setMessages((prev) => [...prev, { role: "user", content: currentQuery }]);
    setQuery("");

    const executeQuery = async () => {
      if (!onRunQuery) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Query API is not connected yet." },
        ]);
        return;
      }

      try {
        const response = await onRunQuery({
          projectId: selectedProject?.projectId,
          fileId: selectedDocument?.fileId,
          query: currentQuery,
        });

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response?.answer || "No response returned." },
        ]);
      } catch (error) {
        const message =
          error?.payload?.detail ||
          error?.payload?.message ||
          error?.message ||
          "Failed to run query";
        setMessages((prev) => [...prev, { role: "assistant", content: message }]);
      }
    };

    executeQuery();
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        hidden
        onChange={handleFileSelection}
      />

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
                      instanceId="center-project-select"
                      options={projectListOptions}
                      value={selectedProject}
                      onChange={setSelectedProject}
                      styles={headerSelectStyles}
                      isSearchable={false}
                    />
                  </div>
                </div>

                <div className={styles.filterDivider} />

                {/* Category Selection */}
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>CATEGORY</span>
                  <div style={{ flex: 1, minWidth: '130px' }}>
                    <Select
                      instanceId="center-category-select"
                      options={categoryListOptions}
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      styles={headerSelectStyles}
                      isSearchable={false}
                    />
                  </div>
                </div>

                <div className={styles.filterDivider} />

                {/* Document Selection */}
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>DOCUMENT</span>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <Select
                      instanceId="center-document-select"
                      options={documentListOptions}
                      value={selectedDocument}
                      onChange={setSelectedDocument}
                      styles={headerSelectStyles}
                      isSearchable={false}
                      placeholder="Select document"
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
                      instanceId="center-model-select"
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
                  <span className={styles.filterLabel}>PROJECT NAME</span>
                  <Input
                    placeholder="New Project Name..."
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                    className={styles.headerInput}
                  />
                </div>
                <div className={styles.filterDivider} />
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>CATEGORY</span>
                  <Input
                    placeholder="Enter category..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                    className={styles.headerInput}
                  />
                </div>
                <div className={styles.filterDivider} />
                <div className={styles.filterGroup}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={styles.createButtonHeader}
                    onClick={handleCreateProject}
                    disabled={isCreating || !newProject.trim()}
                  >
                    {isCreating ? 'CREATING...' : 'CREATE'}
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
                    key={file.id || `${file.name}-${idx}`}
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
                      <button
                        className={styles.processButton}
                        onClick={() => handleProcessFile(file)}
                        type="button"
                        disabled={processingFileIds.includes(file.id)}
                      >
                        <RefreshCw
                          size={12}
                          className={classNames({
                            [styles.processingIcon]: processingFileIds.includes(file.id),
                          })}
                        />
                        <span>
                          {processingFileIds.includes(file.id) ? 'Processing' : 'Process'}
                        </span>
                      </button>
                      <button
                        className={styles.removeButton}
                        onClick={() => handleDeleteFile(file)}
                        type="button"
                      >
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
