"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, clearCart, subscribeCart } from "./cartStore";
import { useAuth } from "@/components/auth/AuthProvider";
import { ROUTE_PATHS } from "@/utils/routepaths";
import styles from "./checkout.module.css";

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

const DUMMY_FIELDS = [
  { id: "cardName",   label: "Name on card",    placeholder: "John Doe",          type: "text",     autoComplete: "cc-name" },
  { id: "cardNumber", label: "Card number",      placeholder: "1234 5678 9012 3456", type: "text",  autoComplete: "cc-number" },
  { id: "expiry",     label: "Expiry date",      placeholder: "MM / YY",           type: "text",     autoComplete: "cc-exp" },
  { id: "cvv",        label: "CVV",              placeholder: "•••",               type: "password", autoComplete: "cc-csc" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isAuthInitialized } = useAuth();
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState({ cardName: "", cardNumber: "", expiry: "", cvv: "" });
  const [status, setStatus] = useState("idle"); // idle | processing | success

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

  // redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthInitialized) return;
    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("post-login-redirect", "/checkout");
      }
      router.replace("/auth/login");
    }
  }, [isAuthenticated, isAuthInitialized, router]);

  // redirect to home if cart is empty
  useEffect(() => {
    if (isAuthInitialized && isAuthenticated && !getCart()) {
      router.replace(ROUTE_PATHS.HOME);
    }
  }, [isAuthInitialized, isAuthenticated, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus("processing");
    // Dummy payment — simulate a 1.5s delay then succeed
    setTimeout(() => {
      setStatus("success");
      clearCart();
    }, 1500);
  };

  const handleGoToWorkspace = () => {
    router.push("/workspace");
  };

  if (!plan || !isAuthenticated) return null;

  /* ── success screen ── */
  if (status === "success") {
    return (
      <div className={styles.page}>
        <div className={styles.successBox}>
          <div className={styles.successIcon} style={{ color: plan.color }}>
            <CheckCircleIcon />
          </div>
          <h1 className={styles.successTitle}>You're all set!</h1>
          <p className={styles.successText}>
            Your <strong>{plan.name} RAG</strong> plan is now active.
            Head to the workspace to start uploading documents and running queries.
          </p>
          <div className={styles.successPlanBadge} style={{ background: plan.colorSoft, borderColor: plan.colorBorder, color: plan.color }}>
            {plan.name} Plan · ${plan.price}/mo
          </div>
          <button className={styles.workspaceBtn} style={{ background: plan.color }} onClick={handleGoToWorkspace}>
            Go to Workspace →
          </button>
          <Link href="/plans" className={styles.changePlanLink}>Browse other plans</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/plans" className={styles.breadcrumbLink}>Plans</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <Link href="/cart" className={styles.breadcrumbLink}>Cart</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>Checkout</span>
        </nav>

        <h1 className={styles.title}>Checkout</h1>
        <p className={styles.subtitle}>Complete your subscription to activate your plan.</p>

        <div className={styles.layout}>

          {/* ── payment form ── */}
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <span className={styles.lockBadge}><LockIcon /> Secure payment</span>
              <div className={styles.dummyNotice}>
                ⚠️ Payment is in demo mode — no real charge will occur.
              </div>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {DUMMY_FIELDS.map((field) => (
                <div key={field.id} className={styles.field}>
                  <label className={styles.label} htmlFor={field.id}>{field.label}</label>
                  <input
                    id={field.id}
                    name={field.id}
                    className={styles.input}
                    type={field.type}
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    value={form[field.id]}
                    onChange={handleChange}
                    required
                  />
                </div>
              ))}

              <button
                className={styles.payBtn}
                style={{ background: plan.color }}
                type="submit"
                disabled={status === "processing"}
              >
                {status === "processing"
                  ? "Processing…"
                  : `Confirm & Pay $${plan.price}.00`}
              </button>
            </form>
          </div>

          {/* ── order summary ── */}
          <div className={styles.orderBox}
            style={{ "--plan-color": plan.color, "--plan-soft": plan.colorSoft, "--plan-border": plan.colorBorder }}>

            <h3 className={styles.orderTitle}>Order Summary</h3>

            <div className={styles.planRow}>
              <div className={styles.planDot} style={{ background: plan.color }} />
              <div>
                <p className={styles.planName}>{plan.name} RAG Plan</p>
                <p className={styles.planTagline}>{plan.tagline}</p>
              </div>
            </div>

            <div className={styles.orderDivider} />

            <div className={styles.orderRow}>
              <span>Subtotal</span>
              <span>${plan.price}.00</span>
            </div>
            <div className={styles.orderRow}>
              <span>Tax</span>
              <span>$0.00</span>
            </div>

            <div className={styles.orderDivider} />

            <div className={`${styles.orderRow} ${styles.orderTotal}`}>
              <span>Total today</span>
              <span>${plan.price}.00</span>
            </div>

            <p className={styles.renewalNote}>
              Renews monthly. Cancel anytime.
            </p>

            <Link href="/cart" className={styles.backLink}>← Back to cart</Link>
          </div>

        </div>
      </div>
    </div>
  );
}
