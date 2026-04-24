"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, clearCart, subscribeCart, PLANS } from "./cartStore";
import { useAuth } from "@/components/auth/AuthProvider";
import styles from "./cart.module.css";

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, isAuthInitialized } = useAuth();
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    setPlan(getCart());
    const unsub = subscribeCart(() => setPlan(getCart()));
    return unsub;
  }, []);

  // unlock body scroll for this page
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.height = "";
    };
  }, []);

  const handleRemove = () => {
    clearCart();
    router.push("/plans");
  };

  const handleProceed = () => {
    if (!isAuthInitialized) return;
    if (!isAuthenticated) {
      // save intended destination so after login we come back to checkout
      if (typeof window !== "undefined") {
        sessionStorage.setItem("post-login-redirect", "/checkout");
      }
      router.push("/auth/login");
    } else {
      router.push("/checkout");
    }
  };

  // empty cart
  if (isAuthInitialized && !plan) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🛒</div>
          <h2 className={styles.emptyTitle}>Your cart is empty</h2>
          <p className={styles.emptyText}>Head back to plans and pick one that fits your needs.</p>
          <Link href="/plans" className={styles.backBtn}>Browse Plans</Link>
        </div>
      </div>
    );
  }

  if (!plan) return null; // loading

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/plans" className={styles.breadcrumbLink}>Plans</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>Cart</span>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbFuture}>Checkout</span>
        </nav>

        <h1 className={styles.title}>Review your plan</h1>
        <p className={styles.subtitle}>Confirm your selection before proceeding to checkout.</p>

        <div className={styles.layout}>

          {/* ── plan summary card ── */}
          <div className={styles.summaryCard}
            style={{ "--plan-color": plan.color, "--plan-soft": plan.colorSoft, "--plan-border": plan.colorBorder }}>

            <div className={styles.summaryTop}>
              <div className={styles.summaryLeft}>
                <div className={styles.planDot} style={{ background: plan.color }} />
                <div>
                  <h2 className={styles.planName}>{plan.name} RAG</h2>
                  <p className={styles.planTagline}>{plan.tagline}</p>
                </div>
              </div>
              <button className={styles.removeBtn} onClick={handleRemove} title="Remove from cart">
                <TrashIcon />
              </button>
            </div>

            {/* features list */}
            <ul className={styles.features}>
              {plan.features.map((f) => (
                <li key={f} className={styles.featureItem}>
                  <span style={{ color: plan.color }}><CheckIcon /></span>
                  {f}
                </li>
              ))}
            </ul>

            {/* endpoints */}
            <div className={styles.endpoints}>
              <span className={styles.endpointLabel}>API Endpoints included</span>
              <code className={styles.endpointCode}>{plan.endpoints.upload}</code>
              <code className={styles.endpointCode}>{plan.endpoints.query}</code>
            </div>
          </div>

          {/* ── order summary ── */}
          <div className={styles.orderBox}>
            <h3 className={styles.orderTitle}>Order Summary</h3>

            <div className={styles.orderRow}>
              <span>{plan.name} Plan</span>
              <span>${plan.price}.00</span>
            </div>
            <div className={styles.orderRow}>
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            <div className={styles.orderDivider} />
            <div className={`${styles.orderRow} ${styles.orderTotal}`}>
              <span>Total</span>
              <span>${plan.price}.00 / mo</span>
            </div>

            {!isAuthenticated && isAuthInitialized && (
              <div className={styles.loginNotice}>
                <span>🔒</span>
                You'll be asked to log in before checkout.
              </div>
            )}

            <button
              className={styles.proceedBtn}
              style={{ background: plan.color }}
              onClick={handleProceed}
            >
              Proceed to Checkout →
            </button>

            <Link href="/plans" className={styles.changePlanLink}>
              ← Change plan
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
