"use client";

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import classNames from "classnames";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Blocks,
  ChevronRight,
  Database,
  FileText,
  FolderKanban,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  DATA_EXTRACTION_OPTIONS,
  DEFAULT_EXECUTION_METRICS,
  DEFAULT_QUALITY_METRICS,
  DEFAULT_RESPONSE,
  EMBEDDING_OPTIONS,
  INITIAL_PROJECTS,
  PROCESSING_LINES,
  PROJECT_CATEGORIES,
  RETRIEVAL_STRATEGY_OPTIONS,
  TEXT_PROCESSING_OPTIONS,
  VECTOR_STORE_OPTIONS,
  createWorkspaceState,
} from "@/lib/projects/data";
import { ROUTE_PATHS } from "@/utils/routepaths";
import styles from "./styles.module.css";

const RIGHT_SIDEBAR_ITEMS = [
  { value: "response", label: "Response", icon: MessageSquare },
  { value: "chunks", label: "Retrieved Chunks", icon: FileText },
  { value: "performance", label: "Execution Performance", icon: Sparkles },
  { value: "quality", label: "Quality Metrics", icon: Database },
];

const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const TypedLine = ({ text }) => {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    const words = text.split(" ");
    const timeouts = [];

    words.forEach((_, index) => {
      timeouts.push(
        window.setTimeout(() => {
          setVisibleText(words.slice(0, index + 1).join(" "));
        }, index * 140),
      );
    });

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [text]);

  return <p className={styles.statusLine}>{visibleText}</p>;
};

const MultiSelectChips = ({ options, selectedValues, onToggle }) => (
  <div className={styles.choiceGrid}>
    {options.map((option) => {
      const checked = selectedValues.includes(option.value);
      return (
        <button
          key={option.value}
          type="button"
          className={classNames(styles.choiceChip, {
            [styles.choiceChipActive]: checked,
          })}
          onClick={() => onToggle(option.value)}
        >
          <Checkbox checked={checked} className={styles.choiceCheckbox} />
          <span>{option.label}</span>
        </button>
      );
    })}
  </div>
);

const SingleSelectChips = ({ options, value, onChange }) => (
  <div className={styles.choiceGrid}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        className={classNames(styles.choiceChip, {
          [styles.choiceChipActive]: value === option.value,
        })}
        onClick={() => onChange(option.value)}
      >
        <span className={styles.radioDot} />
        <span>{option.label}</span>
      </button>
    ))}
  </div>
);

const SidebarSection = ({ icon: Icon, title, description, expanded, children }) => (
  <section className={styles.sidebarSection}>
    <div className={styles.sidebarSectionHeader}>
      <div className={styles.sidebarSectionIcon}>
        <Icon size={16} />
      </div>
      {expanded && (
        <div>
          <p className={styles.sidebarSectionTitle}>{title}</p>
          {description && <p className={styles.sidebarSectionDescription}>{description}</p>}
        </div>
      )}
    </div>
    {expanded && <div className={styles.sidebarSectionBody}>{children}</div>}
  </section>
);

const ProjectCanvas = ({ initialProjectId = null }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [projectWorkspaces, setProjectWorkspaces] = useState(() =>
    Object.fromEntries(INITIAL_PROJECTS.map((project) => [project.id, createWorkspaceState()])),
  );
  const [activeProjectId, setActiveProjectId] = useState(initialProjectId);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const [projectFilter, setProjectFilter] = useState("all");
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCategory, setNewProjectCategory] = useState("");
  const [isLeftSidebarExpanded, setIsLeftSidebarExpanded] = useState(false);
  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(false);
  const fileInputRef = useRef(null);
  const timersRef = useRef([]);
  const hasHydratedRef = useRef(false);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );
  const activeWorkspace = activeProjectId ? projectWorkspaces[activeProjectId] : null;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (typeof window === "undefined" || hasHydratedRef.current) return;

    try {
      const storedProjects = window.localStorage.getItem("rag-canvas-projects");
      const storedWorkspaces = window.localStorage.getItem("rag-canvas-workspaces");

      if (storedProjects) {
        const parsedProjects = JSON.parse(storedProjects);
        if (Array.isArray(parsedProjects)) {
          setProjects(parsedProjects);
        }
      }

      if (storedWorkspaces) {
        const parsedWorkspaces = JSON.parse(storedWorkspaces);
        if (parsedWorkspaces && typeof parsedWorkspaces === "object") {
          setProjectWorkspaces(parsedWorkspaces);
        }
      }
    } catch (error) {
      console.error("Failed to restore workspace state", error);
    }

    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedRef.current) return;
    window.localStorage.setItem("rag-canvas-projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedRef.current) return;
    window.localStorage.setItem("rag-canvas-workspaces", JSON.stringify(projectWorkspaces));
  }, [projectWorkspaces]);

  useEffect(() => {
    if (!initialProjectId) return;
    const projectExists = projects.some((project) => project.id === initialProjectId);
    if (projectExists) {
      setActiveProjectId(initialProjectId);
    }
  }, [initialProjectId, projects]);

  const updateActiveWorkspace = useCallback(
    (recipe) => {
      if (!activeProjectId) return;
      setProjectWorkspaces((previous) => ({
        ...previous,
        [activeProjectId]: recipe(previous[activeProjectId]),
      }));
    },
    [activeProjectId],
  );

  const visibleProjects = useMemo(() => {
    const normalizedSearch = deferredSearchValue.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesFilter = projectFilter === "all" || project.category === projectFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        project.name.toLowerCase().includes(normalizedSearch) ||
        project.category.toLowerCase().includes(normalizedSearch) ||
        project.description.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [deferredSearchValue, projectFilter, projects]);

  const availableCategories = useMemo(
    () => Array.from(new Set([...PROJECT_CATEGORIES, ...projects.map((project) => project.category).filter(Boolean)])),
    [projects],
  );

  const toggleWorkspaceValue = useCallback(
    (key, value) => {
      updateActiveWorkspace((current) => ({
        ...current,
        [key]: current[key].includes(value)
          ? current[key].filter((item) => item !== value)
          : [...current[key], value],
      }));
    },
    [updateActiveWorkspace],
  );

  const handleCreateProject = () => {
    if (!newProjectName.trim() || !newProjectCategory.trim()) return;

    const normalizedName = newProjectName.trim().toLowerCase().replace(/\s+/g, "-");
    const nextProject = {
      id: normalizedName,
      name: normalizedName,
      category: newProjectCategory.trim(),
      description: `${newProjectCategory.trim()} workspace for uploads, chunking, embeddings, and query evaluation.`,
      region: "AWS | ap-south-1",
      tier: "New",
      documents: 0,
      lastUpdated: "Just now",
    };

    startTransition(() => {
      setProjects((current) => [nextProject, ...current]);
      setProjectWorkspaces((current) => ({
        ...current,
        [nextProject.id]: createWorkspaceState(),
      }));
      setIsCreateProjectOpen(false);
      setNewProjectName("");
      setNewProjectCategory("");
    });
  };

  const handleOpenProject = (projectId) => {
    startTransition(() => {
      setActiveProjectId(projectId);
      router.replace(`${ROUTE_PATHS.HOME}?project=${projectId}`);
    });
  };

  const handleFileUpload = (event) => {
    const selectedFiles = Array.from(event.target.files ?? []).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: formatBytes(file.size),
      category: activeProject?.category ?? "General",
    }));

    if (selectedFiles.length === 0) return;

    updateActiveWorkspace((current) => ({
      ...current,
      files: [...current.files, ...selectedFiles],
      phase: "ingestion-setup",
      query: "",
      visibleLines: [],
      response: "",
      responseVisible: false,
      activeRightSection: "response",
    }));

    event.target.value = "";
  };

  const handleStartIngestion = () => {
    if (!activeWorkspace) return;

    clearTimers();
    const runId = `${activeProjectId}-${Date.now()}`;

    updateActiveWorkspace((current) => ({
      ...current,
      phase: "ingestion-processing",
      visibleLines: [],
      response: "",
      responseVisible: false,
      activeRightSection: "response",
    }));

    PROCESSING_LINES.forEach((line, index) => {
      timersRef.current.push(
        window.setTimeout(() => {
          updateActiveWorkspace((current) => ({
            ...current,
            visibleLines: [...current.visibleLines, { id: `${runId}-${index}`, text: line }],
          }));
        }, 900 * (index + 1)),
      );
    });

    timersRef.current.push(
      window.setTimeout(() => {
        updateActiveWorkspace((current) => ({
          ...current,
          phase: "query-ready",
          retrievalStrategies:
            current.retrievalStrategies.length > 0
              ? current.retrievalStrategies
              : ["semantic-similarity"],
        }));
      }, 900 * (PROCESSING_LINES.length + 1) + 300),
    );
  };

  const handleStartQuery = () => {
    if (!activeWorkspace?.query.trim()) return;

    clearTimers();
    updateActiveWorkspace((current) => ({
      ...current,
      phase: "query-processing",
      visibleLines: [],
      response: "",
      responseVisible: false,
      activeRightSection: "response",
    }));

    timersRef.current.push(
      window.setTimeout(() => {
        updateActiveWorkspace((current) => ({
          ...current,
          phase: "query-complete",
          response: DEFAULT_RESPONSE,
          responseVisible: true,
        }));
      }, 1400),
    );
  };

  const isQueryStage = activeWorkspace
    ? ["query-ready", "query-processing", "query-complete"].includes(activeWorkspace.phase)
    : false;

  if (!activeProject || !activeWorkspace) {
    return (
      <div className={styles.projectsShell}>
        <main className={styles.projectsStage}>
          <header className={styles.projectsHeader}>
            <div>
              <p className={styles.eyebrow}>Workspace Launcher</p>
              <h1 className={styles.pageTitle}>RAG Canvas</h1>
              <p className={styles.pageSubtitle}>
                Create a project first, then open the workspace from its card.
              </p>
            </div>
          </header>

          <section className={styles.projectsToolbar}>
            <div className={styles.toolbarSearch}>
              <Search size={18} className={styles.toolbarSearchIcon} />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search for a project"
                className={styles.toolbarInput}
              />
            </div>

            <div className={styles.toolbarActions}>
              <label className={styles.dropdownWrap}>
                <select
                  value={projectFilter}
                  onChange={(event) => setProjectFilter(event.target.value)}
                  className={styles.dropdown}
                >
                  <option value="all">All Projects</option>
                  {availableCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <Button className={styles.newProjectButton} onClick={() => setIsCreateProjectOpen(true)}>
                <Plus size={16} />
                New project
              </Button>
            </div>
          </section>

          <AnimatePresence>
            {isCreateProjectOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={styles.modalOverlay}
                onClick={() => setIsCreateProjectOpen(false)}
              >
                <motion.section
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  className={styles.createModal}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className={styles.createModalHeader}>
                    <div>
                      <h2 className={styles.createModalTitle}>Create project</h2>
                      <p className={styles.createModalSubtitle}>
                        Add a project name and category, then open the workspace from the card.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.modalCloseButton}
                      onClick={() => setIsCreateProjectOpen(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className={styles.createModalBody}>
                    <div className={styles.createPanelGrid}>
                      <label className={styles.formField}>
                        <span className={styles.modalFieldLabel}>Project name</span>
                        <Input
                          value={newProjectName}
                          onChange={(event) => setNewProjectName(event.target.value)}
                          placeholder="Enter project name"
                          className={styles.modalInput}
                        />
                      </label>

                      <label className={styles.formField}>
                        <span className={styles.modalFieldLabel}>Category name</span>
                        <Input
                          value={newProjectCategory}
                          onChange={(event) => setNewProjectCategory(event.target.value)}
                          placeholder="Enter category name"
                          className={styles.modalInput}
                        />
                      </label>
                    </div>
                  </div>

                  <div className={styles.createModalActions}>
                    <div className={styles.createModalActionsInner}>
                      <Button
                        className={styles.createProjectCta}
                        onClick={handleCreateProject}
                        disabled={!newProjectName.trim() || !newProjectCategory.trim()}
                      >
                        Create project
                      </Button>
                    </div>
                  </div>
                </motion.section>
              </motion.div>
            )}
          </AnimatePresence>

          <section className={styles.projectsGrid}>
            {visibleProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={styles.projectCard}
                onClick={() => handleOpenProject(project.id)}
              >
                <div className={styles.projectCardHeader}>
                  <div>
                    <h3>{project.name}</h3>
                    <p>{project.region}</p>
                  </div>
                  <ChevronRight size={18} className={styles.projectCardArrow} />
                </div>

                <p className={styles.projectDescription}>{project.description}</p>

                <div className={styles.projectBadgeRow}>
                  <span className={styles.projectBadge}>{project.category}</span>
                  <span className={styles.projectBadge}>{project.tier}</span>
                </div>

                <div className={styles.projectMetaRow}>
                  <span>{project.documents} documents</span>
                  <span>{project.lastUpdated}</span>
                </div>
              </button>
            ))}
          </section>

          {visibleProjects.length === 0 && (
            <div className={styles.emptyState}>
              <FolderKanban size={28} />
              <p>No project cards yet. Click New project to create one.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className={styles.workspaceShell}>
      <aside
        className={classNames(styles.workspaceSidebar, {
          [styles.workspaceSidebarExpanded]: isLeftSidebarExpanded,
        })}
        onMouseEnter={() => setIsLeftSidebarExpanded(true)}
        onMouseLeave={() => setIsLeftSidebarExpanded(false)}
      >
        <div className={styles.workspaceSidebarInner}>
          <div className={styles.sidebarScrollable}>
            <div className={styles.sidebarTop}>
              <button
              type="button"
              className={styles.backButton}
              onClick={() => {
                setActiveProjectId(null);
                router.replace(ROUTE_PATHS.HOME);
              }}
              title="Back to projects"
            >
                <ArrowLeft size={18} />
                {isLeftSidebarExpanded && <span>Projects</span>}
              </button>
            </div>

            {!isQueryStage && (
              <>
                <SidebarSection
                  icon={Database}
                  title="Data Extraction"
                  description="Select multiple extractors"
                  expanded={isLeftSidebarExpanded}
                >
                  <MultiSelectChips
                    options={DATA_EXTRACTION_OPTIONS}
                    selectedValues={activeWorkspace.dataExtraction}
                    onToggle={(value) => toggleWorkspaceValue("dataExtraction", value)}
                  />
                </SidebarSection>

                <SidebarSection
                  icon={FileText}
                  title="Text Processing"
                  description="Select one strategy"
                  expanded={isLeftSidebarExpanded}
                >
                  <SingleSelectChips
                    options={TEXT_PROCESSING_OPTIONS}
                    value={activeWorkspace.textProcessing}
                    onChange={(value) =>
                      updateActiveWorkspace((current) => ({
                        ...current,
                        textProcessing: value,
                      }))
                    }
                  />
                </SidebarSection>

                <SidebarSection
                  icon={Blocks}
                  title="Chunk Length"
                  description="Same control pattern as current UI"
                  expanded={isLeftSidebarExpanded}
                >
                  <div className={styles.chunkControl}>
                    <Input
                      type="number"
                      value={activeWorkspace.chunkLength}
                      onChange={(event) =>
                        updateActiveWorkspace((current) => ({
                          ...current,
                          chunkLength: Number(event.target.value || 0),
                        }))
                      }
                    />
                    <Slider
                      value={[activeWorkspace.chunkLength]}
                      onValueChange={([nextValue]) =>
                        updateActiveWorkspace((current) => ({
                          ...current,
                          chunkLength: nextValue,
                        }))
                      }
                      min={100}
                      max={5000}
                      step={100}
                    />
                  </div>
                </SidebarSection>

                <SidebarSection
                  icon={Sparkles}
                  title="Embedding Model"
                  description="Select multiple embedding models"
                  expanded={isLeftSidebarExpanded}
                >
                  <MultiSelectChips
                    options={EMBEDDING_OPTIONS}
                    selectedValues={activeWorkspace.embeddingModels}
                    onToggle={(value) => toggleWorkspaceValue("embeddingModels", value)}
                  />
                </SidebarSection>

                <SidebarSection
                  icon={FolderKanban}
                  title="Vector Store"
                  description="Select multiple vector stores"
                  expanded={isLeftSidebarExpanded}
                >
                  <MultiSelectChips
                    options={VECTOR_STORE_OPTIONS}
                    selectedValues={activeWorkspace.vectorStores}
                    onToggle={(value) => toggleWorkspaceValue("vectorStores", value)}
                  />
                </SidebarSection>
              </>
            )}

            {isQueryStage && (
              <>
                <SidebarSection
                  icon={Database}
                  title="Retrieved Strategy"
                  description="Select multiple retrieval strategies"
                  expanded={isLeftSidebarExpanded}
                >
                  <MultiSelectChips
                    options={RETRIEVAL_STRATEGY_OPTIONS}
                    selectedValues={activeWorkspace.retrievalStrategies}
                    onToggle={(value) => toggleWorkspaceValue("retrievalStrategies", value)}
                  />
                </SidebarSection>

                <SidebarSection
                  icon={Blocks}
                  title="Top-k"
                  description="Maximum value is 5"
                  expanded={isLeftSidebarExpanded}
                >
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={activeWorkspace.topK}
                    onChange={(event) =>
                      updateActiveWorkspace((current) => ({
                        ...current,
                        topK: `${Math.min(5, Math.max(1, Number(event.target.value || 1)))}`,
                      }))
                    }
                  />
                </SidebarSection>

                <SidebarSection
                  icon={FolderKanban}
                  title="Vector DB"
                  description="Only previously selected vector stores"
                  expanded={isLeftSidebarExpanded}
                >
                  <MultiSelectChips
                    options={VECTOR_STORE_OPTIONS.filter((option) =>
                      activeWorkspace.vectorStores.includes(option.value),
                    )}
                    selectedValues={activeWorkspace.vectorStores}
                    onToggle={(value) => toggleWorkspaceValue("vectorStores", value)}
                  />
                </SidebarSection>

                <SidebarSection
                  icon={Sparkles}
                  title="Embedding"
                  description="Only previously selected embeddings"
                  expanded={isLeftSidebarExpanded}
                >
                  <MultiSelectChips
                    options={EMBEDDING_OPTIONS.filter((option) =>
                      activeWorkspace.embeddingModels.includes(option.value),
                    )}
                    selectedValues={activeWorkspace.embeddingModels}
                    onToggle={(value) => toggleWorkspaceValue("embeddingModels", value)}
                  />
                </SidebarSection>

                <SidebarSection
                  icon={MessageSquare}
                  title="LLM Selection"
                  description="Current model"
                  expanded={isLeftSidebarExpanded}
                >
                  <div className={styles.inlineInfoPill}>gpt-4o-mini</div>
                </SidebarSection>
              </>
            )}
          </div>

          {!isQueryStage && (
            <div className={styles.sidebarBottom}>
              <Button
                className={styles.processButton}
                onClick={handleStartIngestion}
                disabled={isPending}
              >
                Process
              </Button>
            </div>
          )}
        </div>
      </aside>

      <main className={styles.workspaceMain}>
        <header className={styles.workspaceHeader}>
          <div className={styles.workspaceHeaderContent}>
            <div className={styles.workspaceBreadcrumb}>Project workspace</div>
            <h1 className={styles.workspaceTitle}>
              {activeProject.name}
              <span className={styles.workspaceCategory}>{activeProject.category}</span>
            </h1>

            <button
              type="button"
              className={classNames(styles.uploadDropzone, styles.headerUploadDropzone)}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={24} />
              <div>
                <p className={styles.uploadTitle}>Upload PDF files</p>
                <p className={styles.uploadSubtitle}>Click to choose PDF documents for this project.</p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              hidden
              onChange={handleFileUpload}
            />

            {activeWorkspace.files.length > 0 && (
              <div className={styles.headerFilesContainer}>
                <div className={styles.headerFilesLabel}>Uploaded files</div>
                <div className={styles.headerFilesList}>
                  {activeWorkspace.files.map((file) => (
                    <div key={file.id} className={styles.headerFileItem}>
                      <div>
                        <p className={styles.fileItemTitle}>{file.name}</p>
                        <p className={styles.fileItemMeta}>
                          {file.category} . {file.size}
                        </p>
                      </div>
                      <span className={styles.fileItemBadge}>Ready</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.workspaceHeaderActions}>
            <button
              type="button"
              className={styles.metricsIconButton}
              onClick={() =>
                router.push(
                  `${ROUTE_PATHS.METRICS}?project=${activeProject.id}&name=${activeProject.name}&category=${activeProject.category}`,
                )
              }
              title="Open metrics"
            >
              <BarChart3 size={18} />
            </button>
          </div>
        </header>

        <section className={styles.workspaceCanvas}>
          <div className={styles.workspaceCenterStage}>
            <p className={styles.workspaceHelperText}>
              please upload the file and select the configurations
            </p>

            {activeWorkspace.visibleLines.length > 0 && (
              <div className={styles.statusList}>
                {activeWorkspace.visibleLines.map((line) => (
                  <TypedLine key={line.id} text={line.text} />
                ))}
              </div>
            )}

            {activeWorkspace.phase === "query-processing" && (
              <div className={styles.generatingState}>
                <div className={styles.loadingDot} />
                <span>Generating answer...</span>
              </div>
            )}

            {activeWorkspace.responseVisible && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.answerCard}
              >
                <div className={styles.answerBadge}>Response</div>
                <p>{activeWorkspace.response}</p>
              </motion.div>
            )}
          </div>

          {isQueryStage && (
            <div className={styles.queryDock}>
              <div className={styles.queryInputShell}>
                <Input
                  value={activeWorkspace.query}
                  onChange={(event) =>
                    updateActiveWorkspace((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleStartQuery();
                    }
                  }}
                  placeholder="ask a query and select the configuration at left side bar"
                  className={styles.queryInput}
                />
                <Button
                  className={styles.querySendButton}
                  onClick={handleStartQuery}
                  title="Send query"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>

      <aside
        className={classNames(styles.workspaceRightSidebar, {
          [styles.workspaceRightSidebarExpanded]: isRightSidebarExpanded,
        })}
        onMouseEnter={() => setIsRightSidebarExpanded(true)}
        onMouseLeave={() => setIsRightSidebarExpanded(false)}
      >
        <div className={styles.workspaceRightInner}>
          <div className={styles.rightSidebarNav}>
            {RIGHT_SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  className={classNames(styles.rightSidebarButton, {
                    [styles.rightSidebarButtonActive]:
                      activeWorkspace.activeRightSection === item.value,
                  })}
                  onClick={() =>
                    updateActiveWorkspace((current) => ({
                      ...current,
                      activeRightSection: item.value,
                    }))
                  }
                >
                  <Icon size={16} />
                  {isRightSidebarExpanded && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>

          {isRightSidebarExpanded && (
            <div className={styles.rightSidebarPanels}>
              {activeWorkspace.activeRightSection === "response" && (
                <div className={styles.insightPanel}>
                  <h3>Response</h3>
                  <p>
                    {activeWorkspace.responseVisible
                      ? activeWorkspace.response
                      : "The answer will appear here after query processing completes."}
                  </p>
                </div>
              )}

              {activeWorkspace.activeRightSection === "chunks" && (
                <div className={styles.insightPanel}>
                  <h3>Retrieved Chunks</h3>
                  <div className={styles.chunkList}>
                    {activeWorkspace.retrievedChunks.map((chunk, index) => (
                      <div key={`${chunk.title}-${index}`} className={styles.chunkItem}>
                        <div className={styles.chunkItemMeta}>
                          <span>{chunk.title}</span>
                          <span>{chunk.score.toFixed(2)}</span>
                        </div>
                        <p>{chunk.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeWorkspace.activeRightSection === "performance" && (
                <div className={styles.insightPanel}>
                  <h3>Execution Performance</h3>
                  <div className={styles.metricGrid}>
                    {DEFAULT_EXECUTION_METRICS.map((metric) => (
                      <div key={metric.label} className={styles.metricCard}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                        <small>{metric.sub}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeWorkspace.activeRightSection === "quality" && (
                <div className={styles.insightPanel}>
                  <h3>Quality Metrics</h3>
                  <div className={styles.qualityList}>
                    {DEFAULT_QUALITY_METRICS.map((metric) => (
                      <div key={metric.label} className={styles.qualityRow}>
                        <div className={styles.qualityHeader}>
                          <span>{metric.label}</span>
                          <strong>{metric.value}%</strong>
                        </div>
                        <div className={styles.qualityTrack}>
                          <div
                            className={styles.qualityBar}
                            style={{ width: `${metric.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default ProjectCanvas;
