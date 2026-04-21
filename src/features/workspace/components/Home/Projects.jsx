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
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Blocks,
  ChevronRight,
  Database,
  FileText,
  FolderKanban,
  Grid2x2,
  House,
  List,
  MessageSquare,
  PanelRight,
  PlayCircle,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
  Maximize2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProjectsPageView from "@/pages/projects_page/ProjectsPageView";
import TopNavbar from "@/components/common/top-navbar/TopNavbar";
import { useToast } from "@/components/toast/ToastProvider";
import { useFileListSkeletonCount } from "@/hooks/useFileListSkeletonCount";
import { dedupeByKey } from "@/lib/collectionUtils";
import { formatWorkspaceApiError } from "@/lib/formatWorkspaceApiError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import fileApi from "@/services/api/networking/apis/file";
import projectApi from "@/services/api/networking/apis/project";
import queryApi from "@/services/api/networking/apis/query";
import {
  clearAuthSession,
  getCurrentUserId,
  getScopedStorageKey,
  getStoredUserProfile,
} from "@/services/auth";
import { getExperimentAgentReportById, getExperimentPerformanceById } from "@/lib/api";
import {
  DATA_EXTRACTION_OPTIONS,
  DEFAULT_QUALITY_METRICS,
  EMBEDDING_OPTIONS,
  INITIAL_PROJECTS,
  LLM_MODEL_OPTIONS,
  QUERY_CONFIGURATION_OPTIONS,
  RETRIEVAL_STRATEGY_OPTIONS,
  TEXT_PROCESSING_OPTIONS,
  VECTOR_STORE_OPTIONS,
  createWorkspaceState,
} from "@/lib/projects/data";
import {
  ROUTE_PATHS,
  workspaceQueryUrl,
  workspaceUploadUrl,
} from "@/utils/routepaths";

// Extracted components
import AppWorkspaceRail from "../AppWorkspaceRail";
import MultiSelectChips from "../MultiSelectChips";
import SidebarSection from "../SidebarSection";
import UploadPipelineOutputCard from "../UploadPipelineOutputCard";
import UploadProjectFilesList from "../UploadProjectFilesList";
import renderMarkdown from "../MarkdownRenderer";
import { UploadPipelineSidebarSkeletonRows, ExecutionPerformanceSkeletonGrid } from "../WorkspaceSkeletons";
import { IngestionReportMetricsDl, IngestionFileDetailsSection } from "../IngestionReportComponents";
import ProjectsListView from "../ProjectsListView";
import UploadSidebar from "../UploadSidebar";
import QuerySidebar from "../QuerySidebar";
import QueryRightSidebar from "../QueryRightSidebar";
import UploadRightSidebar from "../UploadRightSidebar";

// Extracted utilities
import { formatMs, formatNumber, formatCost, getGreeting, formatProjectCode } from "../../utils/workspaceFormatters";
import {
  pruneWorkspaceDataForFiles,
  mapUploadedFileToWorkspaceFile,
  sanitizeWorkspaceQueryState,
  dedupeWorkspaceFilesByFileId,
  mapBackendProjectToCanvasProject,
  resolveProjectDocumentId,
  buildExecutionRuns,
  buildBatchExecutionSummary,
  buildSharedPipelineConfig,
  buildQueryPayload,
  buildRagasQualityMetrics,
  buildVariantStrategiesSummary,
  getAllowedVectorStoreOptions,
  getAllowedEmbeddingOptions,
} from "../../utils/workspaceTransformers";
import {
  createActivityMessage,
  transformProgressMessage,
  buildQueryActivityMessages,
} from "../../utils/progressMessages";
import {
  mergeIngestionFileReports,
  getWorkspaceFileForReport,
  buildIngestionReportCsv,
  mapProcessResultToIngestionReport,
} from "../../utils/ingestionReport";

import styles from "./Projects.module.css";

/** Agent is toggled from the query bar, not the sidebar chips. */
const QUERY_CONFIGURATION_SIDEBAR_OPTIONS = QUERY_CONFIGURATION_OPTIONS.filter(
  (option) => option.value !== "agent",
);

/** Typed in the "delete all files" modal to confirm permanent removal. */
const DELETE_ALL_FILES_CONFIRM_PHRASE = "DELETE ALL";

const RIGHT_SIDEBAR_ITEMS = [
  { value: "response", label: "Response", icon: MessageSquare },
  { value: "chunks", label: "Retrieved Chunks", icon: FileText },
  { value: "performance", label: "Execution Performance", icon: Sparkles },
  { value: "quality", label: "Quality Metrics", icon: Database },
];

const UPLOAD_RIGHT_SIDEBAR_ITEMS = [
  { value: "pipeline", label: "Pipeline", icon: PlayCircle },
  { value: "techniques", label: "Techniques", icon: Sparkles },
  { value: "files", label: "Files", icon: FolderKanban },
];

const ProjectCanvas = ({ initialProjectId = null, workspaceMode: workspaceModeProp = "upload" }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive workspaceMode from the URL so navigating between /upload and /query
  // does NOT remount this component — it just updates the mode reactively.
  const workspaceMode = pathname?.includes("/workspace/query") ? "query" : "upload";

  // Derive initialProjectId from the URL search params so it stays in sync
  // when the URL changes without a remount.
  const urlProjectId = searchParams?.get("project") ?? null;
  const resolvedInitialProjectId = urlProjectId ?? initialProjectId;
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [projectWorkspaces, setProjectWorkspaces] = useState(() =>
    Object.fromEntries(INITIAL_PROJECTS.map((project) => [project.id, createWorkspaceState()])),
  );
  const [activeProjectId, setActiveProjectId] = useState(() =>
    resolvedInitialProjectId != null && resolvedInitialProjectId !== "" ? String(resolvedInitialProjectId) : null,
  );
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const [projectFilter, setProjectFilter] = useState("all");
  const [sortOption, setSortOption] = useState("name-asc");
  const [projectViewMode, setProjectViewMode] = useState("grid");
  const [projectPage, setProjectPage] = useState(1);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCategory, setNewProjectCategory] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [projectPendingDelete, setProjectPendingDelete] = useState(null);
  const [deleteProjectInput, setDeleteProjectInput] = useState("");
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadFilesViewMode, setUploadFilesViewMode] = useState("grid");
  const fileSkeletonCount = useFileListSkeletonCount(uploadFilesViewMode);
  const [projectsListLoading, setProjectsListLoading] = useState(true);
  const [isProjectFilesSyncing, setIsProjectFilesSyncing] = useState(false);
  const [uploadFilesExpandedOpen, setUploadFilesExpandedOpen] = useState(false);
  const [uploadExpandedPanel, setUploadExpandedPanel] = useState("files");
  const [workspaceFilePendingDelete, setWorkspaceFilePendingDelete] = useState(null);
  const [deleteWorkspaceFileNameInput, setDeleteWorkspaceFileNameInput] = useState("");
  const [deletingWorkspaceFileId, setDeletingWorkspaceFileId] = useState(null);
  const [deleteAllFilesModalOpen, setDeleteAllFilesModalOpen] = useState(false);
  const [deleteAllFilesConfirmInput, setDeleteAllFilesConfirmInput] = useState("");
  const [isDeletingAllFiles, setIsDeletingAllFiles] = useState(false);
  const [ingestionReportOpen, setIngestionReportOpen] = useState(false);
  /** `single` = one file from row Report; `logs` = all files on one page (monochrome). */
  const [ingestionReportMode, setIngestionReportMode] = useState("single");
  const [ingestionReportSelectedId, setIngestionReportSelectedId] = useState(null);
  const [ingestionReportViewLoading, setIngestionReportViewLoading] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isQueryRightSidebarExpanded, setIsQueryRightSidebarExpanded] = useState(false);
  const [isQueryRightSidebarPinned, setIsQueryRightSidebarPinned] = useState(false);
  /** Upload workspace right rail: hover (default) | expanded (pinned open) | collapsed (icons only). */
  const [uploadRightSidebarMode, setUploadRightSidebarMode] = useState("hover");
  const [isUploadRightSidebarHovered, setIsUploadRightSidebarHovered] = useState(false);
  const [uploadRightActiveSection, setUploadRightActiveSection] = useState("pipeline");
  const [uploadSidebarControlOpen, setUploadSidebarControlOpen] = useState(false);
  const [hasUnreadPipelineSuccess, setHasUnreadPipelineSuccess] = useState(false);
  const [pipelineSuccessModalOpen, setPipelineSuccessModalOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [ollamaWarningOpen, setOllamaWarningOpen] = useState(false);
  const [ollamaDocsOpen, setOllamaDocsOpen] = useState(false);
  const modelDropdownRef = useRef(null);
  const uploadSidebarControlRef = useRef(null);
  const previousExecutionStatusRef = useRef("idle");
  const [chatPanelOffset, setChatPanelOffset] = useState(420);
  const [chatGreeting, setChatGreeting] = useState("Hello");
  const [userProfile, setUserProfile] = useState({ name: "", email: "" });
  const [techniqueOverlay, setTechniqueOverlay] = useState(null);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [isAgentReportOpen, setIsAgentReportOpen] = useState(false);
  const [agentReportLoading, setAgentReportLoading] = useState(false);
  const [agentReportError, setAgentReportError] = useState("");
  const fileInputRef = useRef(null);
  const queryInputRef = useRef(null);
  const workspaceContentRef = useRef(null);
  const timersRef = useRef([]);
  const hasHydratedRef = useRef(false);
  const activeQueryAbortRef = useRef(null);
  const activeQueryRequestIdRef = useRef(0);
  const projectFilesListSyncPromiseRef = useRef(null);
  const prevActiveProjectIdRef = useRef(null);
  const initialProjectIdRef = useRef(resolvedInitialProjectId);
  const activeProjectIdRef = useRef(activeProjectId);

  useEffect(() => {
    initialProjectIdRef.current = resolvedInitialProjectId;
  }, [resolvedInitialProjectId]);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) {
      setIsProjectFilesSyncing(false);
    }
  }, [activeProjectId]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );
  const activeWorkspace = activeProjectId ? projectWorkspaces[activeProjectId] : null;

  // Execution Performance (dynamic from backend by experiment_id)
  const [perf, setPerf] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfError, setPerfError] = useState(null);
  const [selectedPerformanceResponseIndex, setSelectedPerformanceResponseIndex] = useState(0);

  const performanceResponseVariants = activeWorkspace?.responseVariants || [];
  const selectedPerformanceVariant =
    performanceResponseVariants[selectedPerformanceResponseIndex] || performanceResponseVariants[0] || null;
  const experimentId =
    selectedPerformanceVariant?.experimentId ||
    activeWorkspace?.experimentId ||
    activeWorkspace?.experiment_id ||
    null;
  const agentReportRows = useMemo(() => {
    const report = activeWorkspace?.agentReport || null;
    if (!report) return [];
    return [
      ["Enabled", report.enabled],
      ["Expansion Room", report.expansion_room],
      ["Required Vector DB", report.required_vector_db],
      ["Selected Vector DB", report.selected_vector_db],
      ["Backend Cost", report.backend_cost],
      ["Selected Backend Cost", report.selected_backend_cost],
      ["Original Query", report.original_query],
      ["Query Complexity", report.query_complexity],
      ["Search Type", report.search_type],
      ["Subsequent Decision", report.subsequent_decision],
      ["Retrieved Chunks", report.retrieved_chunks],
      ["Error Message", report.error_message],
      ["Duration (ms)", report.duration_ms],
      ["Backend Decision", report.backend_decision],
      ["Suggested Query", report.suggested_query],
      ["Feedback", report.feedback],
    ];
  }, [activeWorkspace?.agentReport]);

  useEffect(() => {
    if (selectedPerformanceResponseIndex < performanceResponseVariants.length) return;
    setSelectedPerformanceResponseIndex(0);
  }, [performanceResponseVariants.length, selectedPerformanceResponseIndex]);

  useEffect(() => {
    setIsAgentReportOpen(false);
    setAgentReportLoading(false);
    setAgentReportError("");
  }, [activeProjectId, experimentId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!experimentId) {
        setPerf(null);
        setPerfError(null);
        return;
      }
      if (activeWorkspace?.activeRightSection !== "performance") return;
      setPerfLoading(true);
      setPerfError(null);
      try {
        const performanceData = await getExperimentPerformanceById(experimentId);

        if (!cancelled) {
          setPerf(performanceData);
          if (performanceData) {
            setPerfError(null);
          } else {
            setPerfError("No stored rows found for this experiment");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setPerfError(e?.message || "Failed to load performance");
          setPerf(null);
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
    timersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
      window.clearInterval(timerId);
    });
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!uploadSidebarControlOpen) return undefined;
    const onPointerDown = (event) => {
      if (
        uploadSidebarControlRef.current &&
        !uploadSidebarControlRef.current.contains(event.target)
      ) {
        setUploadSidebarControlOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [uploadSidebarControlOpen]);

  /* close model dropdown on outside click */
  useEffect(() => {
    if (!modelDropdownOpen) return undefined;
    const onPointerDown = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [modelDropdownOpen]);

  useEffect(() => {
    setChatGreeting(getGreeting());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!uploadFilesExpandedOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [uploadFilesExpandedOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const profile = getStoredUserProfile();
    setUserProfile({
      name: profile.name,
      email: profile.email,
    });
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
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        hasHydratedRef.current = true;
        return;
      }

      const storedProjects = window.localStorage.getItem(
        getScopedStorageKey("rag-canvas-projects", currentUserId),
      );
      const storedWorkspaces = window.localStorage.getItem(
        getScopedStorageKey("rag-canvas-workspaces", currentUserId),
      );

      if (storedProjects) {
        const parsedProjects = JSON.parse(storedProjects);
        if (Array.isArray(parsedProjects)) {
          setProjects(parsedProjects);
        }
      }

      if (storedWorkspaces) {
        const parsedWorkspaces = JSON.parse(storedWorkspaces);
        if (parsedWorkspaces && typeof parsedWorkspaces === "object") {
          const normalized = Object.fromEntries(
            Object.entries(parsedWorkspaces).map(([key, value]) => [
              String(key),
              sanitizeWorkspaceQueryState(value),
            ]),
          );
          setProjectWorkspaces(normalized);
        }
      }
    } catch (error) {
      console.error("Failed to restore workspace state", error);
    }

    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const syncProjectsFromBackend = async () => {
      setProjectsListLoading(true);
      try {
        const response = await projectApi.fetchAllProjects({ signal: controller.signal });
        if (cancelled) return;
        const raw = (response?.data || []).map(mapBackendProjectToCanvasProject);
        const backendProjects = dedupeByKey(raw, (p) => String(p.id));
        setProjects(backendProjects);
        setProjectWorkspaces((current) => {
          const next = {};
          backendProjects.forEach((project) => {
            next[project.id] = current[project.id] || createWorkspaceState();
          });
          return next;
        });
        setActiveProjectId(() => {
          const requestedProjectId =
            initialProjectIdRef.current != null && initialProjectIdRef.current !== ""
              ? String(initialProjectIdRef.current)
              : null;
          const availableIds = new Set(backendProjects.map((project) => String(project.id)));
          if (requestedProjectId == null) {
            return null;
          }
          return availableIds.has(requestedProjectId) ? requestedProjectId : null;
        });
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error("Failed to sync projects from backend", error);
      } finally {
        if (!cancelled) {
          setProjectsListLoading(false);
        }
      }
    };

    syncProjectsFromBackend();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedRef.current) return;
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;
    window.localStorage.setItem(
      getScopedStorageKey("rag-canvas-projects", currentUserId),
      JSON.stringify(projects),
    );
  }, [projects]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedRef.current) return;
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;
    const sanitizedWorkspaces = Object.fromEntries(
      Object.entries(projectWorkspaces).map(([key, value]) => [
        key,
        sanitizeWorkspaceQueryState(value),
      ]),
    );
    window.localStorage.setItem(
      getScopedStorageKey("rag-canvas-workspaces", currentUserId),
      JSON.stringify(sanitizedWorkspaces),
    );
  }, [projectWorkspaces]);

  useEffect(
    () => () => {
      activeQueryRequestIdRef.current += 1;
      activeQueryAbortRef.current?.abort();
      activeQueryAbortRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (resolvedInitialProjectId == null || resolvedInitialProjectId === "") {
      setActiveProjectId(null);
      return;
    }
    const requested = String(resolvedInitialProjectId);
    const projectExists = projects.some((project) => String(project.id) === requested);
    if (projectExists) {
      setActiveProjectId(requested);
    }
  }, [resolvedInitialProjectId, projects]);

  /** Keep `?project=` in the URL so refresh stays on the same project workspace. */
  useEffect(() => {
    if (typeof window === "undefined" || !activeProjectId) return;
    const desired =
      workspaceMode === "query"
        ? workspaceQueryUrl(activeProjectId)
        : workspaceUploadUrl(activeProjectId);
    const url = new URL(desired, window.location.origin);
    const pathOk = window.location.pathname === url.pathname;
    const currentProject = new URLSearchParams(window.location.search).get("project");
    if (!pathOk || currentProject !== String(activeProjectId)) {
      router.replace(desired);
    }
  }, [activeProjectId, workspaceMode, router]);

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

  /** Collapse pipeline output when switching projects so each workspace opens files-first (unless a run is in progress). */
  useEffect(() => {
    if (!activeProjectId) {
      prevActiveProjectIdRef.current = null;
      return;
    }
    const pid = String(activeProjectId);
    const prev = prevActiveProjectIdRef.current;
    if (prev != null && String(prev) !== pid) {
      setProjectWorkspaces((previous) => {
        const ws = previous[pid];
        if (!ws?.execution || ws.execution.status === "running") return previous;
        return {
          ...previous,
          [pid]: {
            ...ws,
            execution: {
              ...ws.execution,
              visible: false,
            },
          },
        };
      });
    }
    prevActiveProjectIdRef.current = pid;
  }, [activeProjectId]);

  // Sync files from backend so DB deletes don't linger in UI.
  // Coalesce concurrent calls (effects + post-mutation refresh) into one in-flight GET.
  // Updates are keyed by project id so fast project switches cannot write files onto the wrong workspace.
  const syncProjectFilesFromBackend = useCallback(async () => {
    if (!activeProjectId) {
      setIsProjectFilesSyncing(false);
      return undefined;
    }
    if (projectFilesListSyncPromiseRef.current) {
      return projectFilesListSyncPromiseRef.current;
    }
    const projectIdForSync = activeProjectId;
    setIsProjectFilesSyncing(true);
    const run = (async () => {
      try {
        const response = await fileApi.fetchProjectFiles(projectIdForSync);
        if (String(activeProjectIdRef.current) !== String(projectIdForSync)) {
          return;
        }
        const projectCategory =
          projects.find((p) => String(p.id) === String(projectIdForSync))?.category ?? "General";
        const backendFiles = response?.data || [];
        const mapped = dedupeWorkspaceFilesByFileId(
          backendFiles.map((file) => mapUploadedFileToWorkspaceFile(file, projectCategory)),
        );

        setProjectWorkspaces((previous) => {
          if (String(activeProjectIdRef.current) !== String(projectIdForSync)) {
            return previous;
          }
          const current = previous[projectIdForSync] || createWorkspaceState();
          const mergedFiles = mapped.map((mf) => {
            const prev = (current.files || []).find((f) => String(f.fileId) === String(mf.fileId));
            return prev?.ingestionReportSnapshot
              ? { ...mf, ingestionReportSnapshot: prev.ingestionReportSnapshot }
              : mf;
          });
          const backendIds = new Set(mergedFiles.map((f) => String(f.fileId)));
          const nextSelected =
            current.selectedFileId != null && backendIds.has(String(current.selectedFileId))
              ? current.selectedFileId
              : null;
          const prunedData = pruneWorkspaceDataForFiles(
            {
              ...current,
              selectedFileId: nextSelected,
            },
            backendIds,
          );

          return {
            ...previous,
            [projectIdForSync]: {
              ...current,
              files: mergedFiles,
              selectedFileId: nextSelected,
              ...prunedData,
            },
          };
        });
      } catch (e) {
        // keep existing UI state if fetch fails
      } finally {
        if (String(activeProjectIdRef.current) === String(projectIdForSync)) {
          setIsProjectFilesSyncing(false);
        }
        projectFilesListSyncPromiseRef.current = null;
      }
      return undefined;
    })();
    projectFilesListSyncPromiseRef.current = run;
    return run;
  }, [activeProjectId, projects]);

  useEffect(() => {
    if (!activeProjectId) return undefined;
    syncProjectFilesFromBackend();
    return undefined;
  }, [activeProjectId, syncProjectFilesFromBackend]);

  useEffect(() => {
    if (!activeWorkspace?.files?.length) return;

    updateActiveWorkspace((current) => {
      if (!current?.files?.length) return current;
      const resolvedFile =
        current.files.find(
          (file) => Number(file?.fileId) === Number(current.selectedFileId),
        ) || current.files[0];

      const newAllowedTechniques = resolvedFile?.allowedTechniques || null;

      // Reset vectorStores and embeddingModels to only allowed values
      // so the query payload never sends stores that weren't used at ingestion
      let nextVectorStores = current.vectorStores || ["faiss"];
      let nextEmbeddingModels = current.embeddingModels || ["text-embedding-3-large"];

      if (newAllowedTechniques) {
        const allowedStores = (newAllowedTechniques.vector_stores || []).map(String);
        if (allowedStores.length > 0) {
          const filtered = nextVectorStores.filter((v) => allowedStores.includes(v));
          nextVectorStores = filtered.length > 0 ? filtered : [allowedStores[0]];
        }

        const allowedEmbeddings = (newAllowedTechniques.embeddings || []);
        if (allowedEmbeddings.length > 0) {
          const allowedModels = allowedEmbeddings.map((e) => e.model).filter(Boolean);
          const filtered = nextEmbeddingModels.filter((m) => allowedModels.includes(m));
          nextEmbeddingModels = filtered.length > 0 ? filtered : [allowedModels[0]];
        }
      }

      return {
        ...current,
        allowedTechniques: newAllowedTechniques,
        vectorStores: nextVectorStores,
        embeddingModels: nextEmbeddingModels,
      };
    });
  }, [activeWorkspace?.files, activeWorkspace?.selectedFileId, updateActiveWorkspace]);

  // Chat history loading state
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);

  // Load chat history when file is selected in query workspace
  // Guard: only fetch once per project+file pair
  const lastChatHistoryContextRef = useRef({ projectId: null, fileId: null });

  useEffect(() => {
    if (workspaceMode !== "query") return;
    if (!activeProjectId || !activeWorkspace?.selectedFileId) return;

    const fileId = Number(activeWorkspace.selectedFileId);
    const projectId = Number(activeProjectId);
    if (!fileId || !projectId) return;

    // Skip if already loaded for this project+file
    const last = lastChatHistoryContextRef.current;
    if (last.projectId === projectId && last.fileId === fileId) return;
    lastChatHistoryContextRef.current = { projectId, fileId };

    let cancelled = false;
    setChatHistoryLoading(true);

    queryApi.fetchChatHistory({ projectId, fileId })
      .then((history) => {
        if (cancelled) return;
        if (!Array.isArray(history) || history.length === 0) {
          setChatHistoryLoading(false);
          return;
        }

        const entries = history.map((record, index) => ({
          id: `history-${fileId}-${index}-${record.created_at || index}`,
          fileId,
          query: record.query || "",
          submittedAt: record.created_at || null,
          responseVariants: [
            {
              db: record.db || "",
              experimentId: null,
              response: record.response || "",
              agentEnabled: false,
              usedStrategies: [
                ...(record.llm ? [{ label: "LLM", value: record.llm }] : []),
                ...(record.embedding ? [{ label: "Embedding", value: record.embedding }] : []),
                ...(record.db ? [{ label: "Vector DB", value: record.db }] : []),
                ...(record.retrieval ? [{ label: "Retrieval", value: record.retrieval }] : []),
              ],
            },
          ],
          activityMessages: [],
        }));

        updateActiveWorkspace((current) => ({
          ...current,
          ...(String(current.selectedFileId) === String(fileId)
            ? { conversation: entries }
            : {}),
        }));
      })
      .catch(() => {
        // History load failure is non-fatal — leave conversation empty
      })
      .finally(() => {
        if (!cancelled) setChatHistoryLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.selectedFileId, activeProjectId, workspaceMode]);

  // Reset history guard when project changes
  useEffect(() => {
    lastChatHistoryContextRef.current = { projectId: null, fileId: null };
  }, [activeProjectId]);

  const visibleProjects = useMemo(() => {
    const normalizedSearch = deferredSearchValue.trim().toLowerCase();
    const filteredProjects = projects.filter((project) => {
      const projectName = String(project?.name || "");
      const projectCategory = String(project?.category || "");
      const projectDescription = String(project?.description || "");
      const matchesFilter = projectFilter === "all" || projectName === projectFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        projectName.toLowerCase().includes(normalizedSearch) ||
        projectCategory.toLowerCase().includes(normalizedSearch) ||
        projectDescription.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });

    return [...filteredProjects].sort((left, right) => {
      if (sortOption === "created-desc") {
        const leftTime = new Date(left?.createdAt || 0).getTime();
        const rightTime = new Date(right?.createdAt || 0).getTime();
        return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
      }

      return String(left?.name || "").localeCompare(String(right?.name || ""), undefined, {
        sensitivity: "base",
      });
    });
  }, [deferredSearchValue, projectFilter, projects, sortOption]);

  const PROJECTS_PER_PAGE = 5;
  const totalProjectPages = Math.max(1, Math.ceil(visibleProjects.length / PROJECTS_PER_PAGE));

  const paginatedVisibleProjects = useMemo(() => {
    const startIndex = (projectPage - 1) * PROJECTS_PER_PAGE;
    return visibleProjects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);
  }, [projectPage, visibleProjects]);

  useEffect(() => {
    setProjectPage((currentPage) => Math.min(currentPage, totalProjectPages));
  }, [totalProjectPages]);

  useEffect(() => {
    setProjectPage(1);
  }, [searchValue, projectFilter, sortOption, projectViewMode]);

  const availableProjectNames = useMemo(
    () =>
      Array.from(
        new Set(
          projects
            .map((project) => project.name)
            .filter((name) => typeof name === "string" && name.trim().length > 0),
        ),
      ),
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
        [key]: (current[key] || []).includes(value)
          ? (current[key] || []).filter((item) => item !== value)
          : [...(current[key] || []), value],
      }));
    },
    [updateActiveWorkspace],
  );

  const handleProjectHistoryClick = useCallback(async () => {
    if (!activeProject?.id) return;

    setIsQueryRightSidebarExpanded(true);
    updateActiveWorkspace((current) => ({
      ...current,
      activeRightSection: "history",
    }));
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await projectApi.fetchProjectHistory(activeProject.id);
      setHistoryEntries(Array.isArray(response) ? response : []);
    } catch (error) {
      setHistoryEntries([]);
      setHistoryError(
        error?.message ||
        error?.payload?.message ||
        error?.payload?.detail ||
        "Failed to load experiment history",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [activeProject?.id, updateActiveWorkspace]);

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
        projectCode: formatProjectCode(createdProject),
        name: createdProject.project_name || newProjectName.trim(),
        category: createdProject.category || newProjectCategory.trim(),
        description: `${createdProject.category || newProjectCategory.trim()} workspace for uploads, chunking, embeddings, and query evaluation.`,
        region: formatProjectCode(createdProject),
        tier: "Connected",
        documents: 0,
        documentId: resolveProjectDocumentId(createdProject),
        lastUpdated: "Just now",
        createdAt: createdProject.created_at || null,
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
        router.replace(workspaceUploadUrl(projectId));
        setIsCreateProjectOpen(false);
        setNewProjectName("");
        setNewProjectCategory("");
      });
    } catch (error) {
      showToast({
        title: "Project",
        variant: "error",
        message: formatWorkspaceApiError(error, "Failed to create project"),
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleOpenProject = (projectId) => {
    const pid = String(projectId);
    startTransition(() => {
      setProjectWorkspaces((current) => {
        const ws = current[pid];
        if (!ws?.execution || ws.execution.status === "running") return current;
        return {
          ...current,
          [pid]: {
            ...ws,
            execution: {
              ...ws.execution,
              visible: false,
            },
          },
        };
      });
      setActiveProjectId(pid);
      router.replace(workspaceUploadUrl(pid));
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
      showToast({
        title: "Project",
        variant: "error",
        message: formatWorkspaceApiError(error, "Failed to delete project"),
      });
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
      queryActivity: {
        visible: false,
        status: "idle",
        messages: [],
      },
    }));

    try {
      const projectKnownLocally = projects.some(
        (project) => String(project?.id) === String(activeProject.id),
      );
      if (!projectKnownLocally) {
        const availableProjects = await projectApi.fetchAllProjects();
        const activeProjectExists = (availableProjects?.data || []).some(
          (project) => String(project?.id) === String(activeProject.id),
        );
        if (!activeProjectExists) {
          throw new Error("The selected project no longer exists. Please reselect or recreate it.");
        }
      }

      const response = await fileApi.uploadProjectFiles(activeProject.id, formData);
      const uploadedFiles = dedupeWorkspaceFilesByFileId(
        (response?.data || []).map((file) =>
          mapUploadedFileToWorkspaceFile(file, activeProject?.category),
        ),
      );

      updateActiveWorkspace((current) => ({
        ...current,
        files: dedupeWorkspaceFilesByFileId([...(current.files || []), ...uploadedFiles]),
        selectedFileId: current.selectedFileId != null ? current.selectedFileId : null,
        phase: "ingestion-setup",
        query: "",
        visibleLines: [],
        response: "",
        responseVisible: false,
        activeRightSection: "response",
        execution: {
          ...current.execution,
          visible: false,
          status: "idle",
          stage: "idle",
          message: "",
          chunkCount: null,
          previewCount: null,
          embedding: null,
          vectorBackends: [],
          vectorsStored: null,
          processingTime: null,
          comparisonCount: 0,
          detailsOpen: false,
          details: null,
          runs: [],
        },
      }));
      // Ensure UI matches backend (and prunes deleted DB files). Do not reuse an older in-flight GET
      // from focus/effects — that can return stale rows and interact badly with the merge above.
      projectFilesListSyncPromiseRef.current = null;
      await syncProjectFilesFromBackend();
    } catch (error) {
      showToast({
        title: "Files",
        variant: "error",
        message: formatWorkspaceApiError(error, "Failed to upload files"),
      });
      updateActiveWorkspace((current) => ({
        ...current,
        visibleLines: [],
      }));
    } finally {
      setIsUploadingFiles(false);
      event.target.value = "";
    }
  };

  const handleDeleteWorkspaceFile = async () => {
    if (!activeProject?.id || !workspaceFilePendingDelete?.fileId) return;
    const expectedName = String(workspaceFilePendingDelete.name || "").trim();
    if (deleteWorkspaceFileNameInput.trim() !== expectedName) return;

    setDeletingWorkspaceFileId(workspaceFilePendingDelete.fileId);
    try {
      await fileApi.deleteProjectFile(activeProject.id, workspaceFilePendingDelete.fileId);
      const removedId = workspaceFilePendingDelete.fileId;
      updateActiveWorkspace((current) => ({
        ...current,
        files: (current.files || []).filter((f) => String(f.fileId) !== String(removedId)),
        selectedFileId:
          String(current.selectedFileId) === String(removedId) ? null : current.selectedFileId,
      }));
      setWorkspaceFilePendingDelete(null);
      setDeleteWorkspaceFileNameInput("");
      await syncProjectFilesFromBackend();
    } catch (error) {
      showToast({
        title: "Files",
        variant: "error",
        message: formatWorkspaceApiError(error, "Failed to delete file"),
      });
    } finally {
      setDeletingWorkspaceFileId(null);
    }
  };

  const handleDeleteAllWorkspaceFiles = async () => {
    if (!activeProject?.id || !activeWorkspace) return;
    if (deleteAllFilesConfirmInput.trim() !== DELETE_ALL_FILES_CONFIRM_PHRASE) return;

    const filesWithIds = (activeWorkspace.files || []).filter((f) => f?.fileId != null);
    if (filesWithIds.length === 0) {
      setDeleteAllFilesModalOpen(false);
      setDeleteAllFilesConfirmInput("");
      return;
    }

    setIsDeletingAllFiles(true);
    try {
      for (const file of filesWithIds) {
        await fileApi.deleteProjectFile(activeProject.id, file.fileId);
      }
      updateActiveWorkspace((current) => ({
        ...current,
        files: [],
        selectedFileId: null,
        phase: "ingestion-setup",
        execution: {
          visible: false,
          status: "idle",
          stage: "idle",
          message: "",
          fileId: null,
          fileCode: null,
          fileName: "",
          chunkCount: null,
          previewCount: null,
          embedding: null,
          vectorBackends: [],
          vectorsStored: null,
          processingTime: null,
          comparisonCount: 0,
          detailsOpen: false,
          details: null,
          runs: [],
        },
      }));
      setDeleteAllFilesModalOpen(false);
      setDeleteAllFilesConfirmInput("");
      setUploadFilesExpandedOpen(false);
      await syncProjectFilesFromBackend();
    } catch (error) {
      showToast({
        title: "Files",
        variant: "error",
        message: formatWorkspaceApiError(error, "Failed to delete one or more files"),
      });
      await syncProjectFilesFromBackend();
    } finally {
      setIsDeletingAllFiles(false);
    }
  };

  const handleStartIngestion = () => {
    if (!activeWorkspace || !activeProjectId) return;

    const selectableFiles = activeWorkspace.files.filter((file) => file.fileId);
    const executionTargetFile =
      selectableFiles.find(
        (file) => Number(file.fileId) === Number(activeWorkspace.selectedFileId),
      ) || null;
    if (!selectableFiles.length) {
      showToast({
        title: "Pipeline",
        variant: "warning",
        message: "Upload at least one file before processing.",
      });
      return;
    }
    if (!executionTargetFile?.fileId) {
      showToast({
        title: "Pipeline",
        variant: "warning",
        message: "Select one uploaded file before processing.",
      });
      return;
    }
    if (executionTargetFile.processed || executionTargetFile.allowedTechniques) {
      showToast({
        title: "Pipeline",
        variant: "warning",
        message: "The selected file is already processed.",
      });
      return;
    }
    const filesToProcess = [executionTargetFile];

    const processFiles = async () => {
      clearTimers();
      setIsProcessingFiles(true);
      let currentStage = "chunking";

      updateActiveWorkspace((current) => ({
        ...current,
        phase: "ingestion-processing",
        visibleLines: [],
        response: "",
        responseVisible: false,
        activeRightSection: "response",
        queryActivity: {
          visible: false,
          status: "idle",
          messages: [],
        },
        execution: {
          visible: true,
          status: "running",
          stage: "processing",
          message: `Processing ${executionTargetFile?.name || "document"}...`,
          fileId:
            filesToProcess.length === 1 && executionTargetFile?.fileId != null
              ? Number(executionTargetFile.fileId)
              : null,
          fileCode:
            filesToProcess.length === 1
              ? executionTargetFile?.fileCode || null
              : `${filesToProcess.length} FILES`,
          fileName:
            executionTargetFile?.name || "",
          chunkCount: null,
          previewCount: null,
          embedding: null,
          vectorBackends: [],
          vectorsStored: null,
          processingTime: null,
          comparisonCount: 0,
          detailsOpen: false,
          details: null,
          runs: buildExecutionRuns({
            workspace: current,
            targetFile: executionTargetFile,
            activeStage: currentStage,
          }),
        },
      }));

      try {
        const processResponses = [];
        const projectKnownLocally = projects.some(
          (project) => String(project?.id) === String(activeProjectId),
        );
        if (!projectKnownLocally) {
          const availableProjects = await projectApi.fetchAllProjects();
          const activeProjectExists = (availableProjects?.data || []).some(
            (project) => String(project?.id) === String(activeProjectId),
          );
          if (!activeProjectExists) {
            throw new Error("The selected project no longer exists. Please reselect or recreate it.");
          }
        }

        const { processingConfig } = buildSharedPipelineConfig(activeWorkspace);
        const queueStageUpdate = (stage, delay) => {
          const timeoutId = window.setTimeout(() => {
            currentStage = stage;
            updateActiveWorkspace((current) => ({
              ...current,
              execution: {
                ...current.execution,
                stage,
                runs: buildExecutionRuns({
                  workspace: current,
                  targetFile: executionTargetFile,
                  activeStage: stage,
                }),
              },
            }));
          }, delay);
          timersRef.current.push(timeoutId);
        };

        queueStageUpdate("embedding", 1200);
        queueStageUpdate("vector-store", 2600);

        for (const file of filesToProcess) {
          const processResponse = await fileApi.processProjectFile(
            activeProjectId,
            file.fileId,
            processingConfig,
          );
          if (processResponse?.data?.resumed) {
            showToast({
              title: "Pipeline",
              variant: "info",
              message: `Processing resumed for ${file.name || "the selected file"}.`,
            });
          }
          processResponses.push(processResponse);
        }

        const resultSummary = buildBatchExecutionSummary({
          responses: processResponses,
          files: filesToProcess,
          workspace: activeWorkspace,
        });

        const detailFiles = resultSummary.details?.files || [];

        updateActiveWorkspace((current) => ({
          ...current,
          files: (current.files || []).map((file) => {
            const detailIdx = detailFiles.findIndex(
              (e) => e != null && String(e.fileId) === String(file?.fileId),
            );
            if (detailIdx < 0) {
              return file;
            }
            const snapshot = mapProcessResultToIngestionReport(detailFiles[detailIdx], detailIdx);
            return {
              ...file,
              processed: true,
              allowedTechniques: processingConfig,
              ingestionReportSnapshot: snapshot,
            };
          }),
          phase: "query-ready",
          visibleLines: [],
          retrievalStrategies:
            current.retrievalStrategies.length > 0
              ? current.retrievalStrategies
              : ["semantic-similarity"],
          execution: resultSummary,
        }));
      } catch (error) {
        const message = formatWorkspaceApiError(error, "Failed to process files");
        showToast({
          title: "Pipeline",
          variant: "error",
          message,
        });
        updateActiveWorkspace((current) => ({
          ...current,
          phase: "ingestion-setup",
          visibleLines: [],
          execution: {
            visible: true,
            status: "error",
            stage: "failed",
            message,
            fileId:
              filesToProcess.length === 1 && executionTargetFile?.fileId != null
                ? Number(executionTargetFile.fileId)
                : null,
            fileCode:
              filesToProcess.length === 1
                ? executionTargetFile?.fileCode || null
                : `${filesToProcess.length} FILES`,
            fileName:
              filesToProcess.length > 1
                ? `${filesToProcess.length} files selected`
                : executionTargetFile?.name || "",
            chunkCount: null,
            previewCount: null,
            embedding: null,
            vectorBackends: [],
            vectorsStored: null,
            processingTime: null,
            comparisonCount: 0,
            detailsOpen: false,
            details: null,
            runs: buildExecutionRuns({
              workspace: activeWorkspace,
              targetFile: executionTargetFile,
              activeStage: currentStage,
              failed: true,
            }),
          },
        }));
      } finally {
        clearTimers();
        setIsProcessingFiles(false);
      }
    };

    processFiles();
  };

  const handleStartQuery = () => {
    if (!activeWorkspace?.query.trim() || !activeProjectId) return;
    const submittedQuery = activeWorkspace.query.trim();

    // Guard: file must be processed before querying
    if (!hasSelectedProcessedFile) {
      showToast({
        title: "Query",
        variant: "warning",
        message: "Process the selected file first before asking a question.",
      });
      return;
    }
    const agentModeOn = (activeWorkspace?.queryConfigurations || []).includes("agent");
    const hasRetrievalSelection =
      Array.isArray(activeWorkspace?.retrievalStrategies) &&
      activeWorkspace.retrievalStrategies.length > 0;
    const hasConfigurationSelected =
      (agentModeOn || hasRetrievalSelection) &&
      Array.isArray(activeWorkspace?.vectorStores) &&
      activeWorkspace.vectorStores.length > 0 &&
      Array.isArray(activeWorkspace?.embeddingModels) &&
      activeWorkspace.embeddingModels.length > 0;

    if (!hasConfigurationSelected) {
      showToast({
        title: "Query",
        variant: "warning",
        message: "Please select configuration then send the query.",
      });
      return;
    }

    const selectableFiles = (activeWorkspace.files || []).filter((file) => file?.fileId);
    const selectedFileIdRaw = activeWorkspace.selectedFileId ?? null;
    const selectedFileId = selectedFileIdRaw != null ? Number(selectedFileIdRaw) : null;
    const targetFile =
      selectableFiles.find((file) => Number(file.fileId) === selectedFileId) ?? null;

    if (!targetFile?.fileId) {
      showToast({
        title: "Query",
        variant: "warning",
        message: "Select one uploaded file before running a query.",
      });
      return;
    }
    if (!targetFile.processed && !targetFile.allowedTechniques) {
      showToast({
        title: "Query",
        variant: "warning",
        message: "Process the selected file before asking a query.",
      });
      return;
    }

    const runQuery = async () => {
      activeQueryRequestIdRef.current += 1;
      const requestId = activeQueryRequestIdRef.current;
      activeQueryAbortRef.current?.abort();
      const controller = new AbortController();
      activeQueryAbortRef.current = controller;

      clearTimers();
      updateActiveWorkspace((current) => ({
        ...current,
        phase: "query-processing",
        query: "",
        submittedQuery,
        visibleLines: [],
        activeRightSection: "response",
        queryActivity: {
          visible: false,
          status: "running",
          messages: [],
        },
      }));

      try {
        const payload = buildQueryPayload({
          projectId: activeProjectId,
          fileId: targetFile.fileId,
          fileName: targetFile.name,
          workspace: activeWorkspace,
          query: submittedQuery,
        });
        let allowedTechniques = null;
        try {
          const fileRecord = await fileApi.getProjectFile(
            activeProjectId,
            targetFile.fileId,
          );
          allowedTechniques = fileRecord?.allowed_techniques || null;
        } catch (fileRecordError) {
          allowedTechniques = null;
        }

        let progressSeq = 0;
        const response = await queryApi.runQuery(payload, {
          signal: controller.signal,
          onProgress: ({ id, message }) => {
            if (requestId !== activeQueryRequestIdRef.current) return;
            progressSeq += 1;
            const transformed = transformProgressMessage(String(message || ""));
            if (!transformed) return; // suppress technical noise
            updateActiveWorkspace((current) => {
              if (current.phase !== "query-processing") return current;
              return {
                ...current,
                queryActivity: {
                  visible: true,
                  status: "running",
                  // Always a single-item array — replace, never append
                  messages: [createActivityMessage(`step-${progressSeq}`, transformed.label, transformed.tone)],
                },
              };
            });
          },
        });
        if (requestId !== activeQueryRequestIdRef.current) return;
        const results =
          Array.isArray(response?.comparison_results) && response.comparison_results.length > 0
            ? response.comparison_results
            : [response];

        const responseVariants = results.map((result) => {
          return {
            experimentId: result?.experiment_id || null,
            fileId: targetFile.fileId,
            db: result?.db || result?.retrieval || "Default",
            agentEnabled: Boolean(result?.agent?.enabled),
            response: result?.answer || result?.response || "",
            chunks: result?.chunks || [],
            qualityMetrics: buildRagasQualityMetrics(result),
            usedStrategies: buildVariantStrategiesSummary(
              activeWorkspace,
              result,
              allowedTechniques,
            ),
          };
        });

        const primaryVariant = responseVariants[0] || null;
        const finalAnswer = primaryVariant?.response || "";
        const finalChunks = primaryVariant?.chunks || [];
        const activityMessages = buildQueryActivityMessages({
          response,
          targetFile,
        });

        clearTimers();
        if (requestId !== activeQueryRequestIdRef.current) return;

        updateActiveWorkspace((current) => ({
          ...current,
          experimentId: primaryVariant?.experimentId || current?.experimentId || null,
          agentReport: null,
          phase: "query-complete",
          submittedQuery: "",
          response: finalAnswer,
          responseVisible: true,
          usedStrategies: primaryVariant?.usedStrategies || [],
          responseVariants,
          qualityMetrics:
            primaryVariant?.qualityMetrics || current?.qualityMetrics || DEFAULT_QUALITY_METRICS,
          queryActivity: {
            visible: true,
            status: "success",
            messages: activityMessages,
          },
          conversation: [
            ...(current?.conversation || []),
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              fileId: targetFile.fileId,
              query: submittedQuery,
              responseVariants,
              activityMessages,
            },
          ],
          retrievedChunks: finalChunks.map((chunk, index) => ({
            title: chunk?.source || targetFile.name || `Chunk ${index + 1}`,
            page: chunk?.page || index + 1,
            score: Number(chunk?.relevance_score ?? chunk?.raw_score ?? 0),
            text: chunk?.content || "",
          })),
        }));
        // Auto-expand the right sidebar so results are immediately visible
        setIsQueryRightSidebarExpanded(true);
      } catch (error) {
        clearTimers();
        if (requestId !== activeQueryRequestIdRef.current) return;
        if (error?.name === "AbortError") {
          updateActiveWorkspace((current) => ({
            ...current,
            phase: "query-ready",
            submittedQuery: "",
            queryActivity: {
              visible: true,
              status: "error",
              messages: [
                createActivityMessage(
                  "query-cancelled",
                  "Query request was interrupted.",
                  "warning",
                ),
              ],
            },
          }));
          return;
        }
        const message = formatWorkspaceApiError(error, "Failed to run query");

        // Detect Ollama connection error
        const isOllamaError =
          String(error?.message || "").toLowerCase().includes("ollama") ||
          String(error?.message || "").toLowerCase().includes("localhost:11434") ||
          String(error?.message || "").toLowerCase().includes("could not reach llm") ||
          String(error?.payload?.detail || "").toLowerCase().includes("ollama") ||
          String(error?.payload?.detail || "").toLowerCase().includes("localhost:11434");

        if (isOllamaError) {
          updateActiveWorkspace((current) => ({
            ...current,
            phase: "query-ready",
            submittedQuery: "",
            queryActivity: {
              visible: true,
              status: "error",
              messages: [
                createActivityMessage(
                  "ollama-error",
                  "Ollama is not running. Install or start Ollama to use Llama 3.2 locally.",
                  "error",
                ),
              ],
              ollamaError: true,
            },
          }));
          showToast({
            title: "Ollama",
            variant: "error",
            message: "Ollama is not running. Install or start Ollama to use Llama 3.2.",
          });
          return;
        }

        showToast({
          title: "Query",
          variant: "error",
          message,
        });
        updateActiveWorkspace((current) => ({
          ...current,
          phase: "query-ready",
          submittedQuery: "",
          queryActivity: {
            visible: true,
            status: "error",
            messages: [createActivityMessage("query-error", message, "error")],
          },
        }));
      } finally {
        if (requestId === activeQueryRequestIdRef.current) {
          activeQueryAbortRef.current = null;
        }
      }
    };

    runQuery();
  };

  const isQueryStage = activeWorkspace
    ? ["query-ready", "query-processing", "query-complete"].includes(activeWorkspace.phase)
    : false;
  const showChatWelcome = !!activeWorkspace;
  const activeWorkspaceFileId =
    activeWorkspace?.selectedFileId != null ? String(activeWorkspace.selectedFileId) : null;
  const selectedWorkspaceFile = useMemo(
    () =>
      activeWorkspaceFileId
        ? activeWorkspace?.files?.find((file) => String(file?.fileId) === activeWorkspaceFileId) ||
        null
        : null,
    [activeWorkspace?.files, activeWorkspaceFileId],
  );
  const hasSelectedFile = Boolean(
    activeWorkspaceFileId &&
    activeWorkspace?.files?.some((file) => String(file?.fileId) === activeWorkspaceFileId),
  );
  const hasUploadedFiles = Boolean(
    activeWorkspace?.files?.some((file) => file?.fileId != null),
  );
  const hasSelectedProcessedFile = Boolean(
    selectedWorkspaceFile?.processed || selectedWorkspaceFile?.allowedTechniques,
  );
  const queryAgentModeEnabled = Boolean(
    (activeWorkspace?.queryConfigurations || []).includes("agent"),
  );
  const executionState = activeWorkspace?.execution || {};
  const executionStatusLabel =
    executionState.status === "running"
      ? "Running"
      : executionState.status === "error"
        ? "Failed"
        : executionState.status === "success"
          ? "Completed"
          : "Idle";
  const ingestionFileReports = useMemo(
    () => mergeIngestionFileReports(executionState.details, activeWorkspace?.files),
    [executionState.details, activeWorkspace?.files],
  );

  const ingestionReportTableRows = useMemo(() => {
    if (!ingestionFileReports.length) return [];
    if (ingestionReportMode === "logs") return ingestionFileReports;
    const sid = ingestionReportSelectedId ?? String(ingestionFileReports[0]?.id ?? "");
    const one = ingestionFileReports.find((r) => String(r.id) === String(sid));
    return one ? [one] : [ingestionFileReports[0]];
  }, [ingestionFileReports, ingestionReportMode, ingestionReportSelectedId]);

  useEffect(() => {
    if (!ingestionReportOpen) {
      setIngestionReportViewLoading(false);
      return;
    }
    if (ingestionReportMode !== "logs") {
      setIngestionReportViewLoading(false);
      return;
    }
    setIngestionReportViewLoading(true);
    const t = window.setTimeout(() => setIngestionReportViewLoading(false), 300);
    return () => window.clearTimeout(t);
  }, [ingestionReportOpen, ingestionReportMode, ingestionReportSelectedId]);

  const handleExportIngestionReportCsv = useCallback(() => {
    if (!ingestionReportTableRows.length) return;
    const csv = buildIngestionReportCsv(ingestionReportTableRows, activeWorkspace?.files);
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ingestion-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [ingestionReportTableRows, activeWorkspace?.files]);

  const openIngestionReportForFile = useCallback((fileReport) => {
    if (!fileReport) return;
    setIngestionReportMode("single");
    setIngestionReportSelectedId(String(fileReport.id));
    setIngestionReportOpen(true);
  }, []);

  const openIngestionReportLogsPage = useCallback(() => {
    setIngestionReportMode("logs");
    setIngestionReportSelectedId(null);
    setIngestionReportOpen(true);
  }, []);

  const executionSummaryItems = [
    {
      label: "Runs",
      value:
        executionState.comparisonCount != null && Number(executionState.comparisonCount) > 1
          ? formatNumber(executionState.comparisonCount)
          : null,
    },
    {
      label: "Chunks",
      value:
        executionState.chunkCount != null && executionState.chunkCount > 0
          ? formatNumber(executionState.chunkCount)
          : null,
    },
    {
      label: "Embedding",
      value: executionState.embedding,
    },
    {
      label: "Vector store",
      value:
        executionState.vectorBackends?.length > 0
          ? executionState.vectorBackends.join(", ")
          : null,
    },
    {
      label: "Vectors",
      value:
        executionState.vectorsStored != null && Number(executionState.vectorsStored) > 0
          ? formatNumber(executionState.vectorsStored)
          : null,
    },
    {
      label: "Time",
      value:
        executionState.processingTime != null && Number(executionState.processingTime) > 0
          ? `${Number(executionState.processingTime).toFixed(2)}s`
          : null,
    },
  ].filter((item) => item.value);
  const uploadSidebarTechniquesConfig = useMemo(() => {
    if (!activeWorkspace) return null;
    return buildSharedPipelineConfig(activeWorkspace).processingConfig;
  }, [activeWorkspace]);
  const queryRightSidebarWide = isQueryRightSidebarPinned || isQueryRightSidebarExpanded;
  const uploadRightSidebarWide =
    uploadRightSidebarMode === "expanded" ||
    (uploadRightSidebarMode === "hover" && isUploadRightSidebarHovered);
  const hasUploadPipelineOutput =
    executionState.status !== "idle" ||
    Boolean((executionState.runs || []).length) ||
    Boolean(executionState.message);
  const queryActivityState = activeWorkspace?.queryActivity || {
    visible: false,
    status: "idle",
    messages: [],
  };
  const isQueryInFlight = activeWorkspace?.phase === "query-processing";
  const isChatInputDisabled =
    !hasSelectedFile || !hasSelectedProcessedFile || isQueryInFlight;

  useEffect(() => {
    const prevStatus = previousExecutionStatusRef.current;
    const nextStatus = executionState.status || "idle";
    if (prevStatus !== "success" && nextStatus === "success") {
      setHasUnreadPipelineSuccess(true);
    }
    previousExecutionStatusRef.current = nextStatus;
  }, [executionState.status]);

  const handleRailProjects = useCallback(() => {
    if (isCreateProjectOpen) {
      setIsCreateProjectOpen(false);
      return;
    }
    setActiveProjectId(null);
    router.replace(ROUTE_PATHS.WORKSPACE_UPLOAD);
  }, [router, isCreateProjectOpen]);

  const handleRailSettings = useCallback(() => {
    router.push(ROUTE_PATHS.SETTINGS);
  }, [router]);

  const handleRailLogout = useCallback(async () => {
    // 1. Call backend logout — this clears the HttpOnly cookies (access_token, refresh_token, csrf_token)
    try {
      const { buildUrl } = await import("@/services/axios");
      const { getCsrfToken } = await import("@/services/auth");
      await fetch(buildUrl("/auth/logout"), {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-Token": getCsrfToken() || "",
        },
      });
    } catch {
      // Even if the backend call fails, clear frontend state and redirect
    }

    // 2. Clear all frontend state (user profile + any stale token keys)
    clearAuthSession();

    // 3. Redirect to signup
    if (typeof window !== "undefined") {
      window.location.replace(ROUTE_PATHS.AUTH_SIGNUP);
    }
  }, []);

  const handleOpenAgentReport = useCallback(async (targetExperimentId = null) => {
    const resolvedExperimentId = targetExperimentId || experimentId;
    if (!resolvedExperimentId) {
      setAgentReportError("Run a query in agent mode to view the stored report.");
      setIsAgentReportOpen(true);
      return;
    }

    setIsAgentReportOpen(true);

    // Use cached report if it's for the same experiment
    if (
      activeWorkspace?.agentReport &&
      String(activeWorkspace?.experimentId || activeWorkspace?.experiment_id || "") ===
      String(resolvedExperimentId)
    ) {
      setAgentReportError("");
      return;
    }

    setAgentReportLoading(true);
    setAgentReportError("");
    try {
      const report = await getExperimentAgentReportById(resolvedExperimentId);
      updateActiveWorkspace((current) => ({
        ...current,
        experimentId: resolvedExperimentId,
        agentReport: report,
      }));
    } catch (error) {
      setAgentReportError(error?.message || "Failed to load agent report.");
    } finally {
      setAgentReportLoading(false);
    }
  }, [
    activeWorkspace?.agentReport,
    activeWorkspace?.experimentId,
    activeWorkspace?.experiment_id,
    experimentId,
    updateActiveWorkspace,
  ]);

  const topNavbarActions = useMemo(
    () => [
      {
        id: "notifications",
        label: "Notifications",
        icon: "notifications",
        pulse: hasUnreadPipelineSuccess,
        onClick: () => {
          if (hasUnreadPipelineSuccess) {
            setHasUnreadPipelineSuccess(false);
            setPipelineSuccessModalOpen(true);
          }
          // no-op when there's nothing new — don't show any toast
        },
      },
      {
        id: "history",
        label: "History",
        icon: "history",
        onClick: () =>
          activeProject
            ? router.push(
              `${ROUTE_PATHS.HISTORY}?project=${activeProject.id}&name=${encodeURIComponent(activeProject.name)}&category=${encodeURIComponent(activeProject.category)}`,
            )
            : router.push(ROUTE_PATHS.HISTORY),
      },
      {
        id: "metrics",
        label: "Analytics",
        icon: "metrics",
        onClick: () =>
          activeProject
            ? router.push(
              `${ROUTE_PATHS.METRICS}?project=${activeProject.id}&name=${encodeURIComponent(activeProject.name)}&category=${encodeURIComponent(activeProject.category)}`,
            )
            : router.push(ROUTE_PATHS.METRICS),
      },
    ],
    [activeProject, hasUnreadPipelineSuccess, router, setPipelineSuccessModalOpen],
  );

  const topNavbarBreadcrumbItems = useMemo(() => {
    if (!activeProject || !activeWorkspace) {
      return [
        { label: "Home", href: ROUTE_PATHS.WORKSPACE_UPLOAD },
        { label: "Projects" },
      ];
    }
    const pid = activeProject.id;
    const code = activeProject.projectCode || formatProjectCode(activeProject);
    const projectLabel = `${code} · ${activeProject.name}`;
    const base = [
      { label: "Home", href: ROUTE_PATHS.WORKSPACE_UPLOAD },
      { label: "Projects", href: ROUTE_PATHS.WORKSPACE_UPLOAD },
      { label: projectLabel, href: workspaceUploadUrl(pid) },
    ];
    if (workspaceMode === "upload") {
      return [...base, { label: "Upload" }];
    }
    return [
      ...base,
      { label: "Upload", href: workspaceUploadUrl(pid) },
      { label: "Query" },
    ];
  }, [activeProject, activeWorkspace, workspaceMode]);

  const topNavbarEndSlot = useMemo(() => {
    if (!activeProject) return null;
    if (workspaceMode === "upload") {
      return (
        <Button
          type="button"
          variant="default"
          size="sm"
          className={classNames(styles.topNavOpenChat, {
            [styles.topNavOpenChatHighlight]:
              executionState.status === "success" && executionState.visible,
          })}
          onClick={() => router.push(workspaceQueryUrl(activeProject.id))}
        >
          <MessageSquare size={15} strokeWidth={2} />
          Open chat
        </Button>
      );
    }
    if (workspaceMode === "query") {
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={styles.topNavWorkspaceUpload}
          onClick={() => router.push(workspaceUploadUrl(activeProject.id))}
        >
          <Upload size={15} strokeWidth={2} />
          Upload
        </Button>
      );
    }
    return null;
  }, [workspaceMode, activeProject, router, executionState.status, executionState.visible]);


  if (!activeProject || !activeWorkspace) {
    return (
      <ProjectsListView
        userProfile={userProfile}
        topNavbarBreadcrumbItems={topNavbarBreadcrumbItems}
        handleRailProjects={handleRailProjects}
        handleRailSettings={handleRailSettings}
        handleRailLogout={handleRailLogout}
        isCreateProjectOpen={isCreateProjectOpen}
        setIsCreateProjectOpen={setIsCreateProjectOpen}
        paginatedVisibleProjects={paginatedVisibleProjects}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        sortOption={sortOption}
        setSortOption={setSortOption}
        projectViewMode={projectViewMode}
        setProjectViewMode={setProjectViewMode}
        projectPage={projectPage}
        setProjectPage={setProjectPage}
        totalProjectPages={totalProjectPages}
        availableProjectNames={availableProjectNames}
        deletingProjectId={deletingProjectId}
        handleOpenProject={handleOpenProject}
        setProjectPendingDelete={setProjectPendingDelete}
        setDeleteProjectInput={setDeleteProjectInput}
        projectsListLoading={projectsListLoading}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        newProjectCategory={newProjectCategory}
        setNewProjectCategory={setNewProjectCategory}
        isCreatingProject={isCreatingProject}
        handleCreateProject={handleCreateProject}
        projectPendingDelete={projectPendingDelete}
        deleteProjectInput={deleteProjectInput}
        handleDeleteProject={handleDeleteProject}
      />
    );
  }

  return (
    <div className={styles.workspaceWithTopNav}>
      <TopNavbar
        userProfile={userProfile}
        actions={topNavbarActions}
        breadcrumbItems={topNavbarBreadcrumbItems}
        endSlot={topNavbarEndSlot}
      />

      {/* Pipeline success notification modal */}
      <AnimatePresence>
        {pipelineSuccessModalOpen && (
          <motion.div
            className={styles.pipelineNotifOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setPipelineSuccessModalOpen(false)}
          >
            <motion.div
              className={styles.pipelineNotifCard}
              initial={{ opacity: 0, scale: 0.92, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* close */}
              <button
                type="button"
                className={styles.pipelineNotifClose}
                onClick={() => setPipelineSuccessModalOpen(false)}
                aria-label="Close notification"
              >
                <X size={16} />
              </button>

              {/* icon */}
              <div className={styles.pipelineNotifIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              {/* text */}
              <h3 className={styles.pipelineNotifTitle}>Pipeline completed</h3>
              <p className={styles.pipelineNotifDesc}>
                Your document has been processed successfully — chunked, embedded, and stored in the vector database. It&apos;s ready to query.
              </p>

              {/* file name if available */}
              {activeWorkspace?.execution?.fileName && (
                <div className={styles.pipelineNotifFile}>
                  <FileText size={13} />
                  <span>{activeWorkspace.execution.fileName}</span>
                </div>
              )}

              {/* actions */}
              <div className={styles.pipelineNotifActions}>
                <button
                  type="button"
                  className={styles.pipelineNotifAskBtn}
                  onClick={() => {
                    setPipelineSuccessModalOpen(false);
                    router.push(workspaceQueryUrl(activeProjectId));
                  }}
                >
                  <MessageSquare size={15} />
                  Ask Query
                </button>
                <button
                  type="button"
                  className={styles.pipelineNotifDismissBtn}
                  onClick={() => setPipelineSuccessModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={styles.workspaceShell}>
        <AppWorkspaceRail
          onProjects={handleRailProjects}
          onSettings={handleRailSettings}
          onLogout={handleRailLogout}
        />
        {workspaceMode === "upload" && (
          <UploadSidebar
            activeWorkspace={activeWorkspace}
            updateActiveWorkspace={updateActiveWorkspace}
            toggleWorkspaceValue={toggleWorkspaceValue}
          />
        )}


        {workspaceMode === "query" && (
          <QuerySidebar
            activeWorkspace={activeWorkspace}
            updateActiveWorkspace={updateActiveWorkspace}
            toggleWorkspaceValue={toggleWorkspaceValue}
            queryAgentModeEnabled={queryAgentModeEnabled}
            allowedVectorStoreOptions={allowedVectorStoreOptions}
            allowedEmbeddingOptions={allowedEmbeddingOptions}
            ollamaDocsOpen={ollamaDocsOpen}
            setOllamaDocsOpen={setOllamaDocsOpen}
            setOllamaWarningOpen={setOllamaWarningOpen}
          />
        )}

        <main
          className={classNames(styles.workspaceMain, {
            [styles.workspaceMainUpload]: workspaceMode === "upload",
          })}
        >
          {workspaceMode === "query" && (
            <header className={styles.chatContextBar}>
              <span className={styles.chatContextProject}>{activeProject.name}</span>
              {activeProject.projectCode && (
                <span className={styles.chatContextCode}>{activeProject.projectCode}</span>
              )}
              {activeProject.category && (
                <>
                  <span className={styles.chatContextSep} aria-hidden>·</span>
                  <span className={styles.chatContextCategory}>{activeProject.category}</span>
                </>
              )}
              {hasSelectedFile && (
                <>
                  <span className={styles.chatContextSep} aria-hidden>·</span>
                  <span className={styles.chatContextFilePill}>
                    <span className={styles.chatContextFileDot} />
                    {activeWorkspace.files.find(
                      (f) => String(f.fileId) === activeWorkspaceFileId,
                    )?.name ?? "Document"}
                  </span>
                </>
              )}
            </header>
          )}

          <section
            className={classNames(styles.workspaceCanvas, {
              [styles.workspaceCanvasUpload]: workspaceMode === "upload",
            })}
          >
            {workspaceMode === "upload" && (
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                hidden
                onChange={handleFileUpload}
              />
            )}

            <div
              ref={workspaceContentRef}
              className={classNames(styles.workspaceContentLayout, {
                [styles.workspaceContentLayoutSingleColumn]:
                  workspaceMode === "upload" || workspaceMode === "query",
              })}
              style={{
                "--chat-panel-offset":
                  chatPanelOffset > 0 ? `${chatPanelOffset}px` : "0px",
              }}
            >
              {workspaceMode === "upload" && (
                <section className={styles.uploadWorkspace}>
                  <div className={styles.uploadWorkspaceColumn}>
                    <div className={styles.uploadWorkspaceFixedTop}>
                      <header className={styles.uploadWorkspaceIntroCompact}>
                        <h2 className={styles.uploadWorkspaceHeadlineCompact}>Upload &amp; run pipeline</h2>
                        <p className={styles.uploadWorkspaceLeadCompact}>
                          Configure strategies in the sidebar → upload PDFs → run pipeline. Status and logs appear
                          in <strong>Pipeline output</strong> below after each run.
                        </p>
                      </header>

                      <div className={classNames(styles.uploadStepCard, styles.uploadStepCardCompact, styles.uploadStepCardNoBadge)}>
                        <div className={styles.uploadStepBody}>
                          <div className={styles.uploadStepTitleRow}>
                            <h3 className={styles.uploadStepTitle}>Upload files</h3>
                            <span className={styles.uploadStepHint}>Multipart API</span>
                          </div>
                          <button
                            type="button"
                            className={styles.uploadDropzoneProCompact}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingFiles}
                          >
                            <div className={styles.uploadDropzoneProIcon}>
                              <Upload size={20} strokeWidth={2} />
                            </div>
                            <div className={styles.uploadDropzoneProText}>
                              <p className={styles.uploadDropzoneProTitle}>
                                {isUploadingFiles ? "Uploading" : "Browse PDFs or drop here"}
                              </p>
                              <p className={styles.uploadDropzoneProSub}>
                                {isUploadingFiles
                                  ? "Do not close this tab."
                                  : "Multiple files supported."}
                              </p>
                            </div>
                          </button>
                          {isUploadingFiles && (
                            <div className={styles.uploadTimeline}>
                              <div className={styles.uploadTimelineBar}>
                                <div className={styles.uploadTimelineIndeterminate} />
                              </div>
                              <p className={styles.uploadTimelineCaption}>Uploading…</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={classNames(styles.uploadStepCard, styles.uploadStepCardFilesGrow, styles.uploadStepCardNoBadge)}>
                      <div className={classNames(styles.uploadStepBody, styles.uploadStepBodyGrow)}>
                        <div className={styles.uploadFilesSectionHeader}>
                          <div className={styles.uploadFilesSectionHeading}>
                            <h3 className={styles.uploadStepTitle}>Files in this project</h3>
                            <span className={styles.uploadStepHint}>
                              {activeWorkspace.files.length > 0
                                ? `${activeWorkspace.files.length} file${activeWorkspace.files.length === 1 ? "" : "s"}`
                                : "None yet"}
                            </span>
                          </div>
                          <div className={styles.uploadFilesSectionActions}>
                            {/* Clear selection — always first in the row */}
                            {hasSelectedFile && (
                              <button
                                type="button"
                                className={classNames(
                                  styles.fileSelectionClearButton,
                                  styles.uploadFilesClearNextToReport,
                                )}
                                onClick={() =>
                                  updateActiveWorkspace((current) => ({
                                    ...current,
                                    selectedFileId: null,
                                  }))
                                }
                              >
                                Clear selection
                              </button>
                            )}
                            {ingestionFileReports.length > 0 && (
                              <div className={styles.uploadFilesReportLogsRow}>
                                <button
                                  type="button"
                                  className={styles.reportLogsHeaderButton}
                                  title="View report logs for all files with metrics"
                                  onClick={openIngestionReportLogsPage}
                                >
                                  Report logs
                                </button>
                              </div>
                            )}
                            {activeWorkspace.files.length > 0 && (
                              <>
                                {activeWorkspace.files.some((f) => f?.fileId != null) && (
                                  <button
                                    type="button"
                                    className={styles.uploadFilesDeleteAllButton}
                                    title="Delete all files in this project"
                                    onClick={() => {
                                      setDeleteAllFilesConfirmInput("");
                                      setDeleteAllFilesModalOpen(true);
                                    }}
                                  >
                                    <Trash2 size={14} strokeWidth={2} aria-hidden />
                                    <span>
                                      Delete all (
                                      {activeWorkspace.files.filter((f) => f?.fileId != null).length})
                                    </span>
                                  </button>
                                )}
                                <div className={styles.uploadViewSwitch} role="group" aria-label="File layout">
                                  <button
                                    type="button"
                                    className={classNames(styles.uploadViewButton, {
                                      [styles.uploadViewButtonActive]: uploadFilesViewMode === "grid",
                                    })}
                                    onClick={() => setUploadFilesViewMode("grid")}
                                    title="Grid"
                                  >
                                    <Grid2x2 size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className={classNames(styles.uploadViewButton, {
                                      [styles.uploadViewButtonActive]: uploadFilesViewMode === "list",
                                    })}
                                    onClick={() => setUploadFilesViewMode("list")}
                                    title="List"
                                  >
                                    <List size={16} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  className={styles.uploadFilesExpandPrimaryButton}
                                  title="Open full-page files and pipeline views"
                                  onClick={() => {
                                    setUploadExpandedPanel("files");
                                    setUploadFilesExpandedOpen(true);
                                  }}
                                >
                                  <Maximize2 size={16} strokeWidth={2} aria-hidden />
                                  Expand
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className={styles.headerFilesContainer}>
                          <UploadProjectFilesList
                            files={activeWorkspace.files}
                            uploadFilesViewMode={uploadFilesViewMode}
                            activeWorkspaceFileId={activeWorkspaceFileId}
                            ingestionFileReports={ingestionFileReports}
                            updateActiveWorkspace={updateActiveWorkspace}
                            onOpenFileReport={openIngestionReportForFile}
                            setWorkspaceFilePendingDelete={setWorkspaceFilePendingDelete}
                            setDeleteWorkspaceFileNameInput={setDeleteWorkspaceFileNameInput}
                            regionClassName={styles.uploadFilesScrollRegion}
                            emptyClassName={styles.emptyFilesStatePro}
                            emptyMessage="No files yet. Upload PDFs in the area above."
                            isLoadingFiles={workspaceMode === "upload" && isProjectFilesSyncing}
                            fileSkeletonCount={fileSkeletonCount}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.uploadWorkspacePipelineSection}>
                      {executionState.visible && (
                        <UploadPipelineOutputCard
                          executionState={executionState}
                          executionStatusLabel={executionStatusLabel}
                          executionSummaryItems={executionSummaryItems}
                          selectedWorkspaceFile={selectedWorkspaceFile}
                          updateActiveWorkspace={updateActiveWorkspace}
                          variant="inline"
                          onExpand={() => {
                            setUploadExpandedPanel("pipeline");
                            setUploadFilesExpandedOpen(true);
                          }}
                        />
                      )}

                    </div>

                    <div className={styles.pipelineFooter}>
                      <Button
                        type="button"
                        size="lg"
                        className={styles.pipelineRunButton}
                        onClick={handleStartIngestion}
                        disabled={
                          isPending ||
                          isProcessingFiles ||
                          !hasUploadedFiles ||
                          activeWorkspace.selectedFileId == null ||
                          hasSelectedProcessedFile
                        }
                      >
                        <PlayCircle size={20} />
                        {isProcessingFiles ? "Pipeline running..." : "Run selected file"}
                      </Button>
                      <p className={styles.pipelineCtaHintLatin}>
                        Select one file, then run chunk to embed to vector store before chat.
                      </p>
                      {!hasUploadedFiles && (
                        <p className={styles.pipelineCtaNote}>Upload at least one PDF first.</p>
                      )}
                      {hasUploadedFiles && activeWorkspace.selectedFileId == null && (
                        <p className={styles.pipelineCtaNote}>Select one file to process.</p>
                      )}
                      {hasSelectedProcessedFile && (
                        <p className={styles.pipelineCtaNote}>Selected file is already processed. Start Your Chat.</p>
                      )}
                    </div>
                  </div>

                  {uploadFilesExpandedOpen && activeWorkspace.files.length > 0 && (
                    <div
                      className={styles.uploadFilesExpandedFullPage}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="upload-files-expanded-title"
                    >
                      <header className={styles.uploadFilesExpandedFullPageHeader}>
                        <button
                          type="button"
                          className={styles.uploadFilesExpandedBack}
                          onClick={() => setUploadFilesExpandedOpen(false)}
                        >
                          <ArrowLeft size={18} strokeWidth={2} aria-hidden />
                          Back
                        </button>
                        <div className={styles.uploadFilesExpandedHeaderTitles}>
                          <h2 id="upload-files-expanded-title" className={styles.uploadFilesExpandedTitle}>
                            Files in this project
                          </h2>
                          <p className={styles.uploadFilesExpandedSubtitle}>
                            {activeWorkspace.files.length} file
                            {activeWorkspace.files.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className={styles.uploadFilesExpandedHeaderActions}>
                          {/* Show only the OTHER tab — not both side by side */}
                          <div className={styles.uploadExpandedPanelTabs} role="tablist" aria-label="Expanded sections">
                            {uploadExpandedPanel === "files" ? (
                              <button
                                type="button"
                                role="tab"
                                aria-selected={false}
                                className={styles.uploadExpandedPanelTab}
                                onClick={() => setUploadExpandedPanel("pipeline")}
                              >
                                Pipeline execution
                              </button>
                            ) : (
                              <button
                                type="button"
                                role="tab"
                                aria-selected={false}
                                className={styles.uploadExpandedPanelTab}
                                onClick={() => setUploadExpandedPanel("files")}
                              >
                                Files
                              </button>
                            )}
                          </div>
                          {/* Clear selection — always first, before Report logs */}
                          {uploadExpandedPanel === "files" && hasSelectedFile && (
                            <button
                              type="button"
                              className={classNames(
                                styles.fileSelectionClearButton,
                                styles.uploadFilesClearNextToReport,
                              )}
                              onClick={() =>
                                updateActiveWorkspace((current) => ({
                                  ...current,
                                  selectedFileId: null,
                                }))
                              }
                            >
                              Clear selection
                            </button>
                          )}
                          {uploadExpandedPanel === "files" && ingestionFileReports.length > 0 && (
                            <div className={styles.uploadFilesReportLogsRow}>
                              <button
                                type="button"
                                className={styles.reportLogsHeaderButton}
                                title="View report logs for all files with metrics"
                                onClick={openIngestionReportLogsPage}
                              >
                                Report logs
                              </button>
                            </div>
                          )}
                          {activeWorkspace.files.some((f) => f?.fileId != null) && (
                            <button
                              type="button"
                              className={styles.uploadFilesDeleteAllButton}
                              title="Delete all files in this project"
                              onClick={() => {
                                setDeleteAllFilesConfirmInput("");
                                setDeleteAllFilesModalOpen(true);
                              }}
                            >
                              <Trash2 size={14} strokeWidth={2} aria-hidden />
                              <span>
                                Delete all (
                                {activeWorkspace.files.filter((f) => f?.fileId != null).length})
                              </span>
                            </button>
                          )}
                          {uploadExpandedPanel === "files" && (
                            <div className={styles.uploadViewSwitch} role="group" aria-label="File layout">
                              <button
                                type="button"
                                className={classNames(styles.uploadViewButton, {
                                  [styles.uploadViewButtonActive]: uploadFilesViewMode === "grid",
                                })}
                                onClick={() => setUploadFilesViewMode("grid")}
                                title="Grid"
                              >
                                <Grid2x2 size={16} />
                              </button>
                              <button
                                type="button"
                                className={classNames(styles.uploadViewButton, {
                                  [styles.uploadViewButtonActive]: uploadFilesViewMode === "list",
                                })}
                                onClick={() => setUploadFilesViewMode("list")}
                                title="List"
                              >
                                <List size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </header>
                      <div className={styles.uploadFilesExpandedFullPageBody}>
                        {uploadExpandedPanel === "files" ? (
                          <UploadProjectFilesList
                            files={activeWorkspace.files}
                            uploadFilesViewMode={uploadFilesViewMode}
                            activeWorkspaceFileId={activeWorkspaceFileId}
                            ingestionFileReports={ingestionFileReports}
                            updateActiveWorkspace={updateActiveWorkspace}
                            onOpenFileReport={openIngestionReportForFile}
                            setWorkspaceFilePendingDelete={setWorkspaceFilePendingDelete}
                            setDeleteWorkspaceFileNameInput={setDeleteWorkspaceFileNameInput}
                            regionClassName={styles.uploadFilesExpandedScroll}
                            emptyClassName={styles.emptyFilesStatePro}
                            emptyMessage="No files."
                            isLoadingFiles={workspaceMode === "upload" && isProjectFilesSyncing}
                            fileSkeletonCount={fileSkeletonCount}
                          />
                        ) : (
                          <div className={styles.uploadExpandedPipelinePage}>
                            {!executionState.visible &&
                              (executionState.status === "success" || executionState.status === "error") && (
                                <div
                                  className={classNames(styles.executionCollapsedBar, {
                                    [styles.executionCollapsedBarSuccess]: executionState.status === "success",
                                    [styles.executionCollapsedBarError]: executionState.status === "error",
                                  })}
                                >
                                  <div className={styles.executionCollapsedBarText}>
                                    <span className={styles.executionCollapsedBarLabel}>Last pipeline run</span>
                                    <span
                                      className={classNames(styles.executionCollapsedBarStatus, {
                                        [styles.executionCollapsedBarStatusError]:
                                          executionState.status === "error",
                                        [styles.executionCollapsedBarStatusSuccess]:
                                          executionState.status === "success",
                                      })}
                                    >
                                      {executionStatusLabel}
                                    </span>
                                    {executionState.message ? (
                                      <span className={styles.executionCollapsedBarMessage}>
                                        {executionState.message}
                                      </span>
                                    ) : null}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={styles.executionShowOutputButton}
                                    onClick={() =>
                                      updateActiveWorkspace((current) => ({
                                        ...current,
                                        execution: {
                                          ...current.execution,
                                          visible: true,
                                        },
                                      }))
                                    }
                                  >
                                    Show output
                                  </Button>
                                </div>
                              )}

                            {hasUploadPipelineOutput ? (
                              <UploadPipelineOutputCard
                                executionState={executionState}
                                executionStatusLabel={executionStatusLabel}
                                executionSummaryItems={executionSummaryItems}
                                selectedWorkspaceFile={selectedWorkspaceFile}
                                updateActiveWorkspace={updateActiveWorkspace}
                                variant="modal"
                              />
                            ) : (
                              <div className={styles.uploadExpandedEmptyState}>
                                Run pipeline to view execution progress and reports.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {ingestionReportOpen && ingestionReportMode === "logs" && (
                    <div
                      className={styles.reportFullPage}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="report-full-page-title"
                    >
                      <header className={styles.reportFullPageHeader}>
                        <button
                          type="button"
                          className={styles.reportFullPageBack}
                          onClick={() => setIngestionReportOpen(false)}
                        >
                          <ArrowLeft size={18} strokeWidth={2} aria-hidden />
                          Back
                        </button>
                        <div className={styles.reportFullPageHeaderCenter}>
                          <h1 id="report-full-page-title" className={styles.reportFullPageTitle}>
                            Report logs
                          </h1>
                          <p className={styles.reportFullPageSubtitle}>
                            {ingestionReportTableRows.length} file
                            {ingestionReportTableRows.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={styles.reportFullPageExport}
                          onClick={handleExportIngestionReportCsv}
                          disabled={
                            ingestionReportTableRows.length === 0 || ingestionReportViewLoading
                          }
                        >
                          Export CSV
                        </button>
                      </header>
                      <main className={styles.reportFullPageMain}>
                        {ingestionReportViewLoading ? (
                          <div className={styles.reportFullPageSkeleton} aria-hidden>
                            {Array.from({ length: 8 }).map((_, rowIdx) => (
                              <div key={rowIdx} className={styles.reportFullPageSkeletonRow}>
                                {Array.from({ length: 10 }).map((__, colIdx) => (
                                  <div key={colIdx} className={styles.reportFullPageSkeletonCell} />
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : ingestionReportTableRows.length === 0 ? (
                          <div className={styles.reportFullPageEmpty}>
                            <p className={styles.reportFullPageEmptyTitle}>No report data</p>
                            <p className={styles.reportFullPageEmptyHint}>
                              Run the pipeline on a file to generate ingestion metrics, then open this view
                              again.
                            </p>
                          </div>
                        ) : (
                          <div className={styles.reportFullPageTableWrap}>
                            <table className={styles.reportFullPageTable}>
                              <thead>
                                <tr>
                                  <th>File name</th>
                                  <th>File code</th>
                                  <th>Pages</th>
                                  <th>Size</th>
                                  <th>Category</th>
                                  <th>Total chunks</th>
                                  <th>Vectors stored</th>
                                  <th>Processing time</th>
                                  <th>Embedding</th>
                                  <th>Vector backends</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ingestionReportTableRows.map((rep) => {
                                  const wf = getWorkspaceFileForReport(rep, activeWorkspace?.files);
                                  const pages = wf
                                    ? wf.pages ?? wf.pagesCount ?? wf.pages_count ?? "—"
                                    : "—";
                                  return (
                                    <tr key={rep.id}>
                                      <td>{rep.fileName}</td>
                                      <td>{rep.fileCode || "—"}</td>
                                      <td>{pages}</td>
                                      <td>{wf?.size ?? "—"}</td>
                                      <td>{wf?.category ?? "—"}</td>
                                      <td>
                                        {rep.metricsIncomplete ? "—" : formatNumber(rep.chunkCount)}
                                      </td>
                                      <td>
                                        {rep.metricsIncomplete ? "—" : formatNumber(rep.vectorsStored)}
                                      </td>
                                      <td>
                                        {rep.metricsIncomplete
                                          ? "—"
                                          : rep.processingTimeSeconds > 0
                                            ? `${Number(rep.processingTimeSeconds).toFixed(2)}s`
                                            : "—"}
                                      </td>
                                      <td>{rep.embeddingLabel}</td>
                                      <td>
                                        {rep.backends?.length ? rep.backends.join(", ") : "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </main>
                    </div>
                  )}

                  {ingestionReportOpen &&
                    ingestionReportMode === "single" &&
                    ingestionFileReports.length > 0 && (
                      <div
                        className={styles.ingestionReportBackdrop}
                        role="presentation"
                        onClick={() => setIngestionReportOpen(false)}
                      >
                        <div
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="ingestion-report-single-title"
                          className={styles.ingestionReportModal}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className={styles.ingestionReportModalHeader}>
                            <h2
                              id="ingestion-report-single-title"
                              className={styles.ingestionReportModalTitle}
                            >
                              Ingestion report
                            </h2>
                            <button
                              type="button"
                              className={styles.ingestionReportClose}
                              onClick={() => setIngestionReportOpen(false)}
                              aria-label="Close"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          <p className={styles.ingestionReportModalIntro}>
                            File details and ingestion metrics for this file only.
                          </p>
                          {(() => {
                            const activeId =
                              ingestionReportSelectedId ?? String(ingestionFileReports[0]?.id ?? "");
                            const active =
                              ingestionFileReports.find((r) => String(r.id) === String(activeId)) ||
                              ingestionFileReports[0] ||
                              null;
                            if (!active) return null;
                            const workspaceFile = getWorkspaceFileForReport(
                              active,
                              activeWorkspace?.files,
                            );
                            return (
                              <div className={styles.ingestionReportBody}>
                                <IngestionFileDetailsSection
                                  workspaceFile={workspaceFile}
                                  variant="single"
                                />
                                <div className={styles.ingestionReportCard}>
                                  <h4 className={styles.ingestionReportFileDetailsTitle}>
                                    Ingestion metrics
                                  </h4>
                                  <IngestionReportMetricsDl active={active} />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                  <AnimatePresence>
                    {workspaceFilePendingDelete && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={classNames(styles.modalOverlay, styles.workspaceFileDeleteOverlay)}
                        onClick={() => {
                          if (deletingWorkspaceFileId) return;
                          setWorkspaceFilePendingDelete(null);
                          setDeleteWorkspaceFileNameInput("");
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
                              <h2 className={styles.createModalTitle}>Delete file</h2>
                              <p className={styles.createModalSubtitle}>
                                This removes the file from the project. Type the exact file name to confirm.
                              </p>
                            </div>
                            <button
                              type="button"
                              className={styles.modalCloseButton}
                              onClick={() => {
                                if (deletingWorkspaceFileId) return;
                                setWorkspaceFilePendingDelete(null);
                                setDeleteWorkspaceFileNameInput("");
                              }}
                              aria-label="Close"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className={styles.createModalBody}>
                            <div className={styles.deleteModalContent}>
                              <p className={styles.deleteWarningText}>
                                Type the full file name below to confirm deletion (example:{" "}
                                <strong>{workspaceFilePendingDelete.name}</strong>).
                              </p>
                              <label className={styles.formField}>
                                <span className={styles.modalFieldLabel}>File name confirmation</span>
                                <Input
                                  value={deleteWorkspaceFileNameInput}
                                  onChange={(event) => setDeleteWorkspaceFileNameInput(event.target.value)}
                                  placeholder={workspaceFilePendingDelete.name}
                                  className={styles.modalInput}
                                  autoComplete="off"
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
                                  if (deletingWorkspaceFileId) return;
                                  setWorkspaceFilePendingDelete(null);
                                  setDeleteWorkspaceFileNameInput("");
                                }}
                                disabled={Boolean(deletingWorkspaceFileId)}
                              >
                                Cancel
                              </Button>
                              <Button
                                className={styles.deleteProjectCta}
                                onClick={handleDeleteWorkspaceFile}
                                disabled={
                                  deletingWorkspaceFileId != null ||
                                  deleteWorkspaceFileNameInput.trim() !==
                                  String(workspaceFilePendingDelete.name || "").trim()
                                }
                              >
                                {deletingWorkspaceFileId != null ? "Deleting…" : "Delete file"}
                              </Button>
                            </div>
                          </div>
                        </motion.section>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {deleteAllFilesModalOpen && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={classNames(styles.modalOverlay, styles.deleteAllFilesOverlay)}
                        onClick={() => {
                          if (isDeletingAllFiles) return;
                          setDeleteAllFilesModalOpen(false);
                          setDeleteAllFilesConfirmInput("");
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
                              <h2 className={styles.createModalTitle}>Delete all files</h2>
                              <p className={styles.createModalSubtitle}>
                                This permanently removes every file from this project. Chat and pipeline data
                                tied to these files may be affected. This cannot be undone.
                              </p>
                            </div>
                            <button
                              type="button"
                              className={styles.modalCloseButton}
                              onClick={() => {
                                if (isDeletingAllFiles) return;
                                setDeleteAllFilesModalOpen(false);
                                setDeleteAllFilesConfirmInput("");
                              }}
                              aria-label="Close"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className={styles.createModalBody}>
                            <div className={styles.deleteModalContent}>
                              <p className={styles.deleteWarningText}>
                                You are about to delete{" "}
                                <strong>
                                  {activeWorkspace.files.filter((f) => f?.fileId != null).length ||
                                    activeWorkspace.files.length}{" "}
                                  file
                                  {(activeWorkspace.files.filter((f) => f?.fileId != null).length ||
                                    activeWorkspace.files.length) === 1
                                    ? ""
                                    : "s"}
                                </strong>
                                . Type <strong>{DELETE_ALL_FILES_CONFIRM_PHRASE}</strong> to confirm you want
                                to remove all of them completely.
                              </p>
                              <label className={styles.formField}>
                                <span className={styles.modalFieldLabel}>Confirmation</span>
                                <Input
                                  value={deleteAllFilesConfirmInput}
                                  onChange={(event) => setDeleteAllFilesConfirmInput(event.target.value)}
                                  placeholder={DELETE_ALL_FILES_CONFIRM_PHRASE}
                                  className={styles.modalInput}
                                  autoComplete="off"
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
                                  if (isDeletingAllFiles) return;
                                  setDeleteAllFilesModalOpen(false);
                                  setDeleteAllFilesConfirmInput("");
                                }}
                                disabled={isDeletingAllFiles}
                              >
                                Cancel
                              </Button>
                              <Button
                                className={styles.deleteProjectCta}
                                onClick={handleDeleteAllWorkspaceFiles}
                                disabled={
                                  isDeletingAllFiles ||
                                  deleteAllFilesConfirmInput.trim() !== DELETE_ALL_FILES_CONFIRM_PHRASE ||
                                  activeWorkspace.files.filter((f) => f?.fileId != null).length === 0
                                }
                              >
                                {isDeletingAllFiles ? "Deleting…" : "Delete all files"}
                              </Button>
                            </div>
                          </div>
                        </motion.section>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}

              {workspaceMode === "query" && (
                <div className={styles.chatPanelShell}>

                  {/* Welcome subtitle */}
                  {showChatWelcome && (
                    <div className={styles.chatWelcomeShell}>
                    </div>
                  )}

                  {/* Conversation area */}
                  <div className={styles.workspaceCenterStage}>
                    {activeWorkspace.visibleLines.length > 0 && (
                      <div className={styles.statusList}>
                        {activeWorkspace.visibleLines.map((line) => (
                          <TypedLine key={line.id} text={line.text} />
                        ))}
                      </div>
                    )}

                    {/* Chat history loading state */}
                    {chatHistoryLoading && (
                      <div className={styles.chatHistoryLoading}>
                        <span className={styles.chatHistoryLoadingDot} />
                        <span className={styles.chatHistoryLoadingDot} />
                        <span className={styles.chatHistoryLoadingDot} />
                        <span className={styles.chatHistoryLoadingText}>Loading conversation history…</span>
                      </div>
                    )}

                    {(activeWorkspace.conversation || []).map((entry) => {
                      // Timestamp from entry.id (format: "timestamp-randomstring")
                      const entryTs = Number(String(entry.id).split("-")[0]);
                      const entryTime = Number.isFinite(entryTs) && entryTs > 0
                        ? new Date(entryTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : null;

                      return (
                        <div key={entry.id} className={styles.conversationBlock}>

                          {/* User bubble with timestamp */}
                          <div className={styles.userMessageRow}>
                            <div className={styles.userBubbleWrap}>
                              {entryTime && (
                                <span className={styles.userBubbleTime}>{entryTime}</span>
                              )}
                              <div className={styles.userBubble}>{entry.query}</div>
                            </div>
                          </div>

                          {/* AI responses — markdown + avatar dot */}
                          {(entry.responseVariants || []).map((variant, index) => (
                            <motion.div
                              key={`${entry.id}-${variant.db}-${variant.experimentId || index}`}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                              className={styles.aiMessageRow}
                            >
                              <span className={styles.aiAvatarDot} aria-hidden />
                              <div className={styles.aiResponseCard}>
                                <div className={styles.aiResponseText}>
                                  {renderMarkdown(variant.response)}
                                </div>
                                <div className={styles.responseCardActions}>
                                  {variant.usedStrategies?.length > 0 && (
                                    <button
                                      type="button"
                                      className={styles.techniqueChip}
                                      onClick={() =>
                                        setTechniqueOverlay({
                                          title: `Response-${index + 1}`,
                                          strategies: variant.usedStrategies,
                                        })
                                      }
                                    >
                                      Techniques used ↗
                                    </button>
                                  )}
                                  {variant.agentEnabled && (
                                    <button
                                      type="button"
                                      className={styles.techniqueChip}
                                      onClick={() => handleOpenAgentReport(variant.experimentId)}
                                    >
                                      Agent report ↗
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      );
                    })}

                    {/* In-flight user bubble */}
                    {activeWorkspace.submittedQuery && (
                      <div className={styles.userMessageRow}>
                        <div className={styles.userBubble}>{activeWorkspace.submittedQuery}</div>
                      </div>
                    )}

                    {/* Processing glass card */}
                    {queryActivityState.visible && activeWorkspace.phase === "query-processing" && (
                      <div className={styles.aiMessageRow}>
                        <span className={styles.aiAvatarDot} aria-hidden />
                        <div className={styles.queryActivityStack}>
                          <div className={styles.queryActivityGlass}>
                            <span className={styles.queryActivityGlassShimmer} aria-hidden />
                            <p className={styles.queryActivityLabel}>
                              Analyzing your documents
                              <span className={styles.queryActivityLabelDot} />
                              <span className={styles.queryActivityLabelDot} />
                              <span className={styles.queryActivityLabelDot} />
                            </p>
                            <p
                              key={queryActivityState.messages[0]?.id ?? "idle"}
                              className={classNames(styles.queryActivityLiveText, {
                                [styles.queryActivityLiveTextWarning]:
                                  queryActivityState.messages[0]?.tone === "warning",
                                [styles.queryActivityLiveTextError]:
                                  queryActivityState.messages[0]?.tone === "error",
                              })}
                            >
                              {queryActivityState.messages[0]?.text ?? "Starting analysis…"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ollama not running error card */}
                    {queryActivityState.ollamaError && activeWorkspace.phase === "query-ready" && (
                      <div className={styles.aiMessageRow}>
                        <span className={styles.aiAvatarDot} aria-hidden />
                        <div className={styles.ollamaErrorCard}>
                          <div className={styles.ollamaErrorIcon} aria-hidden>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </div>
                          <div className={styles.ollamaErrorBody}>
                            <p className={styles.ollamaErrorTitle}>Ollama is not running</p>
                            <p className={styles.ollamaErrorDesc}>
                              Llama 3.2 requires Ollama running locally at <code>localhost:11434</code>. Install Ollama and pull the model to continue.
                            </p>
                            <div className={styles.ollamaErrorActions}>
                              <a
                                href="https://ollama.com/download/windows"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.ollamaErrorBtnInstall}
                              >
                                Install Ollama
                              </a>
                              <button
                                type="button"
                                className={styles.ollamaErrorBtnDismiss}
                                onClick={() =>
                                  updateActiveWorkspace((current) => ({
                                    ...current,
                                    queryActivity: {
                                      ...current.queryActivity,
                                      ollamaError: false,
                                      visible: false,
                                    },
                                  }))
                                }
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input dock — floating bar, no label */}
                  <div className={styles.queryDock}>
                    <div className={styles.chatInputBar}>

                      {/* Text input — takes all available space */}
                      <Input
                        ref={queryInputRef}
                        value={activeWorkspace.query}
                        disabled={isChatInputDisabled}
                        onChange={(event) =>
                          updateActiveWorkspace((current) => ({
                            ...current,
                            query: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (isChatInputDisabled) return;
                          if (event.key === "Enter") handleStartQuery();
                        }}
                        placeholder={
                          isChatInputDisabled
                            ? isQueryInFlight
                              ? "Waiting for the model to finish…"
                              : "Select an uploaded file to enable chat"
                            : !hasSelectedProcessedFile
                              ? "Process the selected file first, then ask your question¦"
                              : "Ask anything about your document!"
                        }
                        className={classNames(styles.queryInput, styles.queryInputHero, {
                          [styles.queryInputDisabled]: isChatInputDisabled,
                        })}
                      />

                      {/* Divider */}
                      <span className={styles.chatInputDivider} aria-hidden />

                      {/* Model selector dropdown */}
                      <div className={styles.modelDropdownWrap} ref={modelDropdownRef}>
                        <button
                          type="button"
                          className={styles.modelSelectorBtn}
                          onClick={() => setModelDropdownOpen((v) => !v)}
                          title="Select model"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                          </svg>
                          <span>{activeWorkspace.selectedLlmModel ?? "gpt-4o-mini"}</span>
                          <svg
                            width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            aria-hidden
                            style={{ transform: modelDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {modelDropdownOpen && (
                          <div className={styles.modelDropdownMenu}>
                            {[
                              { value: "gpt-4o-mini", label: "GPT-4o mini", desc: "Fast & efficient" },
                              { value: "gpt-4.1", label: "GPT-4.1", desc: "Latest generation" },
                              { value: "gpt-4o", label: "GPT-4o", desc: "Most capable" },
                            ].map((m) => (
                              <button
                                key={m.value}
                                type="button"
                                className={classNames(styles.modelDropdownItem, {
                                  [styles.modelDropdownItemActive]:
                                    (activeWorkspace.selectedLlmModel ?? "gpt-4o-mini") === m.value,
                                })}
                                onClick={() => {
                                  updateActiveWorkspace((current) => ({
                                    ...current,
                                    selectedLlmModel: m.value,
                                  }));
                                  setModelDropdownOpen(false);
                                }}
                              >
                                <span className={styles.modelDropdownItemLabel}>{m.label}</span>
                                <span className={styles.modelDropdownItemDesc}>{m.desc}</span>
                                {(activeWorkspace.selectedLlmModel ?? "gpt-4o-mini") === m.value && (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.modelDropdownItemCheck} aria-hidden>
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <span className={styles.chatInputDivider} aria-hidden />

                      {/* Agent toggle */}
                      <button
                        type="button"
                        className={styles.agentToggleWrap}
                        onClick={() => toggleWorkspaceValue("queryConfigurations", "agent")}
                        aria-pressed={queryAgentModeEnabled}
                        title={queryAgentModeEnabled ? "Turn off Agent mode" : "Turn on Agent mode"}
                      >
                        <span className={styles.agentToggleLabel}>Agent</span>
                        <span className={classNames(styles.agentToggleTrack, {
                          [styles.agentToggleTrackOn]: queryAgentModeEnabled,
                        })}>
                          <span className={classNames(styles.agentToggleThumb, {
                            [styles.agentToggleThumbOn]: queryAgentModeEnabled,
                          })} />
                        </span>
                      </button>

                      {/* Divider */}
                      <span className={styles.chatInputDivider} aria-hidden />

                      {/* Send button */}
                      <Button
                        className={classNames(styles.querySendButton, styles.querySendButtonHero)}
                        onClick={handleStartQuery}
                        title={isQueryInFlight ? "Query in progress" : "Send query"}
                        disabled={isChatInputDisabled}
                      >
                        <Send size={16} />
                      </Button>
                    </div>
                  </div>

                </div>
              )}
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

          {isAgentReportOpen && (
            <div
              className={styles.agentReportBackdrop}
              role="presentation"
              onClick={() => setIsAgentReportOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="agent-report-title"
                className={styles.agentReportModal}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.agentReportHeader}>
                  <div>
                    <h2 id="agent-report-title" className={styles.agentReportTitle}>
                      Agent report
                    </h2>
                    <p className={styles.agentReportIntro}>
                      Stored agent and validator details for the current query.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.agentReportClose}
                    onClick={() => setIsAgentReportOpen(false)}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={styles.agentReportContent}>
                  {agentReportLoading ? (
                    <div className={styles.agentReportEmpty}>Loading report...</div>
                  ) : agentReportError ? (
                    <div className={styles.agentReportEmpty}>{agentReportError}</div>
                  ) : agentReportRows.length === 0 ? (
                    <div className={styles.agentReportEmpty}>No agent report available.</div>
                  ) : (
                    <div className={styles.agentReportGrid}>
                      {agentReportRows.map(([label, value]) => (
                        <div key={label} className={styles.agentReportItem}>
                          <span className={styles.agentReportItemLabel}>{label}</span>
                          <span className={styles.agentReportItemValue}>
                            {value == null || value === ""
                              ? "-"
                              : typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {workspaceMode === "query" && (
          <QueryRightSidebar
            activeWorkspace={activeWorkspace}
            updateActiveWorkspace={updateActiveWorkspace}
            queryRightSidebarWide={queryRightSidebarWide}
            isQueryRightSidebarPinned={isQueryRightSidebarPinned}
            setIsQueryRightSidebarPinned={setIsQueryRightSidebarPinned}
            setIsQueryRightSidebarExpanded={setIsQueryRightSidebarExpanded}
            perf={perf}
            perfLoading={perfLoading}
            perfError={perfError}
            latestPerformanceCards={latestPerformanceCards}
            performanceResponseVariants={performanceResponseVariants}
            selectedPerformanceResponseIndex={selectedPerformanceResponseIndex}
            setSelectedPerformanceResponseIndex={setSelectedPerformanceResponseIndex}
            historyEntries={historyEntries}
            historyLoading={historyLoading}
            historyError={historyError}
          />
        )}


        {workspaceMode === "upload" && (
          <UploadRightSidebar
            activeWorkspace={activeWorkspace}
            uploadRightSidebarWide={uploadRightSidebarWide}
            uploadRightSidebarMode={uploadRightSidebarMode}
            setUploadRightSidebarMode={setUploadRightSidebarMode}
            isUploadRightSidebarHovered={isUploadRightSidebarHovered}
            setIsUploadRightSidebarHovered={setIsUploadRightSidebarHovered}
            uploadRightActiveSection={uploadRightActiveSection}
            setUploadRightActiveSection={setUploadRightActiveSection}
            uploadSidebarControlOpen={uploadSidebarControlOpen}
            setUploadSidebarControlOpen={setUploadSidebarControlOpen}
            uploadSidebarControlRef={uploadSidebarControlRef}
            executionState={executionState}
            executionStatusLabel={executionStatusLabel}
            executionSummaryItems={executionSummaryItems}
            hasUploadPipelineOutput={hasUploadPipelineOutput}
            uploadSidebarTechniquesConfig={uploadSidebarTechniquesConfig}
            selectedWorkspaceFile={selectedWorkspaceFile}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectCanvas;