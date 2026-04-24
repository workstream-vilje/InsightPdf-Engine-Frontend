"use client";

import { usePlan } from "@/contexts/PlanContext";
import styles from "./PlanBadge.module.css";

export default function PlanBadge({ showFeatures = false }) {
  const { plan, maxPages, features } = usePlan();

  if (!plan) {
    return (
      <div className={styles.noPlan}>
        <span className={styles.icon}>⚠️</span>
        <span>No plan selected</span>
        <a href="/" className={styles.link}>Select a plan</a>
      </div>
    );
  }

  return (
    <div className={styles.badge} style={{ "--plan-color": plan.color }}>
      <div className={styles.planInfo}>
        <span className={styles.planDot} style={{ background: plan.color }} />
        <div>
          <span className={styles.planName}>{plan.name} Plan</span>
          <span className={styles.planLimit}>Max {maxPages} pages</span>
        </div>
      </div>

      {showFeatures && (
        <div className={styles.features}>
          {features.semanticChunking && <span className={styles.feature}>Semantic Chunking</span>}
          {features.reranking && <span className={styles.feature}>Reranking</span>}
          {features.agentPipeline && <span className={styles.feature}>Agent Pipeline</span>}
          {features.answerValidation && <span className={styles.feature}>Validation</span>}
        </div>
      )}
    </div>
  );
}
