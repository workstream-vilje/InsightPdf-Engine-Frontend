"use client";

import { useState } from "react";
import { usePlan } from "@/contexts/PlanContext";
import { uploadPDF, validateFileForPlan } from "@/services/ragApi";
import { useToast } from "@/components/toast/ToastProvider";

/**
 * Hook for plan-based PDF upload with validation and routing
 */
export function usePlanBasedUpload() {
  const { plan, maxPages, hasPlan } = usePlan();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file, userId, projectId, additionalData = {}) => {
    // Check if plan is selected
    if (!hasPlan) {
      showToast({
        title: "No plan selected",
        message: "Please select a plan before uploading files",
        variant: "error",
      });
      throw new Error("No plan selected");
    }

    // Validate file against plan limits
    const validation = validateFileForPlan(file);
    if (!validation.valid) {
      showToast({
        title: "File validation failed",
        message: validation.error,
        variant: "error",
      });
      throw new Error(validation.error);
    }

    setUploading(true);
    setProgress(0);

    try {
      // Build form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", userId);
      formData.append("project_id", projectId);

      // Add any additional data
      Object.keys(additionalData).forEach((key) => {
        formData.append(key, additionalData[key]);
      });

      // Upload to plan-specific endpoint
      console.log(`📤 Uploading to ${plan.name} RAG...`);
      setProgress(50);

      const response = await uploadPDF(formData);

      setProgress(100);
      showToast({
        title: "Upload successful",
        message: `File processed with ${plan.name} RAG (${response.chunks_created} chunks created)`,
        variant: "success",
      });

      return response;
    } catch (error) {
      console.error("Upload error:", error);
      showToast({
        title: "Upload failed",
        message: error.message || "Failed to upload file",
        variant: "error",
      });
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    upload,
    uploading,
    progress,
    plan,
    maxPages,
    hasPlan,
  };
}
