"use client";

import { useState } from "react";
import { usePlanBasedQuery } from "@/hooks/usePlanBasedQuery";
import PlanBadge from "@/components/plans/PlanBadge";
import UpgradePrompt from "@/components/plans/UpgradePrompt";
import styles from "./WorkspaceComponents.module.css";

/**
 * Example component showing how to use plan-based query
 * Replace your existing query component with this pattern
 */
export default function PlanBasedQueryExample({ userId, projectId, fileId }) {
  const { query, querying, result, clearResult, plan, features, hasPlan } = usePlanBasedQuery();
  const [queryText, setQueryText] = useState("");

  const handleQuery = async () => {
    if (!queryText.trim()) return;

    try {
      await query(userId, projectId, fileId, queryText);
      // Result is stored in the hook's state
    } catch (error) {
      // Error is already handled by the hook (toast shown)
      console.error("Query failed:", error);
    }
  };

  const handleNewQuery = () => {
    clearResult();
    setQueryText("");
  };

  if (!hasPlan) {
    return (
      <div className={styles.noPlanMessage}>
        <h3>No Plan Selected</h3>
        <p>Please select a plan to query documents</p>
        <a href="/" className={styles.selectPlanBtn}>
          Choose a Plan
        </a>
      </div>
    );
  }

  return (
    <div className={styles.queryContainer}>
      <PlanBadge showFeatures />

      <div className={styles.queryArea}>
        <h3>Ask a Question</h3>
        <p className={styles.planInfo}>
          Powered by {plan.name} RAG
          {features.agentPipeline && " with Agent Pipeline"}
        </p>

        <textarea
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="Ask a question about your document..."
          disabled={querying}
          className={styles.queryInput}
          rows={4}
        />

        <button
          onClick={handleQuery}
          disabled={!queryText.trim() || querying}
          className={styles.queryBtn}
        >
          {querying ? "Querying..." : "Ask Question"}
        </button>

        {result && (
          <div className={styles.result}>
            <div className={styles.resultHeader}>
              <h4>Answer</h4>
              <button onClick={handleNewQuery} className={styles.newQueryBtn}>
                New Query
              </button>
            </div>
            <div className={styles.answer}>
              {result.answer}
            </div>

            {result.chunks_used && (
              <div className={styles.sources}>
                <h5>Sources ({result.chunks_used.length} chunks)</h5>
                {result.chunks_used.map((chunk, idx) => (
                  <div key={idx} className={styles.source}>
                    <span className={styles.sourcePage}>Page {chunk.page}</span>
                    <span className={styles.sourceScore}>Score: {chunk.score?.toFixed(2)}</span>
                    {chunk.rerank_score && (
                      <span className={styles.sourceRerank}>Rerank: {chunk.rerank_score.toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result.metrics && (
              <div className={styles.metrics}>
                <span>Time: {result.metrics.total_time?.toFixed(2)}s</span>
                <span>Cost: ${result.metrics.cost?.toFixed(4)}</span>
                <span>Tokens: {result.metrics.total_tokens}</span>
              </div>
            )}
          </div>
        )}

        {/* Show upgrade prompts for disabled features */}
        {!features.answerValidation && (
          <div className={styles.upgradeSection}>
            <UpgradePrompt 
              feature="Answer Validation" 
              requiredPlan="Advanced"
            />
          </div>
        )}

        {!features.agentPipeline && (
          <div className={styles.upgradeSection}>
            <UpgradePrompt 
              feature="Agent Pipeline" 
              requiredPlan="Advanced"
            />
          </div>
        )}
      </div>
    </div>
  );
}
