/**
 * Mock data for the Dashboard screen.
 */

export const DASHBOARD_FILES = [
  { name: "annual_report_2024.pdf", pages: 42, size: "3.2 MB", category: "Financial" },
  { name: "technical_spec_v2.pdf", pages: 18, size: "1.1 MB", category: "Technical" },
];

export const DASHBOARD_MESSAGES = [
  { role: "user", content: "What is the revenue growth for Q4 2024?" },
  { role: "assistant", content: "Based on the annual report, revenue grew 23.4% YoY in Q4 2024, reaching $4.2B. This was primarily driven by enterprise segment growth of 31% and cloud services expansion. The gross margin improved to 68.2%, up from 64.8% in Q4 2023." },
];

export const DASHBOARD_EXPERIMENTS = [
  { id: "EXP-001", llm: "GPT-4", embedding: "OpenAI", db: "PGVector", retrieval: "Semantic", accuracy: 92, latency: 1.3 },
  { id: "EXP-002", llm: "GPT-4", embedding: "OpenAI", db: "FAISS", retrieval: "Semantic", accuracy: 88, latency: 0.8 },
  { id: "EXP-003", llm: "Claude", embedding: "Anthropic", db: "PGVector", retrieval: "MMR", accuracy: 90, latency: 1.5 },
  { id: "EXP-004", llm: "GPT-4.1", embedding: "OpenAI", db: "PostgreSQL", retrieval: "Hybrid", accuracy: 85, latency: 1.1 },
  { id: "EXP-005", llm: "Ollama", embedding: "MiniLM", db: "FAISS", retrieval: "Semantic", accuracy: 78, latency: 0.6 },
];

export const COMPARISON_DATA = [
  { strategy: "Recursive Text Splitting", chunkSize: 1000, overlap: 200, chunks: 7, accuracy: 82, relevance: 81, latency: 1.84, cost: 0.0083, memory: "21.7 MB" },
  { strategy: "Semantic Chunking", chunkSize: 1000, overlap: 200, chunks: 7, accuracy: 86, relevance: 82, latency: 0.61, cost: 0.0101, memory: "14.8 MB", winner: true },
];

export const TRACING_DATA = [
  { step: "Document Loader", time: "0.12s", status: "success", detail: "PDF: annual_report_2024.pdf" },
  { step: "Text Splitter (1000/200)", time: "0.08s", status: "success", detail: "Strategy: Recursive" },
  { step: "Embedding Generation", time: "0.21s", status: "success", detail: "Model: text-embedding-3-small" },
  { step: "Vector Store Upsert", time: "0.15s", status: "success", detail: "Database: PGVector" },
  { step: "Similarity Search (k=3)", time: "0.38s", status: "success", detail: "K: 3 | Threshold: 0.85" },
  { step: "LLM Generation (GPT-4)", time: "0.72s", status: "success", detail: "Model: GPT-4o-mini" },
];

export const CHUNK_ACCURACY_DATA = [
  { size: 256, recursive: 65, semantic: 72 },
  { size: 512, recursive: 72, semantic: 80 },
  { size: 1000, recursive: 82, semantic: 92 },
  { size: 2000, recursive: 80, semantic: 88 },
  { size: 4000, recursive: 75, semantic: 82 },
];

export const CHUNK_LATENCY_DATA = [
  { count: 5, recursive: 0.35, semantic: 0.25 },
  { count: 10, recursive: 0.72, semantic: 0.45 },
  { count: 15, recursive: 1.15, semantic: 0.90 },
  { count: 20, recursive: 1.62, semantic: 1.35 },
  { count: 25, recursive: 1.84, semantic: 1.80 },
];

export const RESPONSE_CHART_DATA = [
  { name: "PGVector", time: 1.3, accuracy: 92 },
  { name: "FAISS", time: 0.8, accuracy: 88 },
  { name: "PostgreSQL", time: 1.1, accuracy: 85 },
];

export const QUALITY_RADAR_DATA = [
  { subject: 'Accuracy', A: 92, B: 85, fullMark: 100 },
  { subject: 'Relevance', A: 88, B: 80, fullMark: 100 },
  { subject: 'Speed', A: 95, B: 75, fullMark: 100 },
];
export const RETRIEVED_CHUNKS = [
  { text: "Revenue grew 23.4% year-over-year in Q4 2024, reaching $4.2B driven by...", page: 12, score: 0.94 },
  { text: "Enterprise segment showed strongest performance with 31% growth, cloud services...", page: 15, score: 0.89 },
  { text: "Gross margin improved to 68.2% in Q4 2024, compared to 64.8% in Q4 2023...", page: 18, score: 0.86 },
];

export const ACCURACY_METRICS = [
  { label: "Faithfulness", value: 92 },
  { label: "Context Precision", value: 88 },
  { label: "Context Recall", value: 85 },
  { label: "Answer Relevance", value: 91 },
];
