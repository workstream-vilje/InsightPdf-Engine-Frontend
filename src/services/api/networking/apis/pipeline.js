import httpClient from "@/services/axios";
import { runQuery } from "@/services/api/networking/endpoints";

const splitMultiValue = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return value ? [value] : [];
};

const normalizeSelectValue = (item) => {
  if (!item) return null;
  if (typeof item === "string") return item;
  return item.value ?? item.label ?? null;
};

const normalizeSelectValues = (items) =>
  splitMultiValue(items)
    .map(normalizeSelectValue)
    .filter(Boolean);

export const buildUploadPipelineConfig = ({
  chunkSize = 500,
  chunkOverlap = 50,
  splitters,
  extractionMethods,
  embeddings,
  vectorStores,
  collectionName = "documents",
} = {}) => {
  const normalizedSplitters = normalizeSelectValues(splitters);
  const normalizedMethods = normalizeSelectValues(extractionMethods);
  const normalizedEmbeddings = splitMultiValue(embeddings)
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        return {
          provider: item,
          model: item,
        };
      }
      return {
        provider: item.provider || item.value || null,
        model: item.model || item.label || item.value || null,
      };
    })
    .filter((item) => item?.provider && item?.model);
  const normalizedVectorStores = normalizeSelectValues(vectorStores).map((item) =>
    item === "postgresql" ? "pgvector" : item,
  );

  return {
    text_processing: {
      chunk_size: Number(chunkSize) || 500,
      chunk_overlap: Number(chunkOverlap) || 50,
      splitter:
        normalizedSplitters.length > 1
          ? normalizedSplitters
          : normalizedSplitters[0] || "recursive",
    },
    data_extraction: {
      method:
        normalizedMethods.length > 1
          ? normalizedMethods
          : normalizedMethods[0] || "pymupdf",
    },
    embeddings:
      normalizedEmbeddings.length > 1
        ? normalizedEmbeddings
        : normalizedEmbeddings[0] || null,
    vector_store: normalizedVectorStores.length
      ? {
          backends: normalizedVectorStores,
          collection_name: collectionName,
        }
      : null,
  };
};

export const buildQueryPipelinePayload = ({
  projectId,
  fileId,
  query,
  topK = 5,
  searchType = "similarity",
  vectorStores,
  collectionName = "documents",
  embedding,
  llm,
  selfReflection,
} = {}) => {
  const normalizedVectorStores = normalizeSelectValues(vectorStores).map((item) => {
    if (item === "postgresql" || item === "pgvector") {
      return "faiss";
    }
    if (item === "chroma") {
      return "chromadb";
    }
    return item;
  });

  return {
    project_id: projectId ?? null,
    file_id: fileId ?? null,
    query: query || "",
    config: {
      retrieval_strategy: {
        top_k: Number(topK) || 5,
        search_type: searchType === "similarity" ? "similarity" : "similarity",
        vector_db:
          normalizedVectorStores.length > 1
            ? normalizedVectorStores
            : normalizedVectorStores[0] || "faiss",
        collection_name: collectionName,
      },
      embedding: embedding || undefined,
      llm: llm || undefined,
      self_reflection: selfReflection || undefined,
    },
  };
};

export const pipelineApi = {
  runPipelineQuery: (payload) => httpClient.post(runQuery, payload),
  buildUploadPipelineConfig,
  buildQueryPipelinePayload,
};

export default pipelineApi;
