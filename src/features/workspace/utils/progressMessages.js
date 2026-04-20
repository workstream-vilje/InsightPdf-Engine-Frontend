"use client";

import { formatMs, formatNumber } from "./workspaceFormatters";

// ── Phase constants ──────────────────────────────────────────────────────────

export const PHASE_UNDERSTAND = "understand";
export const PHASE_SEARCH = "search";
export const PHASE_GENERATE = "generate";
export const PHASE_DONE = "done";

// ── Activity message factory ─────────────────────────────────────────────────

export const createActivityMessage = (id, text, tone = "info") => ({ id, text, tone, raw: text });

// ── Progress message transformer ─────────────────────────────────────────────

/**
 * Transform raw backend log strings into human-readable progress messages.
 * Returns { label, phase, tone } or null to suppress the message.
 */
export const transformProgressMessage = (raw) => {
  const s = String(raw || "").toLowerCase().trim();

  if (s.includes("starting rag query") || s.includes("start query"))
    return { label: "Understanding your question…", phase: PHASE_UNDERSTAND, tone: "info" };
  if (s.includes("embedding the question") || s.includes("embed query") || s.includes("embedding query"))
    return { label: "Analyzing your question to find the best matches…", phase: PHASE_UNDERSTAND, tone: "info" };

  if (s.includes("searching") || s.includes("searching faiss") || s.includes("searching chroma") || s.includes("searching pgvector") || s.includes("searching pinecone"))
    return { label: "Searching through your documents…", phase: PHASE_SEARCH, tone: "info" };
  if (/retrieved\s+0\s+chunk/.test(s) || s.includes("no relevant chunks"))
    return { label: "No strong matches yet — trying a deeper search…", phase: PHASE_SEARCH, tone: "warning" };
  const chunkMatch = s.match(/retrieved\s+(\d+)\s+chunk/);
  if (chunkMatch) {
    const n = chunkMatch[1];
    return { label: `Found ${n} relevant passage${n === "1" ? "" : "s"} from your document.`, phase: PHASE_SEARCH, tone: "info" };
  }
  if (s.includes("retrying") || s.includes("retry") || s.includes("higher top_k") || s.includes("increasing top_k"))
    return { label: "Trying a deeper search for better results…", phase: PHASE_SEARCH, tone: "warning" };
  if (s.includes("max retries") || s.includes("max retry"))
    return { label: "Could not find strong matches — generating the best possible answer…", phase: PHASE_GENERATE, tone: "warning" };
  if (s.includes("retrieval") && s.includes("finish"))
    return { label: "Document search complete.", phase: PHASE_SEARCH, tone: "info" };

  if (s.includes("generating") || s.includes("llm") || s.includes("language model") || s.includes("generating answer"))
    return { label: "Generating your answer…", phase: PHASE_GENERATE, tone: "info" };
  if (s.includes("validat") && !s.includes("writing"))
    return { label: "Reviewing the answer for accuracy…", phase: PHASE_GENERATE, tone: "info" };
  if (s.includes("reflection") && s.includes("accepted"))
    return { label: "Answer looks good — finalizing…", phase: PHASE_GENERATE, tone: "success" };
  if (s.includes("reflection") && (s.includes("rejected") || s.includes("retry")))
    return { label: "Improving the answer quality…", phase: PHASE_GENERATE, tone: "warning" };
  if (s.includes("generation") && s.includes("retry"))
    return { label: "Refining the answer with better context…", phase: PHASE_GENERATE, tone: "info" };

  if (s.includes("writing experiment") || s.includes("saving") || s.includes("experiment log"))
    return { label: "Saving your results…", phase: PHASE_DONE, tone: "info" };
  if (s.includes("completed") || s.includes("finished") || s.includes("done"))
    return { label: "All done!", phase: PHASE_DONE, tone: "success" };

  // Suppress purely technical noise
  if (
    s.includes("token") || s.includes("experiment_id") || s.includes("experiment id") ||
    s.includes("agent trace") || s.includes("validator output") ||
    /\[faiss\]|\[chroma\]|\[pgvector\]|\[pinecone\]/i.test(raw) ||
    /project_id=\d+/.test(s) || /file_id=\d+/.test(s)
  ) return null;

  // Fallback: clean up and show
  let cleaned = raw
    .replace(/\[faiss\]|\[chroma\]|\[pgvector\]|\[pinecone\]/gi, "")
    .replace(/project_id=\d+,?\s*/gi, "")
    .replace(/file_id=\d+,?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned) return null;
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return { label: cleaned, phase: PHASE_SEARCH, tone: "info" };
};

// ── Query activity message builder ───────────────────────────────────────────

export const buildQueryActivityMessages = ({ response, targetFile }) => {
  const results =
    Array.isArray(response?.comparison_results) && response.comparison_results.length > 0
      ? response.comparison_results
      : response ? [response] : [];
  const messages = [];

  if (results.length > 1) {
    messages.push(createActivityMessage(
      "comparison-summary",
      `Compared ${results.length} vector stores for '${targetFile?.name || "this document"}'.`,
    ));
  }

  results.forEach((result, index) => {
    const dbLabel = result?.db || result?.retrieval || `run-${index + 1}`;
    const chunkCount = Array.isArray(result?.chunks) ? result.chunks.length : 0;
    const retrievalTime = result?.retrieval_time != null ? formatMs(result.retrieval_time) : null;
    const llmTime = result?.llm_gen_time != null ? formatMs(result.llm_gen_time) : null;
    const totalTime = result?.total_time != null ? formatMs(result.total_time) : null;
    const accepted = typeof result?.reflection?.accepted === "boolean"
      ? result.reflection.accepted
      : Number(result?.accuracy || 0) >= 1;

    if (retrievalTime) messages.push(createActivityMessage(`${dbLabel}-retrieval`, `${dbLabel}: retrieved ${formatNumber(chunkCount)} chunks in ${retrievalTime}.`));
    if (llmTime) messages.push(createActivityMessage(`${dbLabel}-generation`, `${dbLabel}: generated and reviewed the answer in ${llmTime}.`));
    if (totalTime) messages.push(createActivityMessage(`${dbLabel}-complete`, `${dbLabel}: completed in ${totalTime} and ${accepted ? "passed validation" : "needs review"}.`, accepted ? "success" : "warning"));
  });

  return messages;
};
