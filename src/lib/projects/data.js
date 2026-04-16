export const DATA_EXTRACTION_OPTIONS = [
  { value: "pymupdf", label: "PyMuPDF" },
  { value: "unstructured", label: "Unstructured" },
  { value: "pdfplumber", label: "PDFPlumber" },
];

export const TEXT_PROCESSING_OPTIONS = [
  { value: "recursive", label: "Recursive splitter" },
  { value: "semantic", label: "Semantic splitter" },
  { value: "token", label: "Token splitter" },
  { value: "fixed", label: "Fixed-length splitter" },
];

export const EMBEDDING_OPTIONS = [
  { value: "text-embedding-3-large", label: "OpenAI text-embedding-3-large" },
  { value: "ollama-nomic-embed", label: "Ollama nomic-embed-text" },
];

export const VECTOR_STORE_OPTIONS = [
  { value: "faiss", label: "FAISS" },
  { value: "chromadb", label: "ChromaDB" },
  { value: "pgvector", label: "PgVector" },
  { value: "pinecone", label: "Pinecone" },
];

export const RETRIEVAL_STRATEGY_OPTIONS = [
  { value: "semantic-similarity", label: "Semantic similarity" },
  { value: "hybrid-search", label: "Hybrid search" },
  { value: "mmr", label: "MMR reranking" },
  { value: "keyword-search", label: "Keyword search" },
];

export const QUERY_CONFIGURATION_OPTIONS = [
  { value: "agent", label: "Agent" },
  { value: "ragas", label: "Ragas" },
  { value: "langsmith", label: "LangSmith" },
];

export const DEFAULT_QUALITY_METRICS = [
  { label: "Answer relevance", score: 0.91 },
  { label: "Groundedness", score: 0.89 },
  { label: "Context precision", score: 0.87 },
  { label: "Latency quality tradeoff", score: 0.84 },
];

export const METRICS_NAV_ITEMS = [
  { value: "experiments", label: "Experiments" },
  { value: "comparison", label: "Comparison" },
  { value: "charts", label: "Charts" },
  { value: "recommendation", label: "Recommendations" },
  { value: "profiles", label: "Profiles" },
];

export const createWorkspaceState = () => ({
  phase: "ingestion-setup",
  files: [],
  selectedFileId: null,
  query: "",
  submittedQuery: "",
  response: "",
  responseVisible: false,
  responseVariants: [],
  experimentId: null,
  agentReport: null,
  visibleLines: [],
  activeRightSection: "response",
  queryActivity: {
    visible: false,
    status: "idle",
    messages: [],
  },
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
  dataExtraction: ["pymupdf"],
  textProcessing: ["recursive"],
  embeddingModels: ["text-embedding-3-large"],
  vectorStores: ["faiss"],
  retrievalStrategies: ["semantic-similarity"],
  queryConfigurations: [],
  qualityMetrics: DEFAULT_QUALITY_METRICS,
  chunkLength: 1000,
  topK: 3,
  conversation: [],
  usedStrategies: [],
  allowedTechniques: null,
  selectedLlmModel: "gpt-4o-mini",
});

export const INITIAL_PROJECTS = [];
