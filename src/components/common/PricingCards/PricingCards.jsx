"use client";

/**
 * PricingCards — shared plan card grid used in both SettingsPage and the Landing page.
 *
 * Props:
 *   plans            {Array}    Plan objects from the API (or static fallback).
 *   isInteractive    {boolean}  true  → show active state + clickable buttons (Settings).
 *                               false → read-only display, no actions (Landing page).
 *   currentPlanCode  {string}   Code of the user's active plan (only used when isInteractive).
 *   pendingPlanCode  {string}   Code of the plan currently being switched to.
 *   onPlanChange     {Function} Called with planCode when user clicks "Choose plan".
 */

import { Button } from "@/components/ui/button";
import styles from "./PricingCards.module.css";

const PRICES = [
  { original: "$11.99", current: "$2.99", discount: "75% off" },
  { original: "$18.99", current: "$3.99", discount: "79% off" },
  { original: "$27.99", current: "$7.99", discount: "71% off" },
];

export default function PricingCards({
  plans = [],
  isInteractive = true,
  currentPlanCode = null,
  pendingPlanCode = "",
  onPlanChange = () => {},
}) {
  const visiblePlans = plans.filter((p) => p.code !== "image_add_on");

  return (
    <div className={styles.planGrid}>
      {visiblePlans.map((plan, index) => {
        const isCurrent = isInteractive && currentPlanCode === plan.code;
        const pricing = PRICES[index] || PRICES[0];

        return (
          <div key={plan.code} className={styles.planCardWrapper}>
            <article
              className={`${styles.planCard} ${isCurrent ? styles.planCardActive : ""}`}
            >
              {/* Discount badge */}
              <div className={styles.planCardTopRow}>
                <span className={styles.planDiscountBadge}>{pricing.discount}</span>
              </div>

              {/* Title + description */}
              <div className={styles.planCardHeader}>
                <h3 className={styles.planCardTitle}>{plan.label}</h3>
                <p className={styles.planCardSubtitle}>{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className={styles.planPricing}>
                <span className={styles.planOriginalPrice}>{pricing.original}</span>
                <div className={styles.planCurrentPriceRow}>
                  <span className={styles.planCurrentPrice}>{pricing.current}</span>
                  <span className={styles.planPerMonth}>/mo</span>
                </div>
                <span className={styles.planFreeMonths}>+3 mo. free</span>
              </div>

              {/* CTA button */}
              {isInteractive ? (
                <Button
                  type="button"
                  className={`${styles.planButton} ${isCurrent ? styles.planButtonActive : styles.planButtonDefault}`}
                  disabled={isCurrent || pendingPlanCode === plan.code}
                  onClick={() => onPlanChange(plan.code)}
                >
                  {isCurrent
                    ? "Current plan"
                    : pendingPlanCode === plan.code
                      ? "Switching..."
                      : "Choose plan"}
                </Button>
              ) : (
                <div className={`${styles.planButton} ${styles.planButtonReadOnly}`}>
                  {plan.label} plan
                </div>
              )}

              <hr className={styles.planDivider} />

              {/* Feature list */}
              <div className={styles.planFeatureList}>
                {plan.features?.map((feature) => (
                  <div key={feature} className={styles.planFeatureItem}>
                    <span className={styles.planFeatureDot} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}
