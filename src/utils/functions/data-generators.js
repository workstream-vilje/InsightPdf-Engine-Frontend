/**
 * Centralized data generation functions for mock experiments.
 */
import { CHUNKING_STRATEGIES } from "@/lib/chunking/data";

/**
 * Generate a mock experiment result for a chunking strategy.
 */
export const generateChunkingResult = (id, config) => {
  const base = {
    recursive: 82,
    fixed: 74,
    sentence: 79,
    paragraph: 77,
    semantic: 86,
    token: 76,
    sliding: 80,
    structure: 83,
  };

  const accuracy = (base[id] ?? 75) + Math.floor(Math.random() * 6 - 3);

  return {
    strategy: id,
    label: CHUNKING_STRATEGIES.find((s) => s.id === id)?.label ?? id,
    chunkSize: config?.chunkSize || 1000,
    overlap: config?.overlap || 200,
    totalChunks: Math.floor(4000 / (config?.chunkSize || 1000)) + 3,
    accuracy,
    answerRelevance: accuracy - Math.floor(Math.random() * 5),
    latency: +(0.5 + Math.random() * 1.5).toFixed(2),
    cost: +(0.008 + Math.random() * 0.01).toFixed(4),
    memory: +(10 + Math.random() * 30).toFixed(1),
  };
};

/**
 * Generate preview chunks using shared text fragments.
 */
export const generatePreviewChunks = (strategy, chunkSize, overlap, sourceChunks) => {
  const count = Math.max(3, Math.min(7, Math.floor(4000 / chunkSize) + 2));
  return Array.from({ length: count }, (_, i) => {
    const base = sourceChunks[i % sourceChunks.length];
    return {
      ...base,
      id: i + 1,
      tokens: Math.floor(chunkSize / 4.2) + Math.floor(Math.random() * 20 - 10),
      chars: chunkSize + Math.floor(Math.random() * 40 - 20),
      overlapStart: i === 0 ? 0 : overlap,
      overlapEnd: i === count - 1 ? 0 : overlap,
    };
  });
};
