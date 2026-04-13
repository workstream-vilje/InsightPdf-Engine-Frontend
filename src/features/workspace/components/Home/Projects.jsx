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
  Blocks,
  ChevronRight,
  Database,
  FileText,
  FolderKanban,
  Grid2x2,
  List,
  LogOut,
  MessageSquare,
  PlayCircle,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
  Maximize2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProjectsPageView from "@/pages/projects_page/ProjectsPageView";
import TopNavbar from "@/components/common/top-navbar/TopNavbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getExperimentPerformanceById } from "@/lib/api";
import {
  DATA_EXTRACTION_OPTIONS,
  DEFAULT_QUALITY_METRICS,
  EMBEDDING_OPTIONS,
  INITIAL_PROJECTS,
  RETRIEVAL_STRATEGY_OPTIONS,
  TEXT_PROCESSING_OPTIONS,
  VECTOR_STORE_OPTIONS,
  createWorkspaceState,
} from "@/lib/projects/data";
import { ROUTE_PATHS, workspaceQueryUrl, workspaceUploadUrl } from "@/utils/routepaths";
import styles from "./Projects.module.css";

/** Typed in the “delete all files” modal to confirm permanent removal. */
const DELETE_ALL_FILES_CONFIRM_PHRASE = "DELETE ALL";

const RIGHT_SIDEBAR_ITEMS = [
  { value: "response", label: "Response", icon: MessageSquare },
  { value: "chunks", label: "Retrieved Chunks", icon: FileText },
  { value: "performance", label: "Execution Performance", icon: Sparkles },
  { value: "quality", label: "Quality Metrics", icon: Database },
];

const AppWorkspaceRail = ({ onProjects, onSettings, onLogout }) => (
  <aside className={styles.appWorkspaceRail} aria-label="Account and navigation">
    <div className={styles.appWorkspaceRailFlyout}>
      <div className={styles.appWorkspaceRailTop}>
        <button
          type="button"
          className={styles.appWorkspaceRailItem}
          onClick={onProjects}
          title="Projects"
        >
          <ArrowLeft size={18} className={styles.appWorkspaceRailIcon} />
          <span className={styles.appWorkspaceRailLabel}>Projects</span>
        </button>
      </div>
      <div className={styles.appWorkspaceRailSpacer} aria-hidden />
      <div className={styles.appWorkspaceRailBottom}>
        <button
          type="button"
          className={styles.appWorkspaceRailItem}
          onClick={onSettings}
          title="Settings"
        >
          <Settings size={18} className={styles.appWorkspaceRailIcon} />
          <span className={styles.appWorkspaceRailLabel}>Settings</span>
        </button>
        <button
          type="button"
          className={classNames(styles.appWorkspaceRailItem, styles.appWorkspaceRailItemDanger)}
          onClick={onLogout}
          title="Log out"
        >
          <LogOut size={18} className={styles.appWorkspaceRailIcon} />
          <span className={styles.appWorkspaceRailLabel}>Log out</span>
        </button>
      </div>
    </div>
  </aside>
);

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
    queryActivity: fileStillExists
      ? workspace?.queryActivity || { visible: false, status: "idle", messages: [] }
      : { visible: false, status: "idle", messages: [] },
    activeRightSection:
      !fileStillExists && workspace?.activeRightSection === "performance"
        ? "response"
        : workspace?.activeRightSection,
  };
};

const mapUploadedFileToWorkspaceFile = (file, category) => ({
  id: String(file?.id ?? `${file?.file_name}-${Date.now()}`),
  name: file?.file_name || "Unknown file",
  fileCode: file?.file_code || null,
  size: formatBytes(file?.file_size || 0),
  category: category || "General",
  fileId: file?.id ?? null,
  fileType: file?.file_type || null,
  pages: file?.pages_count ?? file?.pagesCount ?? file?.pages ?? null,
  allowedTechniques: file?.allowed_techniques || null,
});

const EXECUTION_STAGE_ORDER = ["chunking", "embedding", "vector-store"];

const formatExecutionValue = (value, fallback = "Configured") => {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : fallback;
  }
  if (value == null || value === "") {
    return fallback;
  }
  return String(value);
};

const toExecutionList = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value.length ? value : fallback;
  }
  if (value == null || value === "") {
    return fallback;
  }
  return [value];
};

const formatExecutionCountLabel = (count, label) => {
  const numeric = Number(count);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return `${formatNumber(numeric)} ${label}`;
};

const normalizeFallbackLabel = (usedMethod) => {
  const normalized = String(usedMethod || "")
    .replace(/\s*\(fallback\)\s*/gi, "")
    .trim();
  return normalized || usedMethod;
};

const buildExecutionRuns = ({
  workspace,
  targetFile,
  response = null,
  activeStage = "chunking",
  failed = false,
}) => {
  const { processingConfig } = buildSharedPipelineConfig(workspace);
  const data = response?.data || {};
  const comparisonResults = Array.isArray(data.comparison_results)
    ? data.comparison_results
    : null;
  const normalizedActiveStage = EXECUTION_STAGE_ORDER.includes(activeStage)
    ? activeStage
    : "chunking";
  const activeStageIndex = EXECUTION_STAGE_ORDER.indexOf(normalizedActiveStage);
  const fileName = targetFile?.name || data?.document?.name || "Document";
  const configuredSplitters = toExecutionList(
    processingConfig?.text_processing?.splitter,
    ["recursive"],
  );
  const configuredMethods = toExecutionList(
    processingConfig?.data_extraction?.method,
    ["pymupdf"],
  );
  const configuredEmbedding = [processingConfig?.embeddings?.provider, processingConfig?.embeddings?.model]
    .filter(Boolean)
    .join("/");
  const configuredVectorStores = toExecutionList(
    processingConfig?.vector_store?.backends || processingConfig?.vector_store?.backend,
    ["faiss"],
  );

  if (response) {
    const runs = (comparisonResults?.length ? comparisonResults : [data]).map((result, index) => {
      const requestedMethod =
        result?.processing?.extraction?.requested_method ||
        result?.technique?.extraction_method ||
        configuredMethods[0] ||
        "pymupdf";
      const usedMethod =
        result?.processing?.extraction?.used_method || requestedMethod;
      const splitter =
        result?.processing?.text_processing?.splitter ||
        result?.technique?.splitter ||
        configuredSplitters[0] ||
        "recursive";
      const chunkCount = Number(result?.chunks?.total || 0);
      const vectorStores = result?.vector_store?.stores || [];
      const storedVectors = vectorStores.reduce(
        (total, store) => total + Number(store?.vectors_stored || 0),
        0,
      );
      const backends = vectorStores.map((store) => store?.backend).filter(Boolean);
      const embeddingProvider = result?.embedding?.provider;
      const embeddingModel = result?.embedding?.model;
      const embeddingLabel = [embeddingProvider, embeddingModel].filter(Boolean).join("/");
      const fallbackTarget = normalizeFallbackLabel(usedMethod);
      const hasFallback =
        requestedMethod &&
        usedMethod &&
        requestedMethod.toLowerCase() !== fallbackTarget.toLowerCase();

      return {
        id: `run-${index + 1}`,
        label: comparisonResults?.length ? `Run ${index + 1}` : "Execution",
        meta: `Extraction: ${requestedMethod}`,
        note: hasFallback ? `${requestedMethod} fell back to ${fallbackTarget}.` : null,
        events: [
          {
            id: `run-${index + 1}-chunking`,
            status: "completed",
            message: `Chunking completed for '${fileName}'. Created ${formatNumber(chunkCount)} chunks using '${splitter}'.`,
            countLabel: formatExecutionCountLabel(chunkCount, "chunks"),
          },
          ...(embeddingLabel
            ? [
                {
                  id: `run-${index + 1}-embedding`,
                  status: "completed",
                  message: `Embedding completed for '${fileName}'. Generated ${formatNumber(chunkCount)} embeddings with provider '${embeddingProvider}' and model '${embeddingModel}'.`,
                  countLabel: formatExecutionCountLabel(chunkCount, "embeddings"),
                },
              ]
            : []),
          ...(backends.length > 0
            ? [
                {
                  id: `run-${index + 1}-vector-store`,
                  status: "completed",
                  message: `Vector store completed for '${fileName}'. Stored ${formatNumber(storedVectors)} vectors in backend(s): ${backends.join(", ")}.`,
                  countLabel: formatExecutionCountLabel(storedVectors, "vectors"),
                },
              ]
            : []),
        ],
      };
    });

    return runs;
  }

  return configuredMethods.map((method, runIndex) => ({
    id: `run-${runIndex + 1}`,
    label: configuredMethods.length > 1 ? `Run ${runIndex + 1}` : "Execution",
    meta: `Extraction: ${method}`,
    note: null,
    events: [
      {
        id: `run-${runIndex + 1}-chunking`,
        status:
          runIndex === 0
            ? failed && activeStageIndex === 0
              ? "failed"
              : activeStageIndex > 0
              ? "completed"
              : "active"
            : "pending",
        message: `Chunking '${fileName}' with '${configuredSplitters[0] || "recursive"}'.`,
        countLabel: null,
      },
      ...(configuredEmbedding
        ? [
            {
              id: `run-${runIndex + 1}-embedding`,
              status:
                runIndex === 0
                  ? failed && activeStageIndex === 1
                    ? "failed"
                    : activeStageIndex > 1
                    ? "completed"
                    : activeStageIndex === 1
                    ? "active"
                    : "pending"
                  : "pending",
              message: `Generating embeddings with '${configuredEmbedding}'.`,
              countLabel: null,
            },
          ]
        : []),
      ...(configuredVectorStores.length > 0
        ? [
            {
              id: `run-${runIndex + 1}-vector-store`,
              status:
                runIndex === 0
                  ? failed && activeStageIndex === 2
                    ? "failed"
                    : activeStageIndex === 2
                    ? "active"
                    : "pending"
                  : "pending",
              message: `Storing vectors in backend(s): ${configuredVectorStores.join(", ")}.`,
              countLabel: null,
            },
          ]
        : []),
    ],
  }));
};

const buildExecutionSummary = ({ response, targetFile, workspace }) => {
  const data = response?.data || {};
  const comparisonResults = Array.isArray(data.comparison_results)
    ? data.comparison_results
    : null;
  const primaryData = comparisonResults?.[0] || data;
  const vectorStores = primaryData?.vector_store?.stores || [];
  const vectorsStored = vectorStores.reduce(
    (total, store) => total + Number(store?.vectors_stored || 0),
    0,
  );
  const chunkTotal = Number(primaryData?.chunks?.total || 0);
  const previewCount = Number(primaryData?.chunks?.preview_count || 0);
  const embeddingLabel = primaryData?.embedding
    ? `${primaryData.embedding.provider}/${primaryData.embedding.model}`
    : null;
  const processingTime = Number(primaryData?.performance?.processing_time_seconds || 0);
  const details = {
    document: data?.document || primaryData?.document || null,
    processing: primaryData?.processing || null,
    embedding: primaryData?.embedding || null,
    vector_store: primaryData?.vector_store
      ? {
          stores: vectorStores.map((store) => ({
            backend: store?.backend || null,
            collection_name: store?.collection_name || store?.collection || null,
            vectors_stored: Number(store?.vectors_stored || 0),
          })),
        }
      : null,
    chunks: {
      total: chunkTotal,
      preview_count: previewCount,
    },
    performance: primaryData?.performance || null,
    comparison_runs: comparisonResults?.length || 0,
  };

  return {
    visible: true,
    status: response?.status || "success",
    stage: "completed",
    message: response?.message || "Document processed successfully",
    fileId: targetFile?.fileId != null ? Number(targetFile.fileId) : null,
    fileCode: targetFile?.fileCode || null,
    fileName: targetFile?.name || primaryData?.document?.name || "Unknown file",
    chunkCount: chunkTotal,
    previewCount,
    embedding: embeddingLabel,
    vectorBackends: vectorStores
      .map((store) => store?.backend)
      .filter(Boolean),
    vectorsStored,
    processingTime,
    comparisonCount: comparisonResults?.length || 0,
    detailsOpen: false,
    details,
    runs: buildExecutionRuns({
      workspace,
      targetFile,
      response,
      activeStage: "vector-store",
    }),
  };
};

const buildBatchExecutionSummary = ({ responses, files, workspace }) => {
  const safeResponses = Array.isArray(responses) ? responses.filter(Boolean) : [];
  const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  const totalFiles = safeFiles.length;
  const batchLabel = totalFiles === 1 ? safeFiles[0]?.name || "Document" : `${totalFiles} files processed`;

  const chunkCount = safeResponses.reduce((total, response) => {
    const data = response?.data || {};
    const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
    const primaryData = comparisonResults?.[0] || data;
    return total + Number(primaryData?.chunks?.total || 0);
  }, 0);

  const vectorsStored = safeResponses.reduce((total, response) => {
    const data = response?.data || {};
    const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
    const primaryData = comparisonResults?.[0] || data;
    const vectorStores = primaryData?.vector_store?.stores || [];
    return (
      total +
      vectorStores.reduce(
        (storeTotal, store) => storeTotal + Number(store?.vectors_stored || 0),
        0,
      )
    );
  }, 0);

  const processingTime = safeResponses.reduce((total, response) => {
    const data = response?.data || {};
    const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
    const primaryData = comparisonResults?.[0] || data;
    return total + Number(primaryData?.performance?.processing_time_seconds || 0);
  }, 0);

  const comparisonCount = safeResponses.reduce((total, response) => {
    const data = response?.data || {};
    const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
    return total + (comparisonResults?.length || 1);
  }, 0);

  const vectorBackends = Array.from(
    new Set(
      safeResponses.flatMap((response) => {
        const data = response?.data || {};
        const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
        const primaryData = comparisonResults?.[0] || data;
        return (primaryData?.vector_store?.stores || []).map((store) => store?.backend).filter(Boolean);
      }),
    ),
  );

  const embeddingLabels = Array.from(
    new Set(
      safeResponses
        .map((response) => {
          const data = response?.data || {};
          const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
          const primaryData = comparisonResults?.[0] || data;
          return primaryData?.embedding
            ? `${primaryData.embedding.provider}/${primaryData.embedding.model}`
            : null;
        })
        .filter(Boolean),
    ),
  );

  const runs = safeResponses.flatMap((response, index) => {
    const file = safeFiles[index] || null;
    return buildExecutionRuns({
      workspace,
      targetFile: file,
      response,
      activeStage: "vector-store",
    }).map((run, runIndex) => ({
      ...run,
      id: `${file?.fileId || index}-run-${runIndex + 1}`,
      label:
        totalFiles > 1
          ? `${file?.name || `File ${index + 1}`} · ${run.label}`
          : run.label,
      events: (run.events || []).map((event, eventIndex) => ({
        ...event,
        id: `${file?.fileId || index}-event-${eventIndex + 1}`,
      })),
    }));
  });

  return {
    visible: true,
    status: "success",
    stage: "completed",
    message:
      totalFiles > 1
        ? `Processed ${totalFiles} files successfully.`
        : "Document processed successfully",
    fileId: totalFiles === 1 ? Number(safeFiles[0]?.fileId || 0) || null : null,
    fileCode: totalFiles === 1 ? safeFiles[0]?.fileCode || null : `${totalFiles} FILES`,
    fileName: batchLabel,
    chunkCount,
    previewCount: null,
    embedding:
      embeddingLabels.length === 1
        ? embeddingLabels[0]
        : embeddingLabels.length > 1
        ? `${embeddingLabels.length} embedding configs`
        : null,
    vectorBackends,
    vectorsStored,
    processingTime,
    comparisonCount,
    detailsOpen: false,
    details: {
      files: safeFiles.map((file, index) => ({
        fileId: file?.fileId ?? null,
        fileCode: file?.fileCode || null,
        fileName: file?.name || `File ${index + 1}`,
        result: safeResponses[index]?.data || null,
      })),
    },
    runs,
  };
};

/** Normalized metrics per file for ingestion report UI */
const mapProcessResultToIngestionReport = (entry, index) => {
  const data = entry?.result || {};
  const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
  const primaryData = comparisonResults?.[0] || data;
  const chunkTotal = Number(primaryData?.chunks?.total || 0);
  const vectorStores = primaryData?.vector_store?.stores || [];
  const vectorsStored = vectorStores.reduce((t, s) => t + Number(s?.vectors_stored || 0), 0);
  const processingTime = Number(primaryData?.performance?.processing_time_seconds || 0);
  const emb = primaryData?.embedding;
  const embeddingLabel = emb
    ? [emb.provider, emb.model].filter(Boolean).join(" / ")
    : "—";
  const backends = Array.from(new Set(vectorStores.map((s) => s?.backend).filter(Boolean)));
  return {
    id: String(entry?.fileId ?? `idx-${index}`),
    fileId: entry?.fileId ?? null,
    fileName: entry?.fileName || `File ${index + 1}`,
    fileCode: entry?.fileCode || null,
    chunkCount: chunkTotal,
    vectorsStored,
    processingTimeSeconds: processingTime,
    embeddingLabel,
    backends,
  };
};

const createActivityMessage = (id, text, tone = "info") => ({
  id,
  text,
  tone,
});

const buildPendingQueryActivityMessages = ({ workspace }) => {
  const vectorStores = (workspace?.vectorStores || []).filter(Boolean);
  const vectorLabel = vectorStores.length ? vectorStores.join(", ") : "the selected vector store";
  const topK = Math.max(1, Number(workspace?.topK) || 3);

  return [
    createActivityMessage(
      "search",
      `Searching ${vectorLabel} for the most relevant passages with top-k ${topK}.`,
    ),
    createActivityMessage(
      "ranking",
      "Ranking retrieved passages and preparing the grounded prompt.",
    ),
    createActivityMessage(
      "generation",
      "Generating the answer with gpt-4o-mini.",
    ),
    createActivityMessage(
      "validation",
      "Reviewing the answer for grounding and response quality.",
    ),
  ];
};

const buildQueryActivityMessages = ({ response, targetFile }) => {
  const results =
    Array.isArray(response?.comparison_results) && response.comparison_results.length > 0
      ? response.comparison_results
      : response
      ? [response]
      : [];
  const messages = [];

  if (results.length > 1) {
    messages.push(
      createActivityMessage(
        "comparison-summary",
        `Compared ${results.length} vector stores for '${targetFile?.name || "this document"}'.`,
      ),
    );
  }

  results.forEach((result, index) => {
    const dbLabel = result?.db || result?.retrieval || `run-${index + 1}`;
    const chunkCount = Array.isArray(result?.chunks) ? result.chunks.length : 0;
    const retrievalTime =
      result?.retrieval_time != null ? formatMs(result.retrieval_time) : null;
    const llmTime = result?.llm_gen_time != null ? formatMs(result.llm_gen_time) : null;
    const totalTime = result?.total_time != null ? formatMs(result.total_time) : null;
    const accepted =
      typeof result?.reflection?.accepted === "boolean"
        ? result.reflection.accepted
        : Number(result?.accuracy || 0) >= 1;

    if (retrievalTime) {
      messages.push(
        createActivityMessage(
          `${dbLabel}-retrieval`,
          `${dbLabel}: retrieved ${formatNumber(chunkCount)} chunks in ${retrievalTime}.`,
        ),
      );
    }

    if (llmTime) {
      messages.push(
        createActivityMessage(
          `${dbLabel}-generation`,
          `${dbLabel}: generated and reviewed the answer in ${llmTime}.`,
        ),
      );
    }

    if (totalTime) {
      messages.push(
        createActivityMessage(
          `${dbLabel}-complete`,
          `${dbLabel}: completed in ${totalTime} and ${accepted ? "passed validation" : "needs review"}.`,
          accepted ? "success" : "warning",
        ),
      );
    }
  });

  return messages;
};

const resolveProjectDocumentId = (project) => {
  return (
    project?.document_id ||
    project?.document_code ||
    project?.doc_id ||
    project?.doc_code ||
    project?.latest_document_id ||
    project?.latest_document_code ||
    null
  );
};

const formatProjectCode = (project) => {
  const backendCode = String(project?.project_code || "").trim();
  if (backendCode) return backendCode.toUpperCase();
  const numericId = Number(project?.id);
  if (Number.isFinite(numericId) && numericId > 0) {
    return `PRO-${String(numericId).padStart(3, "0")}`;
  }
  return "PRO-000";
};

const mapBackendProjectToCanvasProject = (project) => ({
  id: String(project?.id),
  projectCode: formatProjectCode(project),
  name: project?.project_name || "Untitled Project",
  category: project?.category || "General",
  description: `${project?.category || "General"} workspace for uploads, chunking, embeddings, and query evaluation.`,
  region: formatProjectCode(project),
  tier: "Connected",
  documents: Number(project?.documents || 0),
  documentId: resolveProjectDocumentId(project),
  lastUpdated: "Synced",
  createdAt: project?.created_at || null,
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
          <Checkbox checked={checked} className={styles.choiceCheckbox} asSpan />
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

/** Shared grid/list of project files for inline upload panel and expanded modal. */
function UploadProjectFilesList({
  files,
  uploadFilesViewMode,
  activeWorkspaceFileId,
  ingestionFileReports,
  executionState,
  updateActiveWorkspace,
  setIngestionReportSelectedId,
  setIngestionReportOpen,
  setWorkspaceFilePendingDelete,
  setDeleteWorkspaceFileNameInput,
  regionClassName,
  emptyClassName,
  emptyMessage,
}) {
  if (!files?.length) {
    return <div className={emptyClassName}>{emptyMessage}</div>;
  }
  return (
    <div
      className={classNames(
        regionClassName,
        uploadFilesViewMode === "grid" ? styles.uploadFileGridLayout : styles.uploadFileListLayout,
      )}
    >
      {files.map((file) => {
        const fileReport = ingestionFileReports.find(
          (r) => r.fileId != null && String(r.fileId) === String(file.fileId),
        );
        const showReportBtn = executionState?.status === "success" && fileReport;
        return uploadFilesViewMode === "grid" ? (
          <button
            key={file.id}
            type="button"
            className={classNames(styles.uploadFileCard, {
              [styles.uploadFileCardActive]: String(file.fileId) === activeWorkspaceFileId,
            })}
            onClick={() =>
              updateActiveWorkspace((current) => ({
                ...current,
                selectedFileId:
                  String(file.fileId) === String(current.selectedFileId)
                    ? null
                    : file.fileId != null
                    ? Number(file.fileId)
                    : null,
              }))
            }
          >
            {file.fileId != null && (
              <span
                role="button"
                tabIndex={0}
                className={styles.uploadFileCardDelete}
                title="Delete file"
                onClick={(e) => {
                  e.stopPropagation();
                  setWorkspaceFilePendingDelete(file);
                  setDeleteWorkspaceFileNameInput("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setWorkspaceFilePendingDelete(file);
                    setDeleteWorkspaceFileNameInput("");
                  }
                }}
              >
                <Trash2 size={14} strokeWidth={2} aria-hidden />
              </span>
            )}
            <FileText size={20} className={styles.uploadFileCardIcon} />
            <p className={styles.uploadFileCardTitle}>{file.name}</p>
            <p className={styles.uploadFileCardMeta}>
              {file.pages ?? file.pagesCount ?? file.pages_count ?? "—"} pg · {file.size}
            </p>
                <span
                  className={classNames(styles.fileStatusBadge, styles.uploadFileStatusPill, styles.uploadFileCardBadge, {
                    [styles.fileStatusBadgeActive]: String(file.fileId) === activeWorkspaceFileId,
                  })}
                >
                  {String(file.fileId) === activeWorkspaceFileId ? "Selected" : "Ready"}
                </span>
            {showReportBtn && (
              <span
                role="button"
                tabIndex={0}
                className={styles.uploadFileReportLink}
                onClick={(e) => {
                  e.stopPropagation();
                  setIngestionReportSelectedId(String(fileReport.id));
                  setIngestionReportOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setIngestionReportSelectedId(String(fileReport.id));
                    setIngestionReportOpen(true);
                  }
                }}
              >
                Report
              </span>
            )}
          </button>
        ) : (
          <button
            key={file.id}
            type="button"
            className={classNames(styles.uploadFileRow, {
              [styles.uploadFileRowActive]: String(file.fileId) === activeWorkspaceFileId,
            })}
            onClick={() =>
              updateActiveWorkspace((current) => ({
                ...current,
                selectedFileId:
                  String(file.fileId) === String(current.selectedFileId)
                    ? null
                    : file.fileId != null
                    ? Number(file.fileId)
                    : null,
              }))
            }
            aria-pressed={String(file.fileId) === activeWorkspaceFileId}
          >
            <FileText size={18} className={styles.uploadFileRowIcon} />
            <div className={styles.uploadFileRowMain}>
              <p className={styles.fileItemTitle}>{file.name}</p>
              <p className={styles.fileItemMeta}>
                {(file.fileCode || `FILE-${file.id}`) +
                  " · " +
                  `${file.pages ?? file.pagesCount ?? file.pages_count ?? "-"} pages · ${file.size}`}
              </p>
            </div>
            <div className={styles.uploadFileRowActions}>
              {showReportBtn && (
                <button
                  type="button"
                  className={styles.uploadFileReportBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIngestionReportSelectedId(String(fileReport.id));
                    setIngestionReportOpen(true);
                  }}
                >
                  Report
                </button>
              )}
              <span
                className={classNames(styles.fileStatusBadge, styles.uploadFileStatusPill, {
                  [styles.fileStatusBadgeActive]: String(file.fileId) === activeWorkspaceFileId,
                })}
              >
                {String(file.fileId) === activeWorkspaceFileId ? "Selected" : "Ready"}
              </span>
              {file.fileId != null && (
                <span
                  role="button"
                  tabIndex={0}
                  className={styles.uploadFileRowDelete}
                  title="Delete file"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWorkspaceFilePendingDelete(file);
                    setDeleteWorkspaceFileNameInput("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      setWorkspaceFilePendingDelete(file);
                      setDeleteWorkspaceFileNameInput("");
                    }
                  }}
                >
                  <Trash2 size={15} strokeWidth={2} aria-hidden />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const ProjectCanvas = ({ initialProjectId = null, workspaceMode = "upload" }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [projectWorkspaces, setProjectWorkspaces] = useState(() =>
    Object.fromEntries(INITIAL_PROJECTS.map((project) => [project.id, createWorkspaceState()])),
  );
  const [activeProjectId, setActiveProjectId] = useState(() =>
    initialProjectId != null && initialProjectId !== "" ? String(initialProjectId) : null,
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
  const [uploadFilesExpandedOpen, setUploadFilesExpandedOpen] = useState(false);
  const [workspaceFilePendingDelete, setWorkspaceFilePendingDelete] = useState(null);
  const [deleteWorkspaceFileNameInput, setDeleteWorkspaceFileNameInput] = useState("");
  const [deletingWorkspaceFileId, setDeletingWorkspaceFileId] = useState(null);
  const [deleteAllFilesModalOpen, setDeleteAllFilesModalOpen] = useState(false);
  const [deleteAllFilesConfirmInput, setDeleteAllFilesConfirmInput] = useState("");
  const [isDeletingAllFiles, setIsDeletingAllFiles] = useState(false);
  const [ingestionReportOpen, setIngestionReportOpen] = useState(false);
  const [ingestionReportSelectedId, setIngestionReportSelectedId] = useState(null);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(false);
  const [chatPanelOffset, setChatPanelOffset] = useState(420);
  const [chatGreeting, setChatGreeting] = useState("Hello");
  const [userProfile, setUserProfile] = useState({ name: "", email: "" });
  const [techniqueOverlay, setTechniqueOverlay] = useState(null);
  const fileInputRef = useRef(null);
  const queryInputRef = useRef(null);
  const workspaceContentRef = useRef(null);
  const timersRef = useRef([]);
  const hasHydratedRef = useRef(false);
  const projectFilesListSyncPromiseRef = useRef(null);
  const focusResyncTimeoutRef = useRef(null);
  const prevActiveProjectIdRef = useRef(null);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );
  const activeProjectCategory = activeProject?.category ?? null;
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

  useEffect(() => {
    if (selectedPerformanceResponseIndex < performanceResponseVariants.length) return;
    setSelectedPerformanceResponseIndex(0);
  }, [performanceResponseVariants.length, selectedPerformanceResponseIndex]);

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
    timersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

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
            Object.entries(parsedWorkspaces).map(([key, value]) => [String(key), value]),
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
        setActiveProjectId(() => {
          const requestedProjectId =
            initialProjectId != null && initialProjectId !== ""
              ? String(initialProjectId)
              : null;
          const availableIds = new Set(backendProjects.map((project) => String(project.id)));
          if (requestedProjectId == null) {
            return null;
          }
          return availableIds.has(requestedProjectId) ? requestedProjectId : null;
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
    window.localStorage.setItem(
      getScopedStorageKey("rag-canvas-workspaces", currentUserId),
      JSON.stringify(projectWorkspaces),
    );
  }, [projectWorkspaces]);

  useEffect(() => {
    if (initialProjectId == null || initialProjectId === "") {
      setActiveProjectId(null);
      return;
    }
    const requested = String(initialProjectId);
    const projectExists = projects.some((project) => String(project.id) === requested);
    if (projectExists) {
      setActiveProjectId(requested);
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
  // Coalesce concurrent calls (effects + focus + manual refresh) into one in-flight GET.
  const syncProjectFilesFromBackend = useCallback(async () => {
    if (!activeProjectId) return undefined;
    if (projectFilesListSyncPromiseRef.current) {
      return projectFilesListSyncPromiseRef.current;
    }
    const run = (async () => {
      try {
        const response = await fileApi.fetchProjectFiles(activeProjectId);
        const backendFiles = response?.data || [];
        const mapped = backendFiles.map((file) =>
          mapUploadedFileToWorkspaceFile(file, activeProjectCategory),
        );

        updateActiveWorkspace((current) => {
          const backendIds = new Set(mapped.map((f) => String(f.fileId)));
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
            ...current,
            files: mapped,
            selectedFileId: nextSelected,
            ...prunedData,
          };
        });
      } catch (e) {
        // keep existing UI state if fetch fails
      } finally {
        projectFilesListSyncPromiseRef.current = null;
      }
      return undefined;
    })();
    projectFilesListSyncPromiseRef.current = run;
    return run;
  }, [activeProjectCategory, activeProjectId, updateActiveWorkspace]);

  useEffect(() => {
    if (!activeProjectId) return undefined;
    syncProjectFilesFromBackend();
    return undefined;
  }, [activeProjectId, activeProjectCategory, syncProjectFilesFromBackend]);

  useEffect(() => {
    if (!activeWorkspace?.files?.length) return;

    updateActiveWorkspace((current) => {
      if (!current?.files?.length) return current;
      const resolvedFile =
        current.files.find(
          (file) => Number(file?.fileId) === Number(current.selectedFileId),
        ) || current.files[0];
      return {
        ...current,
        allowedTechniques: resolvedFile?.allowedTechniques || null,
      };
    });
  }, [activeWorkspace?.files, activeWorkspace?.selectedFileId, updateActiveWorkspace]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onFocus = () => {
      if (focusResyncTimeoutRef.current) {
        window.clearTimeout(focusResyncTimeoutRef.current);
      }
      focusResyncTimeoutRef.current = window.setTimeout(() => {
        focusResyncTimeoutRef.current = null;
        syncProjectFilesFromBackend();
      }, 500);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (focusResyncTimeoutRef.current) {
        window.clearTimeout(focusResyncTimeoutRef.current);
        focusResyncTimeoutRef.current = null;
      }
    };
  }, [syncProjectFilesFromBackend]);

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
      const uploadedFiles = (response?.data || []).map((file) =>
        mapUploadedFileToWorkspaceFile(file, activeProject?.category),
      );

      updateActiveWorkspace((current) => ({
        ...current,
        files: [...current.files, ...uploadedFiles],
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
      const message =
        error?.payload?.detail ||
        error?.payload?.message ||
        error?.message ||
        "Failed to delete file";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
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
      const message =
        error?.payload?.detail ||
        error?.payload?.message ||
        error?.message ||
        "Failed to delete one or more files";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
      await syncProjectFilesFromBackend();
    } finally {
      setIsDeletingAllFiles(false);
    }
  };

  const handleStartIngestion = () => {
    if (!activeWorkspace || !activeProjectId) return;

    const selectableFiles = activeWorkspace.files.filter((file) => file.fileId);
    const filesToProcess = selectableFiles;
    const executionTargetFile =
      selectableFiles.find(
        (file) => Number(file.fileId) === Number(activeWorkspace.selectedFileId),
      ) ||
      selectableFiles[0] ||
      null;
    if (!filesToProcess.length) {
      if (typeof window !== "undefined") {
        window.alert("Upload at least one file before processing.");
      }
      return;
    }

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
          message:
            filesToProcess.length > 1
              ? `Processing ${filesToProcess.length} files...`
              : `Processing ${executionTargetFile?.name || "document"}...`,
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
          processResponses.push(processResponse);
        }

        const resultSummary = buildBatchExecutionSummary({
          responses: processResponses,
          files: filesToProcess,
          workspace: activeWorkspace,
        });

        updateActiveWorkspace((current) => ({
          ...current,
          phase: "query-ready",
          visibleLines: [],
          retrievalStrategies:
            current.retrievalStrategies.length > 0
              ? current.retrievalStrategies
              : ["semantic-similarity"],
          execution: resultSummary,
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
    const selectedFileIdRaw = activeWorkspace.selectedFileId ?? null;
    const selectedFileId = selectedFileIdRaw != null ? Number(selectedFileIdRaw) : null;
    const targetFile =
      selectableFiles.find((file) => Number(file.fileId) === selectedFileId) ?? null;

    if (!targetFile?.fileId) {
      if (typeof window !== "undefined") {
        window.alert("Select one uploaded file before running a query.");
      }
      return;
    }

    const runQuery = async () => {
      clearTimers();
      const pendingMessages = buildPendingQueryActivityMessages({
        workspace: activeWorkspace,
      });
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
        queryActivity: {
          visible: true,
          status: "running",
          messages: pendingMessages.slice(0, 1),
        },
      }));

      try {
        pendingMessages.slice(1).forEach((message, index) => {
          const timeoutId = window.setTimeout(() => {
            updateActiveWorkspace((current) => ({
              ...current,
              queryActivity: {
                ...current.queryActivity,
                visible: true,
                status: "running",
                messages: pendingMessages.slice(0, index + 2),
              },
            }));
          }, (index + 1) * 900);
          timersRef.current.push(timeoutId);
        });

        const payload = buildQueryPayload({
          projectId: activeProjectId,
          fileId: targetFile.fileId,
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
                  fileId: targetFile.fileId,
                  experimentId: result.experiment_id,
                });
                savedResponse = saved?.data?.[0] || null;
              } catch (savedResponseError) {
                savedResponse = null;
              }
            }

            return {
              experimentId: result?.experiment_id || null,
              fileId: targetFile.fileId,
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
        const activityMessages = buildQueryActivityMessages({
          response,
          targetFile,
        });

        updateActiveWorkspace((current) => ({
          ...current,
          experimentId: primaryVariant?.experimentId || current?.experimentId || null,
          phase: "query-complete",
          submittedQuery: "",
          response: finalAnswer,
          responseVisible: true,
          usedStrategies: primaryVariant?.usedStrategies || [],
          responseVariants,
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
          queryActivity: {
            visible: true,
            status: "error",
            messages: [createActivityMessage("query-error", message, "error")],
          },
        }));
      } finally {
        clearTimers();
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
  const executionState = activeWorkspace?.execution || {};
  const executionStatusLabel =
    executionState.status === "running"
      ? "Running"
      : executionState.status === "error"
      ? "Failed"
      : executionState.status === "success"
      ? "Completed"
      : "Idle";
  const ingestionFileReports = useMemo(() => {
    const entries = executionState.details?.files;
    if (!Array.isArray(entries)) return [];
    return entries.map((entry, index) => mapProcessResultToIngestionReport(entry, index));
  }, [executionState.details]);

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
  const queryActivityState = activeWorkspace?.queryActivity || {
    visible: false,
    status: "idle",
    messages: [],
  };
  const isChatInputDisabled = !hasSelectedFile;

  const handleRailProjects = useCallback(() => {
    setActiveProjectId(null);
    router.replace(ROUTE_PATHS.WORKSPACE_UPLOAD);
  }, [router]);

  const handleRailSettings = useCallback(() => {
    router.push(ROUTE_PATHS.SETTINGS);
  }, [router]);

  const handleRailLogout = useCallback(() => {
    clearAuthSession();
    if (typeof window !== "undefined") {
      window.location.href = ROUTE_PATHS.AUTH_LOGIN;
    }
  }, []);

  const topNavbarActions = useMemo(
    () => [
      {
        id: "notifications",
        label: "Notifications",
        icon: "notifications",
        onClick: () => window.alert("No new notifications"),
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
    [activeProject, router],
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
      <div className={styles.workspaceWithTopNav}>
      <TopNavbar
        userProfile={userProfile}
        actions={[]}
        breadcrumbItems={topNavbarBreadcrumbItems}
      />
        <div className={styles.workspaceShell}>
          <AppWorkspaceRail
            onProjects={handleRailProjects}
            onSettings={handleRailSettings}
            onLogout={handleRailLogout}
          />
          <div className={styles.workspaceProjectsMain}>
            <ProjectsPageView
              embedded
              projects={paginatedVisibleProjects}
              userProfile={userProfile}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              projectFilter={projectFilter}
              onFilterChange={setProjectFilter}
              sortOption={sortOption}
              onSortChange={setSortOption}
              projectViewMode={projectViewMode}
              onProjectViewModeChange={setProjectViewMode}
              currentPage={projectPage}
              totalPages={totalProjectPages}
              onPageChange={setProjectPage}
              availableProjectNames={availableProjectNames}
              deletingProjectId={deletingProjectId}
              onCreateProject={() => setIsCreateProjectOpen(true)}
              onOpenProject={handleOpenProject}
              onDeleteProject={(projectToDelete) => {
                setProjectPendingDelete(projectToDelete);
                setDeleteProjectInput("");
              }}
            />
          </div>
        </div>

        <div className={styles.projectsShell}>
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
        </div>
      </div>
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
      <div className={styles.workspaceShell}>
        <AppWorkspaceRail
          onProjects={handleRailProjects}
          onSettings={handleRailSettings}
          onLogout={handleRailLogout}
        />
        {workspaceMode === "upload" && (
        <aside className={styles.workspaceQuerySidebar}>
          <div className={styles.workspaceContextSidebarInner}>
            <section className={styles.sidebarPane}>
              <div className={styles.sidebarGroupTitle}>Upload techniques</div>
              <div className={styles.sidebarPaneScroll}>
                <SidebarSection
                  icon={Blocks}
                  title="Chunk Length"
                  description="Same control pattern as current UI"
                  expanded
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
                  expanded
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
                  expanded
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
                  expanded
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
                  expanded
                >
                  <MultiSelectChips
                    options={VECTOR_STORE_OPTIONS}
                    selectedValues={activeWorkspace.vectorStores}
                    onToggle={(value) => toggleWorkspaceValue("vectorStores", value)}
                  />
                </SidebarSection>
              </div>
            </section>
          </div>
        </aside>
        )}

        {workspaceMode === "query" && (
        <aside className={styles.workspaceQuerySidebar}>
          <div className={styles.workspaceContextSidebarInner}>
            <section className={styles.sidebarPane}>
              <div className={styles.sidebarGroupTitle}>Query techniques</div>
              <div className={styles.sidebarPaneScroll}>
                <SidebarSection
                  icon={Database}
                  title="Retrieved Strategy"
                  description="Select multiple retrieval strategies"
                  expanded
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
                  expanded
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
                  expanded
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
                  expanded
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
                  expanded
                >
                  <div className={styles.inlineInfoPill}>gpt-4o-mini</div>
                </SidebarSection>
              </div>
            </section>
          </div>
        </aside>
        )}

        <main
          className={classNames(styles.workspaceMain, {
            [styles.workspaceMainUpload]: workspaceMode === "upload",
          })}
        >
        {workspaceMode === "query" && (
        <header className={styles.workspaceHeader}>
          <div className={styles.workspaceHeaderContent}>
            <h1 className={styles.workspaceTitle}>
              {activeProject.name}
              <span className={styles.workspaceCategory}>{activeProject.category}</span>
            </h1>
          </div>
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
                          {isUploadingFiles ? "Uploading…" : "Browse PDFs or drop here"}
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
                    <div className={styles.uploadStepTitleRow}>
                      <h3 className={styles.uploadStepTitle}>Files in this project</h3>
                      <div className={styles.uploadFilesToolbar}>
                        <span className={styles.uploadStepHint}>
                          {activeWorkspace.files.length > 0
                            ? `${activeWorkspace.files.length} file${activeWorkspace.files.length === 1 ? "" : "s"}`
                            : "None yet"}
                        </span>
                        {activeWorkspace.files.length > 0 && (
                          <>
                            <button
                              type="button"
                              className={styles.uploadFilesExpandButton}
                              title="Expand file list"
                              onClick={() => setUploadFilesExpandedOpen(true)}
                            >
                              <Maximize2 size={15} strokeWidth={2} aria-hidden />
                              <span>Expand</span>
                            </button>
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
                          </>
                        )}
                      </div>
                    </div>
                    <div className={styles.headerFilesContainer}>
                      {hasSelectedFile && (
                        <div className={styles.headerFilesHeader}>
                          <button
                            type="button"
                            className={styles.fileSelectionClearButton}
                            onClick={() =>
                              updateActiveWorkspace((current) => ({
                                ...current,
                                selectedFileId: null,
                              }))
                            }
                          >
                            Clear selection
                          </button>
                        </div>
                      )}
                      <UploadProjectFilesList
                        files={activeWorkspace.files}
                        uploadFilesViewMode={uploadFilesViewMode}
                        activeWorkspaceFileId={activeWorkspaceFileId}
                        ingestionFileReports={ingestionFileReports}
                        executionState={executionState}
                        updateActiveWorkspace={updateActiveWorkspace}
                        setIngestionReportSelectedId={setIngestionReportSelectedId}
                        setIngestionReportOpen={setIngestionReportOpen}
                        setWorkspaceFilePendingDelete={setWorkspaceFilePendingDelete}
                        setDeleteWorkspaceFileNameInput={setDeleteWorkspaceFileNameInput}
                        regionClassName={styles.uploadFilesScrollRegion}
                        emptyClassName={styles.emptyFilesStatePro}
                        emptyMessage="No files yet. Upload PDFs in the area above."
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.uploadWorkspacePipelineSection}>
                {executionState.visible && (
                  <div
                    className={classNames(styles.executionCard, styles.executionCardPro, {
                      [styles.executionCardRunning]: executionState.status === "running",
                      [styles.executionCardSuccess]: executionState.status === "success",
                      [styles.executionCardError]: executionState.status === "error",
                    })}
                  >
                    <div className={styles.executionCardHeader}>
                      <div>
                        <p className={styles.executionEyebrow}>Pipeline output</p>
                        <h3 className={styles.executionTitle}>{executionState.message}</h3>
                      </div>
                      <div className={styles.executionCardHeaderRight}>
                        {executionState.status !== "running" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={styles.executionBackToFilesButton}
                            onClick={() =>
                              updateActiveWorkspace((current) => ({
                                ...current,
                                execution: {
                                  ...current.execution,
                                  visible: false,
                                },
                              }))
                            }
                          >
                            Back to files
                          </Button>
                        )}
                        <span
                          className={classNames(styles.executionStatusBadge, {
                            [styles.executionStatusBadgeRunning]:
                              executionState.status === "running",
                            [styles.executionStatusBadgeSuccess]:
                              executionState.status === "success",
                            [styles.executionStatusBadgeError]:
                              executionState.status === "error",
                          })}
                        >
                          {executionStatusLabel}
                        </span>
                      </div>
                    </div>

                    <div className={styles.executionFileMeta}>
                      <span>{executionState.fileCode || "FILE"}</span>
                      <span>{executionState.fileName || selectedWorkspaceFile?.name || "Document"}</span>
                    </div>

                    <div className={styles.executionRuns}>
                      {(executionState.runs || []).map((run) => (
                        <div key={run.id} className={styles.executionRunCard}>
                          <div className={styles.executionRunHeader}>
                            <div className={styles.executionRunHeading}>
                              <strong>{run.label}</strong>
                              <span>{run.meta}</span>
                            </div>
                            {run.note && (
                              <span className={styles.executionRunNote}>Fallback</span>
                            )}
                          </div>

                          {run.note && (
                            <p className={styles.executionRunNotice}>{run.note}</p>
                          )}

                          <div className={styles.executionEventList}>
                            {(run.events || []).map((event) => (
                              <div
                                key={event.id}
                                className={classNames(styles.executionEventRow, {
                                  [styles.executionEventRowActive]:
                                    event.status === "active",
                                  [styles.executionEventRowComplete]:
                                    event.status === "completed",
                                  [styles.executionEventRowFailed]:
                                    event.status === "failed",
                                  [styles.executionEventRowPending]:
                                    event.status === "pending",
                                })}
                              >
                                <span
                                  className={classNames(styles.executionEventDot, {
                                    [styles.executionEventDotActive]:
                                      event.status === "active",
                                    [styles.executionEventDotComplete]:
                                      event.status === "completed",
                                    [styles.executionEventDotFailed]:
                                      event.status === "failed",
                                    [styles.executionEventDotPending]:
                                      event.status === "pending",
                                  })}
                                />
                                <p className={styles.executionEventMessage}>
                                  {event.message}
                                </p>
                                {event.countLabel && (
                                  <span className={styles.executionEventCount}>
                                    {event.countLabel}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {executionSummaryItems.length > 0 && (
                      <div className={styles.executionSummaryGrid}>
                        {executionSummaryItems.map((item) => (
                          <div key={item.label} className={styles.executionSummaryItem}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {executionState.details && (
                      <div className={styles.executionDetailsSection}>
                        <button
                          type="button"
                          className={styles.executionDetailsToggle}
                          onClick={() =>
                            updateActiveWorkspace((current) => ({
                              ...current,
                              execution: {
                                ...current.execution,
                                detailsOpen: !current.execution?.detailsOpen,
                              },
                            }))
                          }
                        >
                          {executionState.detailsOpen ? "Hide details" : "View details"}
                        </button>

                        <AnimatePresence initial={false}>
                          {executionState.detailsOpen && (
                            <motion.pre
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className={styles.executionDetails}
                            >
                              {JSON.stringify(executionState.details, null, 2)}
                            </motion.pre>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}

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

                {ingestionFileReports.length > 0 && executionState.status === "success" && (
                  <div className={styles.ingestionReportBanner}>
                    <Button
                      type="button"
                      variant="outline"
                      className={styles.ingestionReportOpenButton}
                      onClick={() => {
                        setIngestionReportSelectedId(null);
                        setIngestionReportOpen(true);
                      }}
                    >
                      View full ingestion report ({ingestionFileReports.length}{" "}
                      {ingestionFileReports.length === 1 ? "file" : "files"})
                    </Button>
                  </div>
                )}
                </div>

                <div className={styles.pipelineFooter}>
                  <Button
                    type="button"
                    size="lg"
                    className={styles.pipelineRunButton}
                    onClick={handleStartIngestion}
                    disabled={isPending || isProcessingFiles || !hasUploadedFiles}
                  >
                    <PlayCircle size={20} />
                    {isProcessingFiles ? "Pipeline running…" : "Run pipeline"}
                  </Button>
                  <p className={styles.pipelineCtaHintLatin}>
                    (chunk → embed → vector store). Required before chat.
                  </p>
                  {!hasUploadedFiles && (
                    <p className={styles.pipelineCtaNote}>Upload at least one PDF first.</p>
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
                    </div>
                  </header>
                  <div className={styles.uploadFilesExpandedFullPageBody}>
                    <UploadProjectFilesList
                      files={activeWorkspace.files}
                      uploadFilesViewMode={uploadFilesViewMode}
                      activeWorkspaceFileId={activeWorkspaceFileId}
                      ingestionFileReports={ingestionFileReports}
                      executionState={executionState}
                      updateActiveWorkspace={updateActiveWorkspace}
                      setIngestionReportSelectedId={setIngestionReportSelectedId}
                      setIngestionReportOpen={setIngestionReportOpen}
                      setWorkspaceFilePendingDelete={setWorkspaceFilePendingDelete}
                      setDeleteWorkspaceFileNameInput={setDeleteWorkspaceFileNameInput}
                      regionClassName={styles.uploadFilesExpandedScroll}
                      emptyClassName={styles.emptyFilesStatePro}
                      emptyMessage="No files."
                    />
                  </div>
                </div>
              )}

              {ingestionReportOpen && (
                <div
                  className={styles.ingestionReportBackdrop}
                  role="presentation"
                  onClick={() => setIngestionReportOpen(false)}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ingestion-report-title"
                    className={styles.ingestionReportModal}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles.ingestionReportModalHeader}>
                      <h2 id="ingestion-report-title" className={styles.ingestionReportModalTitle}>
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
                    <div className={styles.ingestionReportTabs}>
                      {(() => {
                        const activeReportId =
                          ingestionReportSelectedId ?? String(ingestionFileReports[0]?.id ?? "");
                        return ingestionFileReports.map((rep) => (
                        <button
                          key={rep.id}
                          type="button"
                          className={classNames(styles.ingestionReportTab, {
                            [styles.ingestionReportTabActive]: String(rep.id) === String(activeReportId),
                          })}
                          onClick={() => setIngestionReportSelectedId(String(rep.id))}
                        >
                          {rep.fileName}
                        </button>
                        ));
                      })()}
                    </div>
                    {(() => {
                      const activeId =
                        ingestionReportSelectedId ?? String(ingestionFileReports[0]?.id ?? "");
                      const active =
                        ingestionFileReports.find((r) => String(r.id) === String(activeId)) ||
                        ingestionFileReports[0] ||
                        null;
                      if (!active) return null;
                      return (
                        <div className={styles.ingestionReportBody}>
                          <dl className={styles.ingestionReportGrid}>
                            <div>
                              <dt>File</dt>
                              <dd>{active.fileName}</dd>
                            </div>
                            <div>
                              <dt>Code</dt>
                              <dd>{active.fileCode || "—"}</dd>
                            </div>
                            <div>
                              <dt>Total chunks</dt>
                              <dd>{formatNumber(active.chunkCount)}</dd>
                            </div>
                            <div>
                              <dt>Vectors stored</dt>
                              <dd>{formatNumber(active.vectorsStored)}</dd>
                            </div>
                            <div>
                              <dt>Processing time</dt>
                              <dd>
                                {active.processingTimeSeconds > 0
                                  ? `${Number(active.processingTimeSeconds).toFixed(2)}s`
                                  : "—"}
                              </dd>
                            </div>
                            <div>
                              <dt>Embedding</dt>
                              <dd>{active.embeddingLabel}</dd>
                            </div>
                            <div className={styles.ingestionReportSpanWide}>
                              <dt>Vector backends</dt>
                              <dd>{active.backends?.length ? active.backends.join(", ") : "—"}</dd>
                            </div>
                          </dl>
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
                  {entry.activityMessages?.length > 0 && (
                    <div className={styles.queryActivityStack}>
                      {entry.activityMessages.map((message) => (
                        <div
                          key={message.id}
                          className={classNames(styles.queryActivityBubble, {
                            [styles.queryActivityBubbleSuccess]:
                              message.tone === "success",
                            [styles.queryActivityBubbleWarning]:
                              message.tone === "warning",
                            [styles.queryActivityBubbleError]:
                              message.tone === "error",
                          })}
                        >
                          <span className={styles.queryActivityLabel}>Working</span>
                          <p>{message.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
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

              {queryActivityState.visible && activeWorkspace.phase === "query-processing" && (
                <div className={styles.queryActivityStack}>
                  {queryActivityState.messages.map((message) => (
                    <div
                      key={message.id}
                      className={classNames(styles.queryActivityBubble, {
                        [styles.queryActivityBubbleSuccess]:
                          message.tone === "success",
                        [styles.queryActivityBubbleWarning]:
                          message.tone === "warning",
                        [styles.queryActivityBubbleError]:
                          message.tone === "error",
                      })}
                    >
                      <span className={styles.queryActivityLabel}>Working</span>
                      <p>{message.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.queryDock}>
              <div className={styles.queryDockHeader}>
                <div className={styles.queryDockLabel}>Chat input</div>

              </div>
              <div className={classNames(styles.queryInputShell, styles.queryInputShellHero)}>
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
                    if (isChatInputDisabled) {
                      return;
                    }
                    if (event.key === "Enter") {
                      handleStartQuery();
                    }
                  }}
                  placeholder={
                    isChatInputDisabled
                      ? "Select an uploaded file to enable chat"
                      : "How can I help you today?"
                  }
                  className={classNames(styles.queryInput, styles.queryInputHero, {
                    [styles.queryInputDisabled]: isChatInputDisabled,
                  })}
                />

                <Button
                  className={classNames(styles.querySendButton, styles.querySendButtonHero)}
                  onClick={handleStartQuery}
                  title="Send query"
                  disabled={isChatInputDisabled}
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>

            {hasSelectedFile && (
              <div className={styles.querySelectedFileMeta}>
                <span className={styles.querySelectedFileCode}>
                  {activeWorkspace.files.find(
                    (file) => String(file.fileId) === activeWorkspaceFileId,
                  )?.fileCode || "FILE"}
                </span>
                <span className={styles.querySelectedFileName}>
                  {
                    activeWorkspace.files.find(
                      (file) => String(file.fileId) === activeWorkspaceFileId,
                    )?.name
                  }
                </span>
              </div>
            )}

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
        </main>

        {workspaceMode === "query" && (
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
                  {!perfLoading && !perfError && !perf && (
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
        )}
      </div>
    </div>
  );
};

export default ProjectCanvas;
