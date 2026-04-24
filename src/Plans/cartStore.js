"use client";

// Simple module-level cart store using localStorage + custom events
// so it works across pages without a heavy state library.

const CART_KEY = "insightpdf-cart";
const CART_EVENT = "insightpdf-cart-change";

export const PLANS = [
  {
    id: "basic",
    name: "Basic",
    tagline: "Fast & cost-effective",
    price: 9,
    color: "#c48a3a",
    colorSoft: "#fff9f0",
    colorBorder: "#f6e7cc",
    badge: null,
    features: [
      "Up to 50 pages per document",
      "Character-based chunking",
      "text-embedding-3-small (1536-dim)",
      "FAISS local vector store",
      "GPT-4o-mini generation",
      "~2s avg query time",
      "~$0.002 per query",
      "60% accuracy on complex queries",
    ],
    endpoints: {
      upload: "POST /api/v1/basic-rag/upload",
      query: "POST /api/v1/basic-rag/query",
    },
    accuracy: 60,
    speed: 95,
    cost: 95,
  },
  {
    id: "medium",
    name: "Medium",
    tagline: "Balanced accuracy & speed",
    price: 29,
    color: "#7c5cbf",
    colorSoft: "#f5f0ff",
    colorBorder: "#e4d9f7",
    badge: "Most Popular",
    features: [
      "Up to 200 pages per document",
      "Semantic chunking with fallback",
      "text-embedding-3-large (3072-dim)",
      "Pinecone cloud vector store",
      "GPT-4o generation",
      "Cosine + LLM reranking",
      "Soft deduplication",
      "~4s avg query time",
      "~$0.017 per query",
      "80% accuracy on complex queries",
    ],
    endpoints: {
      upload: "POST /api/v1/medium-rag/upload",
      query: "POST /api/v1/medium-rag/query",
    },
    accuracy: 80,
    speed: 70,
    cost: 55,
  },
  {
    id: "advanced",
    name: "Advanced",
    tagline: "Maximum accuracy & intelligence",
    price: 79,
    color: "#1a7a5e",
    colorSoft: "#f0faf6",
    colorBorder: "#c8ead9",
    badge: "Enterprise",
    features: [
      "Up to 700 pages per document",
      "Advanced semantic chunking",
      "text-embedding-3-large (3072-dim)",
      "Pinecone + FAISS dual storage",
      "GPT-4-turbo generation",
      "Intelligent agent pipeline",
      "LLM-based answer validation",
      "Auto-retry (up to 3 attempts)",
      "~5–8s avg query time",
      "~$0.043 per query",
      "92% accuracy on complex queries",
    ],
    endpoints: {
      upload: "POST /api/v1/advanced-rag/upload",
      query: "POST /api/v1/advanced-rag/query",
    },
    accuracy: 92,
    speed: 45,
    cost: 20,
  },
];

export function getPlanById(id) {
  return PLANS.find((p) => p.id === id) ?? null;
}

export function getCart() {
  if (typeof window === "undefined") {
    console.log("🚫 getCart: window is undefined (SSR)");
    return null;
  }
  try {
    const raw = localStorage.getItem(CART_KEY);
    console.log("📦 getCart: raw value from localStorage:", raw);
    const parsed = raw ? JSON.parse(raw) : null;
    console.log("📦 getCart: parsed value:", parsed);
    return parsed;
  } catch (err) {
    console.error("❌ getCart: error reading cart:", err);
    return null;
  }
}

export function setCart(plan) {
  if (typeof window === "undefined") {
    console.log("🚫 setCart: window is undefined (SSR)");
    return;
  }
  console.log("💾 setCart: saving plan to localStorage:", plan);
  if (plan) {
    const stringified = JSON.stringify(plan);
    console.log("💾 setCart: stringified:", stringified);
    localStorage.setItem(CART_KEY, stringified);
    console.log("✅ setCart: saved successfully");
  } else {
    localStorage.removeItem(CART_KEY);
    console.log("🗑️ setCart: removed cart");
  }
  window.dispatchEvent(new Event(CART_EVENT));
  console.log("📢 setCart: dispatched cart change event");
}

export function clearCart() {
  setCart(null);
}

export function subscribeCart(cb) {
  window.addEventListener(CART_EVENT, cb);
  return () => window.removeEventListener(CART_EVENT, cb);
}
