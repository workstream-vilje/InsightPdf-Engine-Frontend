"use client";

import { useState } from "react";
import { usePlanBasedUpload } from "@/hooks/usePlanBasedUpload";
import PlanBadge from "@/components/plans/PlanBadge";
import styles from "./WorkspaceComponents.module.css";

/**
 * Example component showing how to use plan-based upload
 * Replace your existing upload component with this pattern
 */
export default function PlanBasedUploadExample({ userId, projectId }) {
  const { upload, uploading, progress, plan, maxPages, hasPlan } = usePlanBasedUpload();
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const response = await upload(selectedFile, userId, projectId);
      console.log("Upload response:", response);
      
      // Handle success - update UI, refresh file list, etc.
      setSelectedFile(null);
    } catch (error) {
      // Error is already handled by the hook (toast shown)
      console.error("Upload failed:", error);
    }
  };

  if (!hasPlan) {
    return (
      <div className={styles.noPlanMessage}>
        <h3>No Plan Selected</h3>
        <p>Please select a plan to upload documents</p>
        <a href="/" className={styles.selectPlanBtn}>
          Choose a Plan
        </a>
      </div>
    );
  }

  return (
    <div className={styles.uploadContainer}>
      <PlanBadge showFeatures />

      <div className={styles.uploadArea}>
        <h3>Upload PDF Document</h3>
        <p className={styles.limit}>
          Maximum {maxPages} pages allowed for {plan.name} plan
        </p>

        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          disabled={uploading}
          className={styles.fileInput}
        />

        {selectedFile && (
          <div className={styles.fileInfo}>
            <p><strong>File:</strong> {selectedFile.name}</p>
            <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        {uploading && (
          <div className={styles.progress}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }} />
            <span>{progress}%</span>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className={styles.uploadBtn}
        >
          {uploading ? "Uploading..." : `Upload to ${plan.name} RAG`}
        </button>
      </div>
    </div>
  );
}
