"use client";
import React, { useState } from 'react';
import classNames from 'classnames';
import { Upload, FileText, X, FolderPlus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, Download, Trash2, PlusCircle, LayoutGrid, List, ArrowUp } from "lucide-react";
import { DASHBOARD_FILES, DASHBOARD_MESSAGES } from "@/lib/dashboard/data";
import styles from './styles.module.css';

const CenterPanel = () => {
  const [view, setView] = useState("list");
  const [showScroll, setShowScroll] = useState(false);
  const scrollAreaRef = React.useRef(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const files = DASHBOARD_FILES;
  const [messages, setMessages] = useState(DASHBOARD_MESSAGES);
  const [query, setQuery] = useState("");
  const [fileList, setFileList] = useState(DASHBOARD_FILES);
  const [isUploading, setIsUploading] = useState(false);

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
          {!isCreating ? (
            <motion.div
              key="filters"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', flex: 1 }}
            >
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>PROJECT</span>
                <Select defaultValue="legal">
                  <SelectTrigger className={styles.filterTrigger}>
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal">Legal Docs (Main)</SelectItem>
                    <SelectItem value="research">Research Workspace</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={styles.filterDivider} />

              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>CATEGORY</span>
                <Select defaultValue="all">
                  <SelectTrigger className={styles.filterTrigger}>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Documents</SelectItem>
                    <SelectItem value="financial">Financial Reports</SelectItem>
                    <SelectItem value="technical">Technical Specs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={styles.filterDivider} />

              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>DOCUMENT</span>
                <Select defaultValue="annual">
                  <SelectTrigger className={styles.filterTrigger}>
                    <SelectValue placeholder="Document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">annual_report_2024.pdf</SelectItem>
                    <SelectItem value="technical">technical_spec_v2.pdf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

        <Button
          variant="ghost"
          size="sm"
          className={classNames(styles.iconButtonHeader, { [styles.activeButton]: isCreating })}
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? <X size={16} /> : <FolderPlus size={16} />}
        </Button>
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
