"use client";

import { formatNumber } from "./workspaceFormatters";

// ── Ingestion report data helpers ────────────────────────────────────────────

export const mapProcessResultToIngestionReport = (entry, index) => {
  const data = entry?.result || {};
  const comparisonResults = Array.isArray(data?.comparison_results) ? data.comparison_results : null;
  const primaryData = comparisonResults?.[0] || data;
  const chunkTotal = Number(primaryData?.chunks?.total || 0);
  const vectorStores = primaryData?.vector_store?.stores || [];
  const vectorsStored = vectorStores.reduce((t, s) => t + Number(s?.vectors_stored || 0), 0);
  const processingTime = Number(primaryData?.performance?.processing_time_seconds || 0);
  const emb = primaryData?.embedding;
  const embeddingLabel = emb ? [emb.provider, emb.model].filter(Boolean).join(" / ") : "—";
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

export const buildFallbackIngestionReportFromFile = (file) => {
  if (file?.fileId == null) return null;
  if (!Boolean(file.processed || file.allowedTechniques)) return null;
  const emb = file.allowedTechniques?.embeddings?.[0];
  const embeddingLabel = emb ? [emb.provider, emb.model].filter(Boolean).join(" / ") : "—";
  const backends = Array.isArray(file.allowedTechniques?.vector_stores)
    ? file.allowedTechniques.vector_stores.filter(Boolean)
    : [];
  return {
    id: String(file.fileId),
    fileId: file.fileId,
    fileName: file.name || "File",
    fileCode: file.fileCode || null,
    chunkCount: 0,
    vectorsStored: 0,
    processingTimeSeconds: 0,
    embeddingLabel,
    backends,
    metricsIncomplete: true,
  };
};

export const mergeIngestionFileReports = (executionDetails, workspaceFiles) => {
  const fromExecution = Array.isArray(executionDetails?.files)
    ? executionDetails.files.map((entry, index) => mapProcessResultToIngestionReport(entry, index))
    : [];
  const byFileId = new Map();
  for (const file of workspaceFiles || []) {
    if (file?.fileId != null && file?.ingestionReportSnapshot) {
      byFileId.set(String(file.fileId), file.ingestionReportSnapshot);
    }
  }
  for (const rep of fromExecution) {
    if (rep?.fileId != null) byFileId.set(String(rep.fileId), rep);
  }
  for (const file of workspaceFiles || []) {
    if (file?.fileId == null) continue;
    const id = String(file.fileId);
    if (!byFileId.has(id)) {
      const fallback = buildFallbackIngestionReportFromFile(file);
      if (fallback) byFileId.set(id, fallback);
    }
  }
  const ordered = [];
  const seen = new Set();
  for (const file of workspaceFiles || []) {
    if (file?.fileId == null) continue;
    const rep = byFileId.get(String(file.fileId));
    if (rep) { ordered.push(rep); seen.add(String(file.fileId)); }
  }
  for (const [id, rep] of byFileId) {
    if (!seen.has(id)) ordered.push(rep);
  }
  return ordered;
};

export const getWorkspaceFileForReport = (rep, files) =>
  files?.find((f) => f?.fileId != null && String(f.fileId) === String(rep?.fileId)) ?? null;

// ── CSV export ───────────────────────────────────────────────────────────────

const escapeCsvCell = (value) => {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const buildIngestionReportCsv = (reports, workspaceFiles) => {
  const headers = ["file_name", "file_code", "pages", "size", "category", "total_chunks", "vectors_stored", "processing_time_s", "embedding", "vector_backends", "metrics_status"];
  const lines = [headers.join(",")];
  for (const rep of reports) {
    const wf = getWorkspaceFileForReport(rep, workspaceFiles);
    const pages = wf ? wf.pages ?? wf.pagesCount ?? wf.pages_count ?? "" : "";
    const row = [
      rep.fileName, rep.fileCode ?? "", pages, wf?.size ?? "", wf?.category ?? "",
      rep.metricsIncomplete ? "" : rep.chunkCount,
      rep.metricsIncomplete ? "" : rep.vectorsStored,
      rep.metricsIncomplete ? "" : rep.processingTimeSeconds,
      rep.embeddingLabel ?? "",
      rep.backends?.length ? rep.backends.join("; ") : "",
      rep.metricsIncomplete ? "partial" : "full",
    ].map(escapeCsvCell);
    lines.push(row.join(","));
  }
  return lines.join("\r\n");
};
