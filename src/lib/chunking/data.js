/**
 * Mock data for the Chunking Experiments screen.
 */

export const CHUNKING_STRATEGIES = [
  { id: "recursive", label: "Recursive Text Splitting", desc: "Splits by hierarchy of separators" },
  { id: "fixed", label: "Fixed Size Chunking", desc: "Equal-sized character chunks" },
  { id: "sentence", label: "Sentence Based", desc: "Splits on sentence boundaries" },
  { id: "paragraph", label: "Paragraph Based", desc: "Splits on paragraph breaks" },
  { id: "semantic", label: "Semantic Chunking", desc: "Embedding-based similarity grouping" },
  { id: "token", label: "Token Based", desc: "Splits by token count" },
  { id: "sliding", label: "Sliding Window", desc: "Overlapping fixed-size windows" },
  { id: "structure", label: "Document Structure", desc: "Headers / sections aware" },
];

export const MOCK_CHUNKS = [
  { id: 1, text: "Revenue for the fiscal year 2024 reached $4.2 billion, representing a 23.4% increase year-over-year. This growth was primarily driven by the enterprise segment which saw a 31% increase in subscription revenue...", tokens: 42, chars: 256 },
  { id: 2, text: "The company's cloud services division expanded operations to 12 new regions, resulting in a 45% increase in global coverage. Infrastructure investments totaling $890 million were deployed across data centers...", tokens: 56, chars: 320 },
  { id: 3, text: "Gross margin improved to 68.2% in Q4 2024, compared to 64.8% in Q4 2023. Operating expenses were managed efficiently with a 12% reduction in customer acquisition costs while maintaining growth targets...", tokens: 48, chars: 280 },
  { id: 4, text: "Research and development expenditure increased by 18% to $1.1 billion, focusing on artificial intelligence capabilities, next-generation platform architecture, and enhanced security features...", tokens: 52, chars: 300 },
  { id: 5, text: "The board of directors approved a share buyback program of up to $2 billion over the next 18 months. Additionally, quarterly dividends were increased by 15% to $0.85 per share...", tokens: 45, chars: 260 },
  { id: 6, text: "Customer retention rate improved to 94.7%, up from 91.2% in the prior year. Net Promoter Score reached an all-time high of 72, indicating strong customer satisfaction across all segments...", tokens: 47, chars: 270 },
  { id: 7, text: "Strategic partnerships with major cloud providers expanded the company's ecosystem reach. Integration with leading enterprise platforms reduced deployment times by an average of 40%...", tokens: 44, chars: 250 },
];

export const CHUNKING_PROFILES = [
  { name: "Research Papers Optimized", strategies: ["recursive", "semantic"], timestamp: "2024-12-15" },
  { name: "Legal Documents Profile", strategies: ["structure", "paragraph"], timestamp: "2024-12-10" },
  { name: "Large Technical Docs", strategies: ["sliding", "token"], timestamp: "2024-12-08" },
];

export const PIPELINE_STEPS = [
  { key: "pdf", label: "PDF Upload" },
  { key: "extract", label: "Data Extraction" },
  { key: "chunk", label: "Chunking", highlight: true },
  { key: "embed", label: "Embedding" },
  { key: "vectordb", label: "Vector DB" },
  { key: "retrieve", label: "Retriever" },
  { key: "llm", label: "LLM" },
  { key: "answer", label: "Answer" },
];
