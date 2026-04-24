"use client";

import { useState } from "react";
import { usePlan } from "@/contexts/PlanContext";
import { queryRAG } from "@/services/ragApi";
import { useToast } from "@/components/toast/ToastProvider";

/**
 * Hook for plan-based RAG queries with routing
 */
export function usePlanBasedQuery() {
  const { plan, features, hasPlan } = usePlan();
  const { showToast } = useToast();
  const [querying, setQuerying] = useState(false);
  const [result, setResult] = useState(null);

  const query = async (userId, projectId, fileId, queryText, options = {}) => {
    // Check if plan is selected
    if (!hasPlan) {
      showToast({
        title: "No plan selected",
        message: "Please select a plan before querying documents",
        variant: "error",
      });
      throw new Error("No plan selected");
    }

    if (!queryText || !queryText.trim()) {
      showToast({
        title: "Empty query",
        message: "Please enter a question",
        variant: "warning",
      });
      return null;
    }

    setQuerying(true);
    setResult(null);

    try {
      // Build query payload
      const payload = {
        user_id: userId,
        project_id: projectId,
        file_id: fileId,
        query: queryText.trim(),
        top_k: options.top_k || 5,
        ...options,
      };

      // Query plan-specific endpoint
      console.log(`🔍 Querying ${plan.name} RAG...`);
      const response = await queryRAG(payload);

      setResult(response);
      
      // Show success with plan-specific features
      const featuresUsed = [];
      if (features.reranking) featuresUsed.push("reranking");
      if (features.agentPipeline) featuresUsed.push("agent pipeline");
      if (features.answerValidation) featuresUsed.push("validation");

      showToast({
        title: "Query successful",
        message: `Answered using ${plan.name} RAG${featuresUsed.length ? ` (${featuresUsed.join(", ")})` : ""}`,
        variant: "success",
      });

      return response;
    } catch (error) {
      console.error("Query error:", error);
      showToast({
        title: "Query failed",
        message: error.message || "Failed to query document",
        variant: "error",
      });
      throw error;
    } finally {
      setQuerying(false);
    }
  };

  const clearResult = () => {
    setResult(null);
  };

  return {
    query,
    querying,
    result,
    clearResult,
    plan,
    features,
    hasPlan,
  };
}
