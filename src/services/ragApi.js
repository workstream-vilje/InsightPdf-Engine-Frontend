import httpClient from "@/services/axios";
import { getCart } from "@/Plans/cartStore";

/**
 * Get the current plan's endpoints
 */
function getPlanEndpoints() {
  const plan = getCart();
  if (!plan) {
    throw new Error("No plan selected. Please select a plan first.");
  }
  return plan.endpoints;
}

/**
 * Upload PDF to the plan-specific endpoint
 * Routes to: /api/v1/basic-rag/upload OR /api/v1/medium-rag/upload OR /api/v1/advanced-rag/upload
 */
export async function uploadPDF(formData) {
  const endpoints = getPlanEndpoints();
  const plan = getCart();
  
  console.log(`📤 Uploading to ${plan.name} RAG endpoint:`, endpoints.upload);
  
  const response = await httpClient.post(endpoints.upload, formData, {
    headers: {
      // FormData sets its own Content-Type with boundary
    },
  });
  
  console.log(`✅ Upload successful (${plan.name} RAG):`, response);
  return response;
}

/**
 * Query the plan-specific endpoint
 * Routes to: /api/v1/basic-rag/query OR /api/v1/medium-rag/query OR /api/v1/advanced-rag/query
 */
export async function queryRAG(payload) {
  const endpoints = getPlanEndpoints();
  const plan = getCart();
  
  console.log(`🔍 Querying ${plan.name} RAG endpoint:`, endpoints.query);
  console.log(`📝 Query payload:`, payload);
  
  const response = await httpClient.post(endpoints.query, payload);
  
  console.log(`✅ Query successful (${plan.name} RAG):`, response);
  return response;
}

/**
 * Validate if file meets plan limits
 */
export function validateFileForPlan(file) {
  const plan = getCart();
  if (!plan) {
    return { valid: false, error: "No plan selected" };
  }

  const maxPages = plan.id === "basic" ? 50 : plan.id === "medium" ? 200 : 700;
  
  // Note: We can't check page count before upload, but we can check file size
  // Rough estimate: 1 page ≈ 50KB for text PDFs
  const estimatedPages = Math.ceil(file.size / (50 * 1024));
  
  if (estimatedPages > maxPages) {
    return {
      valid: false,
      error: `File too large for ${plan.name} plan. Estimated ${estimatedPages} pages, max ${maxPages} pages allowed.`,
    };
  }

  return { valid: true };
}

/**
 * Get plan-specific configuration
 */
export function getPlanConfig() {
  const plan = getCart();
  if (!plan) return null;

  return {
    id: plan.id,
    name: plan.name,
    maxPages: plan.id === "basic" ? 50 : plan.id === "medium" ? 200 : 700,
    features: {
      semanticChunking: plan.id !== "basic",
      largeEmbeddings: plan.id !== "basic",
      reranking: plan.id !== "basic",
      agentPipeline: plan.id === "advanced",
      answerValidation: plan.id === "advanced",
    },
    endpoints: plan.endpoints,
  };
}
