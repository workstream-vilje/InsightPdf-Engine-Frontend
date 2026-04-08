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
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import fileApi from "@/networking/apis/file";
import projectApi from "@/networking/apis/project";
import queryApi from "@/networking/apis/query";
import { getExperimentLogs, getExperimentPerformanceById } from "@/lib/api";
import {
  DATA_EXTRACTION_OPTIONS,
  DEFAULT_QUALITY_METRICS,
  EMBEDDING_OPTIONS,
  INITIAL_PROJECTS,
  PROJECT_CATEGORIES,
  RETRIEVAL_STRATEGY_OPTIONS,
  TEXT_PROCESSING_OPTIONS,
  VECTOR_STORE_OPTIONS,
  createWorkspaceState,
} from "@/lib/projects/data";
import { ROUTE_PATHS } from "@/utils/routepaths";
import styles from "./Projects.module.css";

const RIGHT_SIDEBAR_ITEMS = [
  { value: "response", label: "Response", icon: MessageSquare },
  { value: "chunks", label: "Retrieved Chunks", icon: FileText },
  { value: "performance", label: "Execution Performance", icon: Sparkles },
  { value: "quality", label: "Quality Metrics", icon: Database },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const formatMs = (value) => `${(Number(value || 0) / 1000).toFixed(2)}s`;

const formatNumber = (value) => Number(value || 0).toLocaleString();

const formatCost = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? "-");
  return numeric < 0.001 ? numeric.toFixed(4) : numeric.toFixed(3);
};

const formatAccuracy = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return `${Math.round(numeric * 100)}%`;
};

const pruneWorkspaceDataForFiles = (workspace, backendFileIds) => {
  const allowedIds = new Set(Array.from(backendFileIds || []).map((id) => String(id)));
  const fileStillExists =
    workspace?.selectedFileId != null && allowedIds.has(String(workspace.selectedFileId));

  const conversation = (workspace?.conversation || []).filter((entry) => {
    if (entry?.fileId != null) {
      return allowedIds.has(String(entry.fileId));
    }
    return true;
  });

  const responseVariants = fileStillExists
    ? (workspace?.responseVariants || []).filter((variant) => {
        if (variant?.fileId != null) {
          return allowedIds.has(String(variant.fileId));
        }
        return true;
      })
    : [];

  return {
    conversation,
    responseVariants,
    response: fileStillExists ? workspace?.response || "" : "",
    responseVisible: fileStillExists ? workspace?.responseVisible : false,
    retrievedChunks: fileStillExists ? workspace?.retrievedChunks || [] : [],
    usedStrategies: fileStillExists ? workspace?.usedStrategies || [] : [],
    experimentId: fileStillExists ? workspace?.experimentId || null : null,
    submittedQuery: fileStillExists ? workspace?.submittedQuery || "" : "",
    activeRightSection:
      !fileStillExists && workspace?.activeRightSection === "performance"
        ? "response"
        : workspace?.activeRightSection,
  };
};

const mapUploadedFileToWorkspaceFile = (file, category) => ({
  id: String(file?.id ?? `${file?.file_name}-${Date.now()}`),
  name: file?.file_name || "Unknown file",
  size: formatBytes(file?.file_size || 0),
  category: category || "General",
  fileId: file?.id ?? null,
  fileType: file?.file_type || null,
  pages: file?.pages_count ?? null,
  allowedTechniques: file?.allowed_techniques || null,
});

const mapBackendProjectToCanvasProject = (project) => ({
  id: String(project?.id),
  name: project?.project_name || "Untitled Project",
  category: project?.category || "General",
  description: `${project?.category || "General"} workspace for uploads, chunking, embeddings, and query evaluation.`,
  region: project?.project_code || "Backend project",
  tier: "Connected",
  documents: 0,
  lastUpdated: "Synced",
});

const buildSharedPipelineConfig = (workspace) => {
  const normalizedVectorStores = (workspace.vectorStores || []).filter((value) =>
    ["chromadb", "pgvector", "faiss", "pinecone"].includes(value),
  );
  const normalizedTextProcessing = (workspace.textProcessing || []).filter((value) =>
    ["recursive", "semantic", "token", "fixed"].includes(value),
  );
  const embeddingProvider = workspace.embeddingModels.includes("ollama-nomic-embed")
    ? "ollama"
    : "openai";
  const embeddingModel = embeddingProvider === "ollama"
    ? "nomic-embed-text"
    : workspace.embeddingModels.includes("text-embedding-3-large")
    ? "text-embedding-3-large"
    : "text-embedding-3-small";
  const normalizedExtractionMethods = (workspace.dataExtraction || []).filter((value) =>
    ["pymupdf", "unstructured", "pdfplumber"].includes(value),
  );

  const processingConfig = {
    text_processing: {
      chunk_size: Number(workspace.chunkLength) || 1000,
      chunk_overlap: 50,
      splitter:
        normalizedTextProcessing.length > 1
          ? normalizedTextProcessing
          : normalizedTextProcessing[0] || "recursive",
    },
    data_extraction: {
      method:
        normalizedExtractionMethods.length > 1
          ? normalizedExtractionMethods
          : normalizedExtractionMethods[0] || "pymupdf",
    },
    embeddings: {
      provider: embeddingProvider,
      model: embeddingModel,
    },
    vector_store: {
      backends: normalizedVectorStores.length ? normalizedVectorStores : ["faiss"],
      collection_name: "documents",
    },
  };

  const queryConfig = {
    retrieval_strategy: {
      top_k: Math.max(1, Number(workspace.topK) || 3),
      search_type: "similarity",
      vector_db:
        processingConfig.vector_store.backends.length > 1
          ? processingConfig.vector_store.backends
          : processingConfig.vector_store.backends[0],
      collection_name: processingConfig.vector_store.collection_name,
    },
    embedding: {
      provider: processingConfig.embeddings.provider,
      model: processingConfig.embeddings.model,
    },
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.2,
    },
    self_reflection: {
      enabled: true,
      max_retries: 2,
      retrieval_top_k_step: 2,
    },
  };

  return { processingConfig, queryConfig };
};

const buildQueryPayload = ({ projectId, fileId, workspace, query }) => {
  const { queryConfig } = buildSharedPipelineConfig(workspace);

  return {
    project_id: Number(projectId),
    file_id: Number(fileId),
    query: query.trim(),
    config: queryConfig,
  };
};

const buildUsedStrategiesSummary = (workspace) => {
  const { processingConfig, queryConfig } = buildSharedPipelineConfig(workspace);

  const extractionMethod = processingConfig?.data_extraction?.method;
  const vectorDb = queryConfig?.retrieval_strategy?.vector_db;
  const embeddingLabel = queryConfig?.embedding
    ? `${queryConfig.embedding.provider}/${queryConfig.embedding.model}`
    : null;

  return [
    {
      label: "Retrieval",
      value: (workspace?.retrievalStrategies || []).join(", ") || queryConfig?.retrieval_strategy?.search_type,
    },
    {
      label: "Vector DB",
      value: Array.isArray(vectorDb) ? vectorDb.join(", ") : vectorDb,
    },
    {
      label: "Embedding",
      value: embeddingLabel,
    },
    {
      label: "Splitter",
      value: Array.isArray(workspace?.textProcessing)
        ? workspace.textProcessing.join(", ")
        : workspace?.textProcessing,
    },
    {
      label: "Extraction",
      value: Array.isArray(extractionMethod) ? extractionMethod.join(", ") : extractionMethod,
    },
  ].filter((item) => item.value);
};

const buildVariantStrategiesSummary = (workspace, result, allowedTechniques = null) => {
  const persistedStrategies = allowedTechniques
    ? [
        {
          label: "Splitter",
          value: (allowedTechniques?.splitters || []).join(", "),
        },
        {
          label: "Extraction",
          value: (allowedTechniques?.data_extraction_methods || []).join(", "),
        },
        {
          label: "Embedding",
          value: (allowedTechniques?.embeddings || [])
            .map((item) => `${item.provider}/${item.model}`)
            .join(", "),
        },
      ].filter((item) => item.value)
    : buildUsedStrategiesSummary(workspace).filter((item) => item.label !== "Vector DB");

  const vectorDb = result?.db || result?.vector_db || null;
  const retrieval = result?.retrieval || (workspace?.retrievalStrategies || []).join(", ");

  return [
    {
      label: "Vector DB",
      value: vectorDb,
    },
    {
      label: "Retrieval",
      value: retrieval,
    },
    {
      label: "Time",
      value:
        result?.total_time != null
          ? `${(Number(result.total_time || 0) / 1000).toFixed(2)}s`
          : null,
    },
    ...persistedStrategies.filter((item) => item.label !== "Retrieval"),
  ].filter((item) => item.value);
};

const getAllowedVectorStoreOptions = (allowedTechniques) => {
  const allowed = new Set((allowedTechniques?.vector_stores || []).map(String));
  return VECTOR_STORE_OPTIONS.filter((option) => allowed.has(option.value));
};

const getAllowedEmbeddingOptions = (allowedTechniques) => {
  const embeddings = allowedTechniques?.embeddings || [];
  const allowedValues = new Set();

  embeddings.forEach((item) => {
    const provider = String(item?.provider || "").toLowerCase();
    const model = String(item?.model || "").toLowerCase();

    if (provider === "openai") {
      allowedValues.add("openai");
    }
    if (provider === "ollama" || model === "nomic-embed-text") {
      allowedValues.add("ollama-nomic-embed");
    }
    if (model === "text-embedding-3-large") {
      allowedValues.add("text-embedding-3-large");
    }
    if (model === "text-embedding-3-small") {
      allowedValues.add("text-embedding-3-small");
    }
  });

  return EMBEDDING_OPTIONS.filter((option) => allowedValues.has(option.value));
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

const FileSelect = ({ files, selectedFileId, onChange }) => {
  const selectable = (files || []).filter((file) => file?.fileId);
  if (selectable.length === 0) return null;

  const value =
    selectedFileId != null
      ? String(selectedFileId)
      : selectable[0]?.fileId != null
      ? String(selectable[0].fileId)
      : "";

  return (
    <label className={styles.formField}>
      <span className={styles.modalFieldLabel}>Active file</span>
      <select
        suppressHydrationWarning
        className={styles.dropdown}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {selectable.map((file) => (
          <option key={String(file.fileId)} value={String(file.fileId)}>
            {file.name}
          </option>
        ))}
      </select>
    </label>
  );
};

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
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [projectPendingDelete, setProjectPendingDelete] = useState(null);
  const [deleteProjectInput, setDeleteProjectInput] = useState("");
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isLeftSidebarExpanded, setIsLeftSidebarExpanded] = useState(false);
  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(false);
  const [chatPanelOffset, setChatPanelOffset] = useState(420);
  const [chatGreeting, setChatGreeting] = useState("Hello");
  const [techniqueOverlay, setTechniqueOverlay] = useState(null);
  const fileInputRef = useRef(null);
  const queryInputRef = useRef(null);
  const workspaceContentRef = useRef(null);
  const timersRef = useRef([]);
  const hasHydratedRef = useRef(false);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );
  const activeWorkspace = activeProjectId ? projectWorkspaces[activeProjectId] : null;

  // Execution Performance (dynamic from backend by experiment_id)
  const [perf, setPerf] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfError, setPerfError] = useState(null);
  const [experimentRuns, setExperimentRuns] = useState([]);
  const [selectedPerformanceResponseIndex, setSelectedPerformanceResponseIndex] = useState(0);

  const performanceResponseVariants = activeWorkspace?.responseVariants || [];
  const selectedPerformanceVariant =
    performanceResponseVariants[selectedPerformanceResponseIndex] || performanceResponseVariants[0] || null;
  const experimentId =
    selectedPerformanceVariant?.experimentId ||
    activeWorkspace?.experimentId ||
    activeWorkspace?.experiment_id ||
    null;

  useEffect(() => {
    if (selectedPerformanceResponseIndex < performanceResponseVariants.length) return;
    setSelectedPerformanceResponseIndex(0);
  }, [performanceResponseVariants.length, selectedPerformanceResponseIndex]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!experimentId) {
        setPerf(null);
        setExperimentRuns([]);
        setPerfError(null);
        return;
      }
      if (activeWorkspace?.activeRightSection !== "performance") return;
      setPerfLoading(true);
      setPerfError(null);
      try {
        const [performanceResult, logsResult] = await Promise.allSettled([
          getExperimentPerformanceById(experimentId),
          getExperimentLogs(experimentId),
        ]);
        const logsData =
          logsResult.status === "fulfilled" && Array.isArray(logsResult.value)
            ? logsResult.value
            : [];
        const latestLog = logsData[0] || null;
        const performanceData =
          performanceResult.status === "fulfilled"
            ? performanceResult.value
            : latestLog
            ? {
                totalTime: latestLog.totalTime,
                embedTime: latestLog.embedTime,
                retrievalTime: latestLog.retrievalTime,
                llmGenTime: latestLog.llmGenTime,
                totalTokens: latestLog.totalTokens,
                cost: latestLog.cost,
                experimentId: latestLog.experimentId,
                experimentCode: latestLog.experimentCode,
                createdAt: latestLog.createdAt,
              }
            : null;

        if (!cancelled) {
          setPerf(performanceData);
          setExperimentRuns(logsData);
          if (performanceData || logsData.length > 0) {
            setPerfError(null);
          } else {
            const performanceMessage =
              performanceResult.status === "rejected"
                ? performanceResult.reason?.payload?.detail ||
                  performanceResult.reason?.message
                : null;
            const logsMessage =
              logsResult.status === "rejected"
                ? logsResult.reason?.payload?.detail || logsResult.reason?.message
                : null;
            setPerfError(performanceMessage || logsMessage || "No stored rows found for this experiment");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setPerfError(e?.message || "Failed to load performance");
          setPerf(null);
          setExperimentRuns([]);
        }
      } finally {
        if (!cancelled) setPerfLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [experimentId, activeWorkspace?.activeRightSection]);

  const latestPerformanceCards = useMemo(() => {
    if (!perf) return [];

    return [
      { label: "Total Time", value: formatMs(perf?.totalTime), sub: "Response latency" },
      { label: "Embed Time", value: formatMs(perf?.embedTime), sub: "Vector encoding" },
      { label: "Retrieval", value: formatMs(perf?.retrievalTime), sub: "Chunk search" },
      { label: "LLM Gen", value: formatMs(perf?.llmGenTime), sub: "Token generation" },
      { label: "Tokens", value: formatNumber(perf?.totalTokens), sub: "Input + output" },
      { label: "Cost", value: formatCost(perf?.cost), sub: "Per query" },
    ];
  }, [perf]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    setChatGreeting(getGreeting());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleWindowResize = () => {
      if (window.innerWidth <= 1200) {
        setChatPanelOffset(0);
        return;
      }

      setChatPanelOffset((current) => Math.min(540, Math.max(320, current || 420)));
    };

    handleWindowResize();
    window.addEventListener("resize", handleWindowResize);

    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

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
    let isMounted = true;

    const syncProjectsFromBackend = async () => {
      try {
        const response = await projectApi.fetchAllProjects();
        const backendProjects = (response?.data || []).map(mapBackendProjectToCanvasProject);

        if (!isMounted) return;

        setProjects(backendProjects);
        setProjectWorkspaces((current) => {
          const next = {};
          backendProjects.forEach((project) => {
            next[project.id] = current[project.id] || createWorkspaceState();
          });
          return next;
        });
        setActiveProjectId((current) => {
          const requestedProjectId = initialProjectId ? String(initialProjectId) : null;
          const currentProjectId = current ? String(current) : null;
          const availableIds = new Set(backendProjects.map((project) => String(project.id)));

          if (requestedProjectId && availableIds.has(requestedProjectId)) {
            return requestedProjectId;
          }
          if (currentProjectId && availableIds.has(currentProjectId)) {
            return currentProjectId;
          }
          return backendProjects[0]?.id ?? null;
        });
      } catch (error) {
        console.error("Failed to sync projects from backend", error);
      }
    };

    syncProjectsFromBackend();

    return () => {
      isMounted = false;
    };
  }, [initialProjectId]);

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

  // Sync files from backend so DB deletes don't linger in UI
  const syncProjectFilesFromBackend = useCallback(async () => {
    if (!activeProjectId) return;
    try {
      const response = await fileApi.fetchProjectFiles(activeProjectId);
      const backendFiles = response?.data || [];
      const mapped = backendFiles.map((file) =>
        mapUploadedFileToWorkspaceFile(file, activeProject?.category),
      );

      updateActiveWorkspace((current) => {
        const backendIds = new Set(mapped.map((f) => String(f.fileId)));
        const nextSelected =
          current.selectedFileId != null && backendIds.has(String(current.selectedFileId))
            ? current.selectedFileId
            : mapped[0]?.fileId ?? null;
        const prunedData = pruneWorkspaceDataForFiles(
          {
            ...current,
            selectedFileId: nextSelected,
          },
          backendIds,
        );

        return {
          ...current,
          files: mapped,
          selectedFileId: nextSelected,
          ...prunedData,
        };
      });
    } catch (e) {
      // keep existing UI state if fetch fails
    }
  }, [activeProject?.category, activeProjectId, updateActiveWorkspace]);

  useEffect(() => {
    syncProjectFilesFromBackend();
  }, [syncProjectFilesFromBackend]);

  useEffect(() => {
    if (!activeWorkspace?.files) return;

    const selectedFile =
      activeWorkspace.files.find(
        (file) => Number(file?.fileId) === Number(activeWorkspace?.selectedFileId),
      ) || activeWorkspace.files[0];

    updateActiveWorkspace((current) => ({
      ...current,
      allowedTechniques: selectedFile?.allowedTechniques || null,
    }));
  }, [activeWorkspace?.files, activeWorkspace?.selectedFileId, updateActiveWorkspace]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onFocus = () => syncProjectFilesFromBackend();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncProjectFilesFromBackend]);

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

  const allowedVectorStoreOptions = useMemo(() => {
    if (!activeWorkspace?.allowedTechniques) return VECTOR_STORE_OPTIONS;
    const options = getAllowedVectorStoreOptions(activeWorkspace.allowedTechniques);
    return options.length > 0 ? options : VECTOR_STORE_OPTIONS;
  }, [activeWorkspace?.allowedTechniques]);

  const allowedEmbeddingOptions = useMemo(() => {
    if (!activeWorkspace?.allowedTechniques) return EMBEDDING_OPTIONS;
    const options = getAllowedEmbeddingOptions(activeWorkspace.allowedTechniques);
    return options.length > 0 ? options : EMBEDDING_OPTIONS;
  }, [activeWorkspace?.allowedTechniques]);

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

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectCategory.trim()) return;

    setIsCreatingProject(true);

    try {
      const response = await projectApi.createProject({
        project_name: newProjectName.trim(),
        category: newProjectCategory.trim(),
      });
      const createdProject = response?.data;

      if (!createdProject?.id) {
        throw new Error("Project was created but no project id was returned.");
      }

      const projectId = String(createdProject.id);
      const nextProject = {
        id: projectId,
        name: createdProject.project_name || newProjectName.trim(),
        category: createdProject.category || newProjectCategory.trim(),
        description: `${createdProject.category || newProjectCategory.trim()} workspace for uploads, chunking, embeddings, and query evaluation.`,
        region: createdProject.project_code || "Backend project",
        tier: "Connected",
        documents: 0,
        lastUpdated: "Just now",
      };

      startTransition(() => {
        setProjects((current) => {
          const alreadyExists = current.some((project) => project.id === projectId);
          return alreadyExists ? current : [nextProject, ...current];
        });
        setProjectWorkspaces((current) => ({
          ...current,
          [projectId]: current[projectId] || createWorkspaceState(),
        }));
        setActiveProjectId(projectId);
        setIsCreateProjectOpen(false);
        setNewProjectName("");
        setNewProjectCategory("");
      });
    } catch (error) {
      const message =
        error?.payload?.detail ||
        error?.payload?.message ||
        error?.message ||
        "Failed to create project";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleOpenProject = (projectId) => {
    startTransition(() => {
      setActiveProjectId(projectId);
      router.replace(`${ROUTE_PATHS.HOME}?project=${projectId}`);
    });
  };

  const handleChatResizeStart = useCallback(
    (event) => {
      if (typeof window === "undefined" || window.innerWidth <= 1200) return;

      event.preventDefault();
      const pointerStartX = event.clientX;
      const startingOffset = chatPanelOffset;
      const contentBounds = workspaceContentRef.current?.getBoundingClientRect();
      const maxOffset = contentBounds ? Math.min(560, Math.max(360, contentBounds.width - 420)) : 560;

      const handlePointerMove = (moveEvent) => {
        const nextOffset = startingOffset + (moveEvent.clientX - pointerStartX);
        setChatPanelOffset(Math.min(maxOffset, Math.max(300, nextOffset)));
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [chatPanelOffset],
  );

  const handleDeleteProject = async () => {
    const projectId = projectPendingDelete?.id;
    if (!projectId || !projectPendingDelete?.name) return;
    if (deleteProjectInput.trim() !== projectPendingDelete.name) return;

    setDeletingProjectId(projectId);

    try {
      await projectApi.deleteProject(projectId);

      startTransition(() => {
        setProjects((current) => current.filter((project) => project.id !== projectId));
        setProjectWorkspaces((current) => {
          const next = { ...current };
          delete next[projectId];
          return next;
        });
        if (String(activeProjectId) === String(projectId)) {
          setActiveProjectId(null);
          router.replace(ROUTE_PATHS.HOME);
        }
      });
    } catch (error) {
      const message =
        error?.payload?.detail ||
        error?.payload?.message ||
        error?.message ||
        "Failed to delete project";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      setDeletingProjectId(null);
      setProjectPendingDelete(null);
      setDeleteProjectInput("");
    }
  };

  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    if (!activeProject?.id) {
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    setIsUploadingFiles(true);

    updateActiveWorkspace((current) => ({
      ...current,
      phase: "ingestion-setup",
      visibleLines: [],
      response: "",
      responseVisible: false,
      activeRightSection: "response",
    }));

    try {
      const availableProjects = await projectApi.fetchAllProjects();
      const activeProjectExists = (availableProjects?.data || []).some(
        (project) => String(project?.id) === String(activeProject.id),
      );

      if (!activeProjectExists) {
        throw new Error("The selected project no longer exists. Please reselect or recreate it.");
      }

      const response = await fileApi.uploadProjectFiles(activeProject.id, formData);
      const uploadedFiles = (response?.data || []).map((file) =>
        mapUploadedFileToWorkspaceFile(file, activeProject?.category),
      );

      updateActiveWorkspace((current) => ({
        ...current,
        files: [...current.files, ...uploadedFiles],
        selectedFileId:
          current.selectedFileId ??
          uploadedFiles.find((file) => file.fileId)?.fileId ??
          null,
        phase: "ingestion-setup",
        query: "",
        visibleLines: [],
        response: "",
        responseVisible: false,
        activeRightSection: "response",
      }));
      // Ensure UI matches backend (and prunes deleted DB files)
      await syncProjectFilesFromBackend();
    } catch (error) {
      const message =
        error?.payload?.detail ||
        error?.payload?.message ||
        error?.message ||
        "Failed to upload files";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
      updateActiveWorkspace((current) => ({
        ...current,
        visibleLines: [],
      }));
    } finally {
      setIsUploadingFiles(false);
      event.target.value = "";
    }
  };

  const handleStartIngestion = () => {
    if (!activeWorkspace || !activeProjectId) return;

    const filesToProcess = activeWorkspace.files.filter((file) => file.fileId);
    if (!filesToProcess.length) {
      if (typeof window !== "undefined") {
        window.alert("Upload at least one file before processing.");
      }
      return;
    }

    const processFiles = async () => {
      clearTimers();
      setIsProcessingFiles(true);

      updateActiveWorkspace((current) => ({
        ...current,
        phase: "ingestion-processing",
        visibleLines: [],
        response: "",
        responseVisible: false,
        activeRightSection: "response",
      }));

      try {
        const availableProjects = await projectApi.fetchAllProjects();
        const activeProjectExists = (availableProjects?.data || []).some(
          (project) => String(project?.id) === String(activeProjectId),
        );

        if (!activeProjectExists) {
          throw new Error("The selected project no longer exists. Please reselect or recreate it.");
        }

        const { processingConfig } = buildSharedPipelineConfig(activeWorkspace);
        await Promise.all(
          filesToProcess.map((file) =>
            fileApi.processProjectFile(activeProjectId, file.fileId, processingConfig),
          ),
        );

        updateActiveWorkspace((current) => ({
          ...current,
          phase: "query-ready",
          visibleLines: [],
          retrievalStrategies:
            current.retrievalStrategies.length > 0
              ? current.retrievalStrategies
              : ["semantic-similarity"],
        }));
      } catch (error) {
        const message =
          error?.payload?.detail ||
          error?.payload?.message ||
          error?.message ||
          "Failed to process files";
        if (typeof window !== "undefined") {
          window.alert(message);
        }
        updateActiveWorkspace((current) => ({
          ...current,
          phase: "ingestion-setup",
          visibleLines: [],
        }));
      } finally {
        setIsProcessingFiles(false);
      }
    };

    processFiles();
  };

  const handleStartQuery = () => {
    if (!activeWorkspace?.query.trim() || !activeProjectId) return;
    const submittedQuery = activeWorkspace.query.trim();
    const hasConfigurationSelected =
      Array.isArray(activeWorkspace?.retrievalStrategies) &&
      activeWorkspace.retrievalStrategies.length > 0 &&
      Array.isArray(activeWorkspace?.vectorStores) &&
      activeWorkspace.vectorStores.length > 0 &&
      Array.isArray(activeWorkspace?.embeddingModels) &&
      activeWorkspace.embeddingModels.length > 0;

    if (!hasConfigurationSelected) {
      if (typeof window !== "undefined") {
        window.alert("Please select configuration then send the query.");
      }
      return;
    }

    const selectableFiles = (activeWorkspace.files || []).filter((file) => file?.fileId);
    const selectedFileIdRaw =
      activeWorkspace.selectedFileId ?? selectableFiles[0]?.fileId ?? null;
    const selectedFileId = selectedFileIdRaw != null ? Number(selectedFileIdRaw) : null;
    const targetFile =
      selectableFiles.find((file) => Number(file.fileId) === selectedFileId) ??
      selectableFiles[0] ??
      null;

    if (!targetFile?.fileId) {
      if (typeof window !== "undefined") {
        window.alert("Upload and process a file before running a query.");
      }
      return;
    }

    const runQuery = async () => {
      clearTimers();
      updateActiveWorkspace((current) => ({
        ...current,
        phase: "query-processing",
        query: "",
        submittedQuery,
        visibleLines: [],
        response: "",
        responseVisible: false,
        responseVariants: [],
        activeRightSection: "response",
      }));

      try {
        const payload = buildQueryPayload({
          projectId: activeProjectId,
          fileId: selectedFileId ?? targetFile.fileId,
          workspace: activeWorkspace,
          query: submittedQuery,
        });
        let allowedTechniques = null;
        try {
          const fileRecord = await fileApi.getProjectFile(
            activeProjectId,
            selectedFileId ?? targetFile.fileId,
          );
          allowedTechniques = fileRecord?.allowed_techniques || null;
        } catch (fileRecordError) {
          allowedTechniques = null;
        }

        const response = await queryApi.runQuery(payload);
        const results =
          Array.isArray(response?.comparison_results) && response.comparison_results.length > 0
            ? response.comparison_results
            : [response];

        const responseVariants = await Promise.all(
          results.map(async (result) => {
            let savedResponse = null;

            if (result?.experiment_id) {
              try {
                const saved = await queryApi.fetchSavedResponse({
                  projectId: activeProjectId,
                  fileId: selectedFileId ?? targetFile.fileId,
                  experimentId: result.experiment_id,
                });
                savedResponse = saved?.data?.[0] || null;
              } catch (savedResponseError) {
                savedResponse = null;
              }
            }

            return {
              experimentId: result?.experiment_id || null,
              fileId: selectedFileId ?? targetFile.fileId,
              db: result?.db || result?.retrieval || "Default",
              response: savedResponse?.response || result?.answer || "",
              chunks: savedResponse?.chunks || result?.chunks || [],
              usedStrategies: buildVariantStrategiesSummary(
                activeWorkspace,
                result,
                allowedTechniques,
              ),
            };
          }),
        );

        const primaryVariant = responseVariants[0] || null;
        const finalAnswer = primaryVariant?.response || "";
        const finalChunks = primaryVariant?.chunks || [];

        updateActiveWorkspace((current) => ({
          ...current,
          experimentId: primaryVariant?.experimentId || current?.experimentId || null,
          selectedFileId: selectedFileId ?? current?.selectedFileId ?? null,
          phase: "query-complete",
          submittedQuery: "",
          response: finalAnswer,
          responseVisible: true,
          usedStrategies: primaryVariant?.usedStrategies || [],
          responseVariants,
          conversation: [
            ...(current?.conversation || []),
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              fileId: selectedFileId ?? targetFile.fileId,
              query: submittedQuery,
              responseVariants,
            },
          ],
          retrievedChunks: finalChunks.map((chunk, index) => ({
            title: chunk?.source || targetFile.name || `Chunk ${index + 1}`,
            page: chunk?.page || index + 1,
            score: Number(chunk?.relevance_score ?? chunk?.raw_score ?? 0),
            text: chunk?.content || "",
          })),
        }));
      } catch (error) {
        const message =
          error?.payload?.detail ||
          error?.payload?.message ||
          error?.message ||
          "Failed to run query";
        if (typeof window !== "undefined") {
          window.alert(message);
        }
        updateActiveWorkspace((current) => ({
          ...current,
          phase: "query-ready",
          submittedQuery: "",
          response: "",
          responseVisible: false,
        }));
      }
    };

    runQuery();
  };

  const isQueryStage = activeWorkspace
    ? ["query-ready", "query-processing", "query-complete"].includes(activeWorkspace.phase)
    : false;
  const showChatWelcome = !!activeWorkspace;

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
                  suppressHydrationWarning
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
                        disabled={
                          isCreatingProject ||
                          !newProjectName.trim() ||
                          !newProjectCategory.trim()
                        }
                      >
                        {isCreatingProject ? "Creating..." : "Create project"}
                      </Button>
                    </div>
                  </div>
                </motion.section>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {projectPendingDelete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={styles.modalOverlay}
                onClick={() => {
                  if (deletingProjectId) return;
                  setProjectPendingDelete(null);
                  setDeleteProjectInput("");
                }}
              >
                <motion.section
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  className={styles.deleteModal}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className={styles.createModalHeader}>
                    <div>
                      <h2 className={styles.createModalTitle}>Delete project</h2>
                      <p className={styles.createModalSubtitle}>
                        This action permanently deletes the project, its files, and related experiment history.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.modalCloseButton}
                      onClick={() => {
                        if (deletingProjectId) return;
                        setProjectPendingDelete(null);
                        setDeleteProjectInput("");
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className={styles.createModalBody}>
                    <div className={styles.deleteModalContent}>
                      <p className={styles.deleteWarningText}>
                        Type <strong>{projectPendingDelete.name}</strong> to confirm deletion.
                      </p>
                      <label className={styles.formField}>
                        <span className={styles.modalFieldLabel}>Project name confirmation</span>
                        <Input
                          value={deleteProjectInput}
                          onChange={(event) => setDeleteProjectInput(event.target.value)}
                          placeholder={projectPendingDelete.name}
                          className={styles.modalInput}
                        />
                      </label>
                    </div>
                  </div>

                  <div className={styles.createModalActions}>
                    <div className={styles.deleteModalActions}>
                      <Button
                        variant="outline"
                        className={styles.deleteCancelButton}
                        onClick={() => {
                          if (deletingProjectId) return;
                          setProjectPendingDelete(null);
                          setDeleteProjectInput("");
                        }}
                        disabled={Boolean(deletingProjectId)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className={styles.deleteProjectCta}
                        onClick={handleDeleteProject}
                        disabled={
                          deletingProjectId === projectPendingDelete.id ||
                          deleteProjectInput.trim() !== projectPendingDelete.name
                        }
                      >
                        {deletingProjectId === projectPendingDelete.id ? "Deleting..." : "Delete project"}
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
                  <div className={styles.projectCardActions}>
                    <button
                      type="button"
                      className={styles.projectDeleteButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        setProjectPendingDelete(project);
                        setDeleteProjectInput("");
                      }}
                      disabled={deletingProjectId === project.id}
                      title="Delete project"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className={styles.projectCardArrow} />
                  </div>
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
                      max={4000}
                      step={100}
                    />
                  </div>
                </SidebarSection>

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
                  description="Select multiple extractors"
                  expanded={isLeftSidebarExpanded}
                >
                  <MultiSelectChips
                    options={TEXT_PROCESSING_OPTIONS}
                    selectedValues={activeWorkspace.textProcessing}
                    onToggle={(value) => toggleWorkspaceValue("textProcessing", value)}
                  />
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
                  icon={FileText}
                  title="Active file"
                  description="Choose which uploaded file to query"
                  expanded={isLeftSidebarExpanded}
                >
                  <FileSelect
                    files={activeWorkspace.files}
                    selectedFileId={activeWorkspace.selectedFileId}
                    onChange={(nextId) =>
                      updateActiveWorkspace((current) => ({
                        ...current,
                        selectedFileId: nextId ? Number(nextId) : null,
                      }))
                    }
                  />
                </SidebarSection>

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
                  description="Only techniques selected during file processing"
                  expanded={isLeftSidebarExpanded}
                >
                  <MultiSelectChips
                    options={allowedVectorStoreOptions}
                    selectedValues={activeWorkspace.vectorStores}
                    onToggle={(value) => toggleWorkspaceValue("vectorStores", value)}
                  />
                </SidebarSection>

                <SidebarSection
                  icon={Sparkles}
                  title="Embedding"
                  description="Only techniques selected during file processing"
                  expanded={isLeftSidebarExpanded}
                >
                  <MultiSelectChips
                    options={allowedEmbeddingOptions}
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
                disabled={isPending || isProcessingFiles}
              >
                {isProcessingFiles ? "Processing..." : "Process"}
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
          </div>
          <div className={styles.workspaceHeaderActions}>
            <div className={styles.chatWelcomeBadge}>
              <span>Insight Chat</span>
              <span className={styles.chatWelcomeBadgeAccent}>Workspace</span>
            </div>
            <button
              type="button"
              className={styles.chatWelcomeMetricsButton}
              onClick={() =>
                router.push(
                  `${ROUTE_PATHS.METRICS}?project=${activeProject.id}&name=${activeProject.name}&category=${activeProject.category}`,
                )
              }
              title="Open metrics"
            >
              <BarChart3 size={15} />
            </button>
          </div>
        </header>

        <section className={styles.workspaceCanvas}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            hidden
            onChange={handleFileUpload}
          />

          <div
            ref={workspaceContentRef}
            className={styles.workspaceContentLayout}
            style={{
              "--chat-panel-offset":
                chatPanelOffset > 0 ? `${chatPanelOffset}px` : "0px",
            }}
          >
            <section className={styles.workspaceAssetPanel}>
              <div className={styles.workspaceAssetCard}>
                <div className={styles.workspaceAssetHeader}>
                  <p className={styles.workspaceAssetEyebrow}>Workspace assets</p>
                  <h2 className={styles.workspaceAssetTitle}>Upload and manage documents</h2>
                </div>

                <button
                  type="button"
                  className={classNames(styles.uploadDropzone, styles.assetUploadDropzone)}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFiles}
                >
                  <Upload size={24} />
                  <div>
                    <p className={styles.uploadTitle}>
                      {isUploadingFiles ? "Uploading PDF files..." : "Upload PDF files"}
                    </p>
                    <p className={styles.uploadSubtitle}>
                      {isUploadingFiles
                        ? "Please wait while files are sent to the backend."
                        : "Click to choose PDF documents for this project."}
                    </p>
                  </div>
                </button>

                <div className={styles.headerFilesContainer}>
                  <div className={styles.headerFilesLabel}>Uploaded files</div>
                  {activeWorkspace.files.length > 0 ? (
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
                  ) : (
                    <div className={styles.emptyFilesState}>
                      Uploaded documents will appear here after you add PDFs.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <button
              type="button"
              className={styles.chatResizeHandle}
              onPointerDown={handleChatResizeStart}
              aria-label="Resize workspace split"
              title="Drag to resize workspace split"
            >
              <span className={styles.chatResizeGrip} />
            </button>

            <div className={styles.chatPanelShell}>
              {showChatWelcome && (
                <div className={styles.chatWelcomeShell}>
                  <div className={styles.chatWelcomeHeadingBlock}>
                    <h2 className={styles.chatWelcomeTitle}>{chatGreeting}</h2>
                    <p className={styles.chatWelcomeSubtitle}>
                      Ask questions, summarize uploaded files, or explore ideas from your document set.
                    </p>
                  </div>
                </div>
              )}

            <div className={styles.workspaceCenterStage}>
              {activeWorkspace.visibleLines.length > 0 && (
                <div className={styles.statusList}>
                  {activeWorkspace.visibleLines.map((line) => (
                    <TypedLine key={line.id} text={line.text} />
                  ))}
                </div>
              )}

              {(activeWorkspace.conversation || []).map((entry) => (
                <div key={entry.id} className={styles.conversationBlock}>
                  <div className={styles.queryLine}>{entry.query}</div>
                  {(entry.responseVariants || []).map((variant, index) => (
                    <motion.div
                      key={`${entry.id}-${variant.db}-${variant.experimentId || index}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={styles.responseBlock}
                    >
                      <div className={styles.responseTextBlock}>
                        <div className={styles.chatMessageLabel}>
                          Response-{index + 1}
                        </div>
                        <p>{variant.response}</p>
                        {variant.usedStrategies?.length > 0 && (
                          <button
                            type="button"
                            className={styles.techniqueButton}
                            onClick={() =>
                              setTechniqueOverlay({
                                title: `Response-${index + 1}`,
                                strategies: variant.usedStrategies,
                              })
                            }
                          >
                            Techniques used
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))}

              {activeWorkspace.submittedQuery && (
                <div className={styles.queryLine}>{activeWorkspace.submittedQuery}</div>
              )}

              {activeWorkspace.phase === "query-processing" && (
                <div className={styles.answeringState}>answering...</div>
              )}
            </div>

            <div className={styles.queryDock}>
              <div className={classNames(styles.queryInputShell, styles.queryInputShellHero)}>
                <Input
                  ref={queryInputRef}
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
                  placeholder="How can I help you today?"
                  className={classNames(styles.queryInput, styles.queryInputHero)}
                />

                <Button
                  className={classNames(styles.querySendButton, styles.querySendButtonHero)}
                  onClick={handleStartQuery}
                  title="Send query"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>

            </div>
          </div>
        </section>

        {techniqueOverlay && (
          <div
            className={styles.techniqueOverlayBackdrop}
            onClick={() => setTechniqueOverlay(null)}
          >
            <div
              className={styles.techniqueOverlayCard}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.techniqueOverlayHeader}>
                <div className={styles.chatMessageLabel}>{techniqueOverlay.title}</div>
                <button
                  type="button"
                  className={styles.techniqueOverlayClose}
                  onClick={() => setTechniqueOverlay(null)}
                >
                  Close
                </button>
              </div>
              <div className={styles.strategySummary}>
                {techniqueOverlay.strategies.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className={styles.strategyRow}
                  >
                    <span className={styles.strategyLabel}>{item.label}</span>
                    <span className={styles.strategyValue}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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

              {activeWorkspace.activeRightSection === "performance-legacy-disabled" && (
                <div className={styles.insightPanel}>
                  <h3>Execution Performance</h3>
                  {perfLoading && <div>Loading…</div>}
                  {perfError && <div>{perfError}</div>}
                  {!perfLoading && !perfError && (
                    <div className={styles.metricGrid}>
                      {[
                        { label: "Total Time", value: formatMs(perf?.totalTime), sub: "Response latency" },
                        { label: "Embed Time", value: formatMs(perf?.embedTime), sub: "Vector encoding" },
                        { label: "Retrieval", value: formatMs(perf?.retrievalTime), sub: "Chunk search" },
                        { label: "LLM Gen", value: formatMs(perf?.llmGenTime), sub: "Token generation" },
                        { label: "Tokens", value: formatNumber(perf?.totalTokens), sub: "Input + Output" },
                        // Show cost exactly as returned by backend (no rounding/formatting)
                        { label: "Cost", value: perf?.cost, sub: "Per query" },
                      ].map((metric) => (
                        <div key={metric.label} className={styles.metricCard}>
                          <span>{metric.label}</span>
                          <strong>{metric.value}</strong>
                          <small>{metric.sub}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeWorkspace.activeRightSection === "performance" && (
                <div className={styles.insightPanel}>
                  <div className={styles.performanceHeader}>
                    <div>
                      <h3>Execution Performance</h3>
                      <p>Switch between responses to view their stored performance metrics.</p>
                    </div>
                    {performanceResponseVariants.length > 0 && (
                      <div className={styles.performanceSelector}>
                        {performanceResponseVariants.slice(0, 2).map((variant, index) => (
                          <button
                            key={variant?.experimentId || `response-${index}`}
                            type="button"
                            className={`${styles.performanceSelectorButton} ${
                              index === selectedPerformanceResponseIndex
                                ? styles.performanceSelectorButtonActive
                                : ""
                            }`}
                            onClick={() => setSelectedPerformanceResponseIndex(index)}
                          >
                            Res-{index + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {perfLoading && <div>Loading...</div>}
                  {perfError && <div>{perfError}</div>}
                  {!perfLoading && !perfError && !perf && experimentRuns.length === 0 && (
                    <div>No stored rows found for this experiment yet.</div>
                  )}
                  {!perfLoading && !perfError && perf && (
                    <div className={styles.performancePanel}>
                      <div className={styles.metricGrid}>
                        {latestPerformanceCards.map((metric) => (
                          <div key={metric.label} className={styles.metricCard}>
                            <span>{metric.label}</span>
                            <strong>{metric.value}</strong>
                            <small>{metric.sub}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
