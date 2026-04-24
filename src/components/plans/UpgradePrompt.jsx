"use client";

import Link from "next/link";
import { usePlan } from "@/contexts/PlanContext";
import styles from "./UpgradePrompt.module.css";

export default function UpgradePrompt({ feature, requiredPlan = "Advanced" }) {
  const { plan } = usePlan();

  if (!plan) return null;

  return (
    <div className={styles.prompt}>
      <div className={styles.icon}>🔒</div>
      <div className={styles.content}>
        <h4 className={styles.title}>{feature} is not available</h4>
        <p className={styles.message}>
          This feature requires the {requiredPlan} plan. 
          {plan && ` You're currently on the ${plan.name} plan.`}
        </p>
        <Link href="/" className={styles.upgradeBtn}>
          Upgrade to {requiredPlan}
        </Link>
      </div>
    </div>
  );
}
