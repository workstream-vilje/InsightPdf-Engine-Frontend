export const PROJECT_CATEGORIES = [
  "Finance",
  "Research",
  "Legal",
  "Operations",
  "Product",
];

export const INITIAL_PROJECTS = [];

export const DATA_EXTRACTION_OPTIONS = [
  { value: "pymupdf", label: "PyMuPDF" },
  { value: "unstructured", label: "Unstructured.io" },
  { value: "pdfplumber", label: "pdfplumber" },
];

export const TEXT_PROCESSING_OPTIONS = [
  { value: "recursive", label: "Recursive" },
  { value: "semantic", label: "Semantic" },
  { value: "token", label: "Token" },
  { value: "fixed", label: "Fixed" },
];

export const EMBEDDING_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large" },
  { value: "text-embedding-3-small", label: "text-embedding-3-small" },
  { value: "ollama-nomic-embed", label: "Ollama (nomic-embed)" },
];

export const VECTOR_STORE_OPTIONS = [
  { value: "chromadb", label: "ChromaDB" },
  { value: "pgvector", label: "PGVector" },
  { value: "faiss", label: "FAISS" },
  { value: "pinecone", label: "Pinecone" },
];

export const RETRIEVAL_STRATEGY_OPTIONS = [
  { value: "semantic-similarity", label: "Semantic Similarity" },
  { value: "hybrid", label: "Hybrid" },
  { value: "mmr", label: "MMR" },
];

export const METRICS_NAV_ITEMS = [
  { value: "experiments", label: "Experiments" },
  { value: "comparison", label: "Comparison" },
  { value: "charts", label: "Charts" },
  { value: "recommendation", label: "Recommendation" },
  { value: "profiles", label: "Profiles" },
];

export const DEFAULT_RESPONSE =
  "Revenue grew 23.4% year over year in Q4 2024, led by stronger enterprise demand and improved cloud services adoption. Gross margin also improved to 68.2%, indicating healthier unit economics across the uploaded reports.";

export const DEFAULT_RETRIEVED_CHUNKS = [
  {
    title: "annual_report_2024.pdf",
    page: 12,
    score: 0.94,
    text: "Revenue grew 23.4% year over year in Q4 2024, reaching $4.2B with stronger performance across enterprise accounts.",
  },
  {
    title: "annual_report_2024.pdf",
    page: 15,
    score: 0.89,
    text: "Cloud services expansion and enterprise renewals were the primary growth drivers, supported by better margin discipline.",
  },
  {
    title: "board_summary.pdf",
    page: 4,
    score: 0.85,
    text: "Leadership highlighted operational efficiency gains and improved gross margin from 64.8% to 68.2% year over year.",
  },
];

export const DEFAULT_EXECUTION_METRICS = [
  { label: "Total Time", value: "1.3s", sub: "Response latency" },
  { label: "Embed Time", value: "0.2s", sub: "Vector encoding" },
  { label: "Retrieval", value: "0.4s", sub: "Chunk search" },
  { label: "LLM Gen", value: "0.7s", sub: "Token generation" },
  { label: "Tokens", value: "2,847", sub: "Input + Output" },
  { label: "Cost", value: "$0.014", sub: "Per query" },
];

export const DEFAULT_QUALITY_METRICS = [
  { label: "Faithfulness", value: 92 },
  { label: "Context Precision", value: 88 },
  { label: "Context Recall", value: 85 },
  { label: "Answer Relevance", value: 91 },
];

export const PROCESSING_LINES = [
  "uploading ...",
  "chunking ..",
  "embedding ..",
  "stored in vector successfully.",
];

export const createWorkspaceState = () => ({
  files: [],
  selectedFileId: null,
  chunkLength: 1000,
  dataExtraction: ["pymupdf", "unstructured"],
  textProcessing: ["recursive"],
  embeddingModels: ["openai", "text-embedding-3-large"],
  vectorStores: ["chromadb", "pgvector"],
  retrievalStrategies: ["semantic-similarity"],
  topK: "3",
  query: "",
  submittedQuery: "",
  conversation: [],
  visibleLines: [],
  phase: "ingestion-setup",
  response: "",
  responseVisible: false,
  usedStrategies: [],
  responseVariants: [],
  allowedTechniques: null,
  activeRightSection: "response",
  retrievedChunks: DEFAULT_RETRIEVED_CHUNKS,
});

export const getProjectById = (projectId) =>
  INITIAL_PROJECTS.find((project) => project.id === projectId) ?? INITIAL_PROJECTS[0];
