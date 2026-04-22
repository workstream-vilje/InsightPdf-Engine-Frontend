"use client";

import { formatBytes, formatNumber, formatProjectCode } from "./workspaceFormatters";
import {
  EMBEDDING_OPTIONS,
  VECTOR_STORE_OPTIONS,
  createWorkspaceState,
} from "@/lib/projects/data";

// ── Constants ────────────────────────────────────────────────────────────────

export const EXECUTION_STAGE_ORDER = ["chunking", "embedding", "vector-store"];

// ── Workspace state helpers ──────────────────────────────────────────────────

export const pruneWorkspaceDataForFiles = (workspace, backendFileIds) => {
  const allowedIds = new Set(Array.from(backendFileIds || []).map((id) => String(id)));
  const fileStillExists =
    workspace?.selectedFileId != null && allowedIds.has(String(workspace.selectedFileId));

  const conversation = (workspace?.conversation || []).filter((entry) => {
    if (entry?.fileId != null) return allowedIds.has(String(entry.fileId));
    return true;
  });

  const responseVariants = fileStillExists
    ? (workspace?.responseVariants || []).filter((variant) => {
        if (variant?.fileId != null) return allowedIds.has(String(variant.fileId));
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
    agentReport: fileStillExists ? workspace?.agentReport || null : null,
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

export const mapUploadedFileToWorkspaceFile = (file, category) => ({
  id: String(file?.id ?? `${file?.file_name}-${Date.now()}`),
  name: file?.file_name || "Unknown file",
  fileCode: file?.file_code || null,
  size: formatBytes(file?.file_size || 0),
  category: category || "General",
  fileId: file?.id ?? null,
  fileType: file?.file_type || null,
  pages: file?.pages_count ?? file?.pagesCount ?? file?.pages ?? null,
  allowedTechniques: file?.allowed_techniques || null,
  processed: Boolean(file?.allowed_techniques),
});

export const sanitizeWorkspaceQueryState = (workspace) => ({
  ...workspace,
  phase:
    workspace?.phase === "query-processing" || workspace?.phase === "query-complete"
      ? "query-ready"
      : workspace?.phase,
  submittedQuery: "",
  response: "",
  responseVisible: false,
  responseVariants: [],
  experimentId: null,
  agentReport: null,
  visibleLines: [],
  retrievedChunks: [],
  queryActivity: { visible: false, status: "idle", messages: [] },
  conversation: [],
});

/** One row per backend file id; first occurrence wins (order-stable). */
export const dedupeWorkspaceFilesByFileId = (files) => {
  const seen = new Set();
  const out = [];
  for (const f of files || []) {
    const id = f?.fileId != null ? String(f.fileId) : null;
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    out.push(f);
  }
  return out;
};

// ── Project mapping ──────────────────────────────────────────────────────────

export const resolveProjectDocumentId = (project) =>
  project?.document_id ||
  project?.document_code ||
  project?.doc_id ||
  project?.doc_code ||
  project?.latest_document_id ||
  project?.latest_document_code ||
  null;

export const mapBackendProjectToCanvasProject = (project) => ({
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

// ── Execution run builders ───────────────────────────────────────────────────

const toExecutionList = (value, fallback = []) => {
  if (Array.isArray(value)) return value.length ? value : fallback;
  if (value == null || value === "") return fallback;
  return [value];
};

const formatExecutionCountLabel = (count, label) => {
  const numeric = Number(count);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return `${formatNumber(numeric)} ${label}`;
};

const normalizeFallbackLabel = (usedMethod) => {
  const normalized = String(usedMethod || "").replace(/\s*\(fallback\)\s*/gi, "").trim();
  return normalized || usedMethod;
};

export const buildExecutionRuns = ({ workspace, targetFile, response = null, activeStage = "chunking", failed = false }) => {
  const { processingConfig } = buildSharedPipelineConfig(workspace);
  const data = response?.data || {};
  const comparisonResults = Array.isArray(data.comparison_results) ? data.comparison_results : null;
  const normalizedActiveStage = EXECUTION_STAGE_ORDER.includes(activeStage) ? activeStage : "chunking";
  const activeStageIndex = EXECUTION_STAGE_ORDER.indexOf(normalizedActiveStage);
  const fileName = targetFile?.name || data?.document?.name || "Document";
  const configuredSplitters = toExecutionList(processingConfig?.text_processing?.splitter, ["recursive"]);
  const configuredMethods = toExecutionList(processingConfig?.data_extraction?.method, ["pymupdf"]);
  const configuredEmbedding = [processingConfig?.embeddings?.provider, processingConfig?.embeddings?.model].filter(Boolean).join("/");
  const configuredVectorStores = toExecutionList(processingConfig?.vector_store?.backends || processingConfig?.vector_store?.backend, ["faiss"]);

  if (response) {
    return (comparisonResults?.length ? comparisonResults : [data]).map((result, index) => {
      const requestedMethod = result?.processing?.extraction?.requested_method || result?.technique?.extraction_method || configuredMethods[0] || "pymupdf";
      const usedMethod = result?.processing?.extraction?.used_method || requestedMethod;
      const splitter = result?.processing?.text_processing?.splitter || result?.technique?.splitter || configuredSplitters[0] || "recursive";
      const chunkCount = Number(result?.chunks?.total || 0);
      const vectorStores = result?.vector_store?.stores || [];
      const storedVectors = vectorStores.reduce((total, store) => total + Number(store?.vectors_stored || 0), 0);
      const backends = vectorStores.map((store) => store?.backend).filter(Boolean);
      const embeddingProvider = result?.embedding?.provider;
      const embeddingModel = result?.embedding?.model;
      const embeddingLabel = [embeddingProvider, embeddingModel].filter(Boolean).join("/");
      const fallbackTarget = normalizeFallbackLabel(usedMethod);
      const hasFallback = requestedMethod && usedMethod && requestedMethod.toLowerCase() !== fallbackTarget.toLowerCase();

      return {
        id: `run-${index + 1}`,
        label: comparisonResults?.length ? `Run ${index + 1}` : "Execution",
        meta: `Extraction: ${requestedMethod}`,
        note: hasFallback ? `${requestedMethod} fell back to ${fallbackTarget}.` : null,
        events: [
          { id: `run-${index + 1}-chunking`, status: "completed", message: `Chunking completed for '${fileName}'. Created ${formatNumber(chunkCount)} chunks using '${splitter}'.`, countLabel: formatExecutionCountLabel(chunkCount, "chunks") },
          ...(embeddingLabel ? [{ id: `run-${index + 1}-embedding`, status: "completed", message: `Embedding completed for '${fileName}'. Generated ${formatNumber(chunkCount)} embeddings with provider '${embeddingProvider}' and model '${embeddingModel}'.`, countLabel: formatExecutionCountLabel(chunkCount, "embeddings") }] : []),
          ...(backends.length > 0 ? [{ id: `run-${index + 1}-vector-store`, status: "completed", message: `Vector store completed for '${fileName}'. Stored ${formatNumber(storedVectors)} vectors in backend(s): ${backends.join(", ")}.`, countLabel: formatExecutionCountLabel(storedVectors, "vectors") }] : []),
        ],
      };
    });
  }

  return configuredMethods.map((method, runIndex) => ({
    id: `run-${runIndex + 1}`,
    label: configuredMethods.length > 1 ? `Run ${runIndex + 1}` : "Execution",
    meta: `Extraction: ${method}`,
    note: null,
    events: [
      {
        id: `run-${runIndex + 1}-chunking`,
        status: runIndex === 0 ? (failed && activeStageIndex === 0 ? "failed" : activeStageIndex > 0 ? "completed" : "active") : "pending",
        message: `Chunking '${fileName}' with '${configuredSplitters[0] || "recursive"}'.`,
        countLabel: null,
      },
      ...(configuredEmbedding ? [{
        id: `run-${runIndex + 1}-embedding`,
        status: runIndex === 0 ? (failed && activeStageIndex === 1 ? "failed" : activeStageIndex > 1 ? "completed" : activeStageIndex === 1 ? "active" : "pending") : "pending",
        message: `Generating embeddings with '${configuredEmbedding}'.`,
        countLabel: null,
      }] : []),
      ...(configuredVectorStores.length > 0 ? [{
        id: `run-${runIndex + 1}-vector-store`,
        status: runIndex === 0 ? (failed && activeStageIndex === 2 ? "failed" : activeStageIndex === 2 ? "active" : "pending") : "pending",
        message: `Storing vectors in backend(s): ${configuredVectorStores.join(", ")}.`,
        countLabel: null,
      }] : []),
    ],
  }));
};

export const buildExecutionSummary = ({ response, targetFile, workspace }) => {
  const data = response?.data || {};
  const comparisonResults = Array.isArray(data.comparison_results) ? data.comparison_results : null;
  const primaryData = comparisonResults?.[0] || data;
  const vectorStores = primaryData?.vector_store?.stores || [];
  const vectorsStored = vectorStores.reduce((total, store) => total + Number(store?.vectors_stored || 0), 0);
  const chunkTotal = Number(primaryData?.chunks?.total || 0);
  const previewCount = Number(primaryData?.chunks?.preview_count || 0);
  const embeddingLabel = primaryData?.embedding ? `${primaryData.embedding.provider}/${primaryData.embedding.model}` : null;
  const processingTime = Number(primaryData?.performance?.processing_time_seconds || 0);

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
    vectorBackends: vectorStores.map((store) => store?.backend).filter(Boolean),
    vectorsStored,
    processingTime,
    comparisonCount: comparisonResults?.length || 0,
    detailsOpen: false,
    details: {
      document: data?.document || primaryData?.document || null,
      processing: primaryData?.processing || null,
      embedding: primaryData?.embedding || null,
      vector_store: primaryData?.vector_store ? { stores: vectorStores.map((store) => ({ backend: store?.backend || null, collection_name: store?.collection_name || store?.collection || null, vectors_stored: Number(store?.vectors_stored || 0) })) } : null,
      chunks: { total: chunkTotal, preview_count: previewCount },
      performance: primaryData?.performance || null,
      comparison_runs: comparisonResults?.length || 0,
    },
    runs: buildExecutionRuns({ workspace, targetFile, response, activeStage: "vector-store" }),
  };
};

export const buildBatchExecutionSummary = ({ responses, files, workspace }) => {
  const safeResponses = Array.isArray(responses) ? responses.filter(Boolean) : [];
  const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  const totalFiles = safeFiles.length;
  const batchLabel = totalFiles === 1 ? safeFiles[0]?.name || "Document" : `${totalFiles} files processed`;

  const chunkCount = safeResponses.reduce((total, response) => {
    const data = response?.data || {};
    const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
    return total + Number((comparisonResults?.[0] || data)?.chunks?.total || 0);
  }, 0);

  const vectorsStored = safeResponses.reduce((total, response) => {
    const data = response?.data || {};
    const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
    const primaryData = comparisonResults?.[0] || data;
    return total + (primaryData?.vector_store?.stores || []).reduce((s, store) => s + Number(store?.vectors_stored || 0), 0);
  }, 0);

  const processingTime = safeResponses.reduce((total, response) => {
    const data = response?.data || {};
    const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
    return total + Number((comparisonResults?.[0] || data)?.performance?.processing_time_seconds || 0);
  }, 0);

  const comparisonCount = safeResponses.reduce((total, response) => {
    const data = response?.data || {};
    const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
    return total + (comparisonResults?.length || 1);
  }, 0);

  const vectorBackends = Array.from(new Set(safeResponses.flatMap((response) => {
    const data = response?.data || {};
    const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
    return ((comparisonResults?.[0] || data)?.vector_store?.stores || []).map((store) => store?.backend).filter(Boolean);
  })));

  const embeddingLabels = Array.from(new Set(safeResponses.map((response) => {
    const data = response?.data || {};
    const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
    const primaryData = comparisonResults?.[0] || data;
    return primaryData?.embedding ? `${primaryData.embedding.provider}/${primaryData.embedding.model}` : null;
  }).filter(Boolean)));

  const runs = safeResponses.flatMap((response, index) => {
    const file = safeFiles[index] || null;
    return buildExecutionRuns({ workspace, targetFile: file, response, activeStage: "vector-store" }).map((run, runIndex) => ({
      ...run,
      id: `${file?.fileId || index}-run-${runIndex + 1}`,
      label: totalFiles > 1 ? `${file?.name || `File ${index + 1}`} · ${run.label}` : run.label,
      events: (run.events || []).map((event, eventIndex) => ({ ...event, id: `${file?.fileId || index}-event-${eventIndex + 1}` })),
    }));
  });

  return {
    visible: true,
    status: "success",
    stage: "completed",
    message: totalFiles > 1 ? `Processed ${totalFiles} files successfully.` : "Document processed successfully",
    fileId: totalFiles === 1 ? Number(safeFiles[0]?.fileId || 0) || null : null,
    fileCode: totalFiles === 1 ? safeFiles[0]?.fileCode || null : `${totalFiles} FILES`,
    fileName: batchLabel,
    chunkCount,
    previewCount: null,
    embedding: embeddingLabels.length === 1 ? embeddingLabels[0] : embeddingLabels.length > 1 ? `${embeddingLabels.length} embedding configs` : null,
    vectorBackends,
    vectorsStored,
    processingTime,
    comparisonCount,
    detailsOpen: false,
    details: { files: safeFiles.map((file, index) => ({ fileId: file?.fileId ?? null, fileCode: file?.fileCode || null, fileName: file?.name || `File ${index + 1}`, result: safeResponses[index]?.data || null })) },
    runs,
  };
};

// ── Pipeline config builders ─────────────────────────────────────────────────

export const buildSharedPipelineConfig = (workspace) => {
  const normalizedVectorStores = (workspace.vectorStores || []).filter((v) => ["chromadb", "pgvector", "faiss", "pinecone"].includes(v));
  const normalizedTextProcessing = (workspace.textProcessing || []).filter((v) => ["recursive", "semantic", "token", "fixed"].includes(v));
  const embeddingProvider = workspace.embeddingModels.includes("ollama-nomic-embed") ? "ollama" : "openai";
  const embeddingModel = embeddingProvider === "ollama" ? "nomic-embed-text" : "text-embedding-3-large";
  const normalizedExtractionMethods = (workspace.dataExtraction || []).filter((v) => ["pymupdf", "unstructured", "pdfplumber"].includes(v));

  const processingConfig = {
    text_processing: {
      chunk_size: Number(workspace.chunkLength) || 1000,
      chunk_overlap: 50,
      splitter: normalizedTextProcessing.length > 1 ? normalizedTextProcessing : normalizedTextProcessing[0] || "recursive",
    },
    data_extraction: {
      method: normalizedExtractionMethods.length > 1 ? normalizedExtractionMethods : normalizedExtractionMethods[0] || "pymupdf",
    },
    embeddings: { provider: embeddingProvider, model: embeddingModel },
    vector_store: { backends: normalizedVectorStores.length ? normalizedVectorStores : ["faiss"], collection_name: "insightpdf_chunks" },
  };

  const queryConfig = {
    retrieval_strategy: {
      top_k: Math.max(1, Number(workspace.topK) || 3),
      search_type: (() => {
        const selected = (workspace.retrievalStrategies || [])[0] || "semantic-similarity";
        if (selected === "hybrid-search") return "hybrid";
        if (selected === "keyword-search") return "keyword";
        if (selected === "mmr") return "mmr";
        return "similarity";
      })(),
      vector_db: processingConfig.vector_store.backends.length > 1 ? processingConfig.vector_store.backends : processingConfig.vector_store.backends[0],
      collection_name: processingConfig.vector_store.collection_name,
    },
    embedding: { provider: processingConfig.embeddings.provider, model: processingConfig.embeddings.model },
    llm: { provider: workspace?.selectedLlmModel === "llama3.2" ? "ollama" : "openai", model: workspace?.selectedLlmModel || "gpt-4o-mini", temperature: 0.2 },
    self_reflection: { enabled: true, max_retries: 2, retrieval_top_k_step: 2 },
  };

  return { processingConfig, queryConfig };
};

export const buildQueryPayload = ({ projectId, fileId, fileName, workspace, query }) => {
  const { queryConfig } = buildSharedPipelineConfig(workspace);
  const queryConfigurations = workspace?.queryConfigurations || [];
  const agentEnabled = queryConfigurations.includes("agent");
  return {
    project_id: Number(projectId),
    file_id: Number(fileId),
    query: query.trim(),
    agent: agentEnabled,
    regas_activation: queryConfigurations.includes("ragas"),
    langsmith_activation: queryConfigurations.includes("langsmith"),
    config: { ...queryConfig, retrieval_strategy: { ...queryConfig.retrieval_strategy, source_name: fileName || null } },
  };
};

// ── RAGAS / quality metrics ──────────────────────────────────────────────────

const toPercentMetric = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return Math.max(0, Math.min(100, numericValue <= 1 ? numericValue * 100 : numericValue));
};

import { DEFAULT_QUALITY_METRICS } from "@/lib/projects/data";

export const buildRagasQualityMetrics = (result) => {
  const ragas = result?.ragas || {};
  const metrics = [
    { label: "Faithfulness", value: toPercentMetric(result?.faithfulness ?? ragas?.faithfulness) },
    { label: "Context precision", value: toPercentMetric(result?.context_precision ?? ragas?.context_precision) },
    { label: "Context recall", value: toPercentMetric(result?.context_recall ?? ragas?.context_recall) },
    { label: "Answer relevance", value: toPercentMetric(result?.answer_relevance ?? ragas?.answer_relevance) },
  ].filter((metric) => metric.value !== null);
  return metrics.length > 0 ? metrics : DEFAULT_QUALITY_METRICS;
};

const coerceAllowedTechniquesArray = (value) => (Array.isArray(value) ? value : []);

export const buildUsedStrategiesSummary = (workspace) => {
  const { processingConfig, queryConfig } = buildSharedPipelineConfig(workspace);
  const extractionMethod = processingConfig?.data_extraction?.method;
  const vectorDb = queryConfig?.retrieval_strategy?.vector_db;
  const embeddingLabel = queryConfig?.embedding ? `${queryConfig.embedding.provider}/${queryConfig.embedding.model}` : null;
  return [
    { label: "Retrieval", value: (workspace?.retrievalStrategies || []).join(", ") || queryConfig?.retrieval_strategy?.search_type },
    { label: "Vector DB", value: Array.isArray(vectorDb) ? vectorDb.join(", ") : vectorDb },
    { label: "Embedding", value: embeddingLabel },
    { label: "Splitter", value: Array.isArray(workspace?.textProcessing) ? workspace.textProcessing.join(", ") : workspace?.textProcessing },
    { label: "Extraction", value: Array.isArray(extractionMethod) ? extractionMethod.join(", ") : extractionMethod },
  ].filter((item) => item.value);
};

export const buildVariantStrategiesSummary = (workspace, result, allowedTechniques = null) => {
  const persistedStrategies = allowedTechniques
    ? [
        { label: "Splitter", value: coerceAllowedTechniquesArray(allowedTechniques?.splitters).join(", ") },
        { label: "Extraction", value: coerceAllowedTechniquesArray(allowedTechniques?.data_extraction_methods).join(", ") },
        { label: "Embedding", value: coerceAllowedTechniquesArray(allowedTechniques?.embeddings).map((item) => `${item.provider}/${item.model}`).join(", ") },
      ].filter((item) => item.value)
    : buildUsedStrategiesSummary(workspace).filter((item) => item.label !== "Vector DB");

  return [
    { label: "Vector DB", value: result?.db || result?.vector_db || null },
    { label: "Retrieval", value: result?.retrieval || (workspace?.retrievalStrategies || []).join(", ") },
    { label: "Time", value: result?.total_time != null ? `${(Number(result.total_time || 0) / 1000).toFixed(2)}s` : null },
    ...persistedStrategies.filter((item) => item.label !== "Retrieval"),
  ].filter((item) => item.value);
};

// ── Allowed technique option filters ────────────────────────────────────────

export const getAllowedVectorStoreOptions = (allowedTechniques) => {
  const allowed = new Set(coerceAllowedTechniquesArray(allowedTechniques?.vector_stores).map(String));
  return VECTOR_STORE_OPTIONS.filter((option) => allowed.has(option.value));
};

export const getAllowedEmbeddingOptions = (allowedTechniques) => {
  const embeddings = coerceAllowedTechniquesArray(allowedTechniques?.embeddings);
  const allowedValues = new Set();
  embeddings.forEach((item) => {
    const provider = String(item?.provider || "").toLowerCase();
    const model = String(item?.model || "").toLowerCase();
    if (provider === "openai") allowedValues.add("openai");
    if (provider === "ollama" || model === "nomic-embed-text") allowedValues.add("ollama-nomic-embed");
    if (model === "text-embedding-3-large") allowedValues.add("text-embedding-3-large");
  });
  return EMBEDDING_OPTIONS.filter((option) => allowedValues.has(option.value));
};
