"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getCart, subscribeCart } from "@/Plans/cartStore";

const PlanContext = createContext({
  plan: null,
  isLoading: true,
  hasPlan: false,
  canUpload: false,
  canQuery: false,
  maxPages: 0,
  uploadEndpoint: null,
  queryEndpoint: null,
  features: {},
});

export function PlanProvider({ children }) {
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPlan = () => {
      const currentPlan = getCart();
      console.log("🎯 PlanContext: loaded plan:", currentPlan);
      setPlan(currentPlan);
      setIsLoading(false);
    };

    loadPlan();
    const unsubscribe = subscribeCart(loadPlan);
    return unsubscribe;
  }, []);

  const value = {
    plan,
    isLoading,
    hasPlan: Boolean(plan),
    canUpload: Boolean(plan),
    canQuery: Boolean(plan),
    maxPages: plan?.id === "basic" ? 50 : plan?.id === "medium" ? 200 : plan?.id === "advanced" ? 700 : 0,
    uploadEndpoint: plan?.endpoints?.upload || null,
    queryEndpoint: plan?.endpoints?.query || null,
    features: {
      // Basic features (all plans)
      pdfUpload: true,
      basicQuery: true,
      
      // Medium+ features
      semanticChunking: plan?.id === "medium" || plan?.id === "advanced",
      largeEmbeddings: plan?.id === "medium" || plan?.id === "advanced",
      reranking: plan?.id === "medium" || plan?.id === "advanced",
      pineconeStorage: plan?.id === "medium" || plan?.id === "advanced",
      
      // Advanced only features
      agentPipeline: plan?.id === "advanced",
      multiDatabase: plan?.id === "advanced",
      answerValidation: plan?.id === "advanced",
      autoRetry: plan?.id === "advanced",
      queryClassification: plan?.id === "advanced",
    },
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = () => useContext(PlanContext);
