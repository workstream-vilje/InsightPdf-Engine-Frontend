import {
  DATA_EXTRACTION_OPTIONS,
  QUERY_CONFIGURATION_OPTIONS,
  RETRIEVAL_STRATEGY_OPTIONS,
  TEXT_PROCESSING_OPTIONS,
  VECTOR_STORE_OPTIONS,
} from "@/lib/projects/data";

const DEFAULT_FEATURES = {
  streaming: false,
  history: false,
  experiments: false,
  comparison_analytics: false,
  ragas: false,
  langsmith: false,
  agent: false,
  image_add_on: false,
};

const DEFAULT_CAPABILITIES = {
  vector_dbs: ["faiss"],
  splitters: ["recursive"],
  extraction_methods: ["pymupdf"],
  retrieval_modes: ["similarity", "semantic"],
};

const VECTOR_DB_OPTION_ALIASES = {
  faiss: "faiss",
  pgvector: "pgvector",
  pinecone: "pinecone",
  chroma: "chromadb",
  chromadb: "chromadb",
};

const RETRIEVAL_UI_BY_BACKEND_MODE = {
  semantic: ["semantic-similarity"],
  similarity: ["keyword-search"],
  hybrid: ["hybrid-search"],
  mmr: ["mmr"],
  keyword: ["keyword-search"],
};

const normalizeStringList = (values) =>
  Array.isArray(values)
    ? values
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    : [];

export const getSubscriptionPlanUi = (subscription) => {
  const features = {
    ...DEFAULT_FEATURES,
    ...(subscription?.features || {}),
  };
  const capabilities = {
    ...DEFAULT_CAPABILITIES,
    ...(subscription?.capabilities || {}),
  };

  const allowedSplitters = new Set(normalizeStringList(capabilities.splitters));
  const allowedExtractionMethods = new Set(
    normalizeStringList(capabilities.extraction_methods),
  );
  const allowedVectorDbs = new Set(
    normalizeStringList(capabilities.vector_dbs)
      .map((value) => VECTOR_DB_OPTION_ALIASES[value] || value),
  );

  const allowedRetrievalValues = new Set(
    normalizeStringList(capabilities.retrieval_modes).flatMap(
      (mode) => RETRIEVAL_UI_BY_BACKEND_MODE[mode] || [],
    ),
  );

  return {
    features,
    capabilities,
    canUseHistory: Boolean(features.history),
    canUseAnalytics: Boolean(features.history && features.comparison_analytics),
    canUseAgent: Boolean(features.agent),
    canUseImageUploads: Boolean(subscription?.image_add_on),
    uploadDataExtractionOptions: DATA_EXTRACTION_OPTIONS.filter((option) =>
      allowedExtractionMethods.has(option.value),
    ),
    uploadTextProcessingOptions: TEXT_PROCESSING_OPTIONS.filter((option) =>
      allowedSplitters.has(option.value),
    ),
    uploadVectorStoreOptions: VECTOR_STORE_OPTIONS.filter((option) =>
      allowedVectorDbs.has(option.value),
    ),
    queryRetrievalStrategyOptions: RETRIEVAL_STRATEGY_OPTIONS.filter((option) =>
      allowedRetrievalValues.has(option.value),
    ),
    queryConfigurationOptions: QUERY_CONFIGURATION_OPTIONS.filter(
      (option) => option.value !== "agent" && Boolean(features[option.value]),
    ),
  };
};
