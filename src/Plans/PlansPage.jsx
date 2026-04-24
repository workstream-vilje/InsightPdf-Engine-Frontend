"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PLANS, setCart } from "./cartStore";
import styles from "./plans.module.css";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StatBar({ value, color }) {
  return (
    <div className={styles.statBarTrack}>
      <div className={styles.statBarFill} style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export default function PlansPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);

  // unlock body scroll for this page (globals.css sets overflow:hidden)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.height = "";
    };
  }, []);

  const handleAddToCart = (plan) => {
    setCart(plan);
    setSelected(plan.id);
    setTimeout(() => router.push("/cart"), 300);
  };

  return (
    <div className={styles.page}>
      {/* ── header ── */}
      <div className={styles.header}>
        <span className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          InsightPDF Engine
        </span>
        <h1 className={styles.title}>Choose your RAG plan</h1>
        <p className={styles.subtitle}>
          Three tiers of intelligence — pick the one that fits your documents and accuracy needs.
        </p>
      </div>

      {/* ── cards ── */}
      <div className={styles.grid}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.card} ${selected === plan.id ? styles.cardSelected : ""}`}
            style={{ "--plan-color": plan.color, "--plan-soft": plan.colorSoft, "--plan-border": plan.colorBorder }}
          >
            {plan.badge && (
              <span className={styles.badge} style={{ background: plan.color }}>
                {plan.badge}
              </span>
            )}

            {/* card header */}
            <div className={styles.cardTop}>
              <div className={styles.planDot} style={{ background: plan.color }} />
              <div>
                <h2 className={styles.planName}>{plan.name}</h2>
                <p className={styles.planTagline}>{plan.tagline}</p>
              </div>
            </div>

            {/* price */}
            <div className={styles.priceRow}>
              <span className={styles.currency}>$</span>
              <span className={styles.price}>{plan.price}</span>
              <span className={styles.period}>/mo</span>
            </div>

            {/* stat bars */}
            <div className={styles.stats}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Accuracy</span>
                <StatBar value={plan.accuracy} color={plan.color} />
                <span className={styles.statValue}>{plan.accuracy}%</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Speed</span>
                <StatBar value={plan.speed} color={plan.color} />
                <span className={styles.statValue}>{plan.speed}%</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Cost eff.</span>
                <StatBar value={plan.cost} color={plan.color} />
                <span className={styles.statValue}>{plan.cost}%</span>
              </div>
            </div>

            <div className={styles.divider} />

            {/* features */}
            <ul className={styles.features}>
              {plan.features.map((f) => (
                <li key={f} className={styles.featureItem}>
                  <span className={styles.featureIcon} style={{ color: plan.color }}>
                    <CheckIcon />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {/* endpoints */}
            <div className={styles.endpoints}>
              <span className={styles.endpointLabel}>Endpoints</span>
              <code className={styles.endpointCode}>{plan.endpoints.upload}</code>
              <code className={styles.endpointCode}>{plan.endpoints.query}</code>
            </div>

            {/* CTA */}
            <button
              className={styles.cta}
              style={{ background: plan.color }}
              onClick={() => handleAddToCart(plan)}
            >
              {selected === plan.id ? "Added ✓" : "Add to Cart"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
