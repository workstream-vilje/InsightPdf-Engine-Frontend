"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/toast/ToastProvider";
import styles from "./auth.module.css";
import { setAuthSession } from "@/services/auth";
import { ROUTE_PATHS } from "@/utils/routepaths";

/* â”€â”€ initial form state â”€â”€ */
const initialSignupForm = { name: "", mail_id: "", password: "", confirm_password: "" };
const initialLoginForm = { mail_id: "", password: "" };

const emailLooksValid = (v) => /\S+@\S+\.\S+/.test(v);

/** SHA-256 hash a string — used to avoid sending plain-text passwords over the wire. */
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* â”€â”€ API helpers â”€â”€ */
const authBases = () => {
  const directBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  const host = process.env.NEXT_PUBLIC_API_HOST || "localhost";
  const port = process.env.NEXT_PUBLIC_API_PORT || "8000";
  return [...new Set([
    ...(directBase ? [`${String(directBase).trim().replace(/\/+$/, "").replace(/\/api\/v\d+$/i, "")}/api/v1`] : []),
    `http://${host}:${port}/api/v1`,
    "http://127.0.0.1:8000/api/v1",
    "http://localhost:8000/api/v1",
  ])];
};

const callAuthApi = async (path, payload) => {
  let lastError = null;
  for (const base of authBases()) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ct = res.headers.get("content-type") || "";
      const isJson = ct.includes("application/json");
      const parsed = isJson ? await res.json() : await res.text();
      if (!res.ok) {
        const msg =
          (isJson && (parsed?.detail || parsed?.message || parsed?.error)) ||
          res.statusText ||
          "Request failed";
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      return parsed;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Unable to connect to the auth service.");
};

/* â”€â”€ Eye icon SVG (no external dep) â”€â”€ */
function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* â”€â”€ Right panel stats â”€â”€ */
const RIGHT_STATS = [
  "Smart PDF ingestion & chunking",
  "RAG queries with self-reflection",
  "Experiment analytics & RAGAS scores",
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN COMPONENT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function AuthPage({ mode }) {
  const router = useRouter();
  const { isAuthenticated, isAuthInitialized } = useAuth();
  const { showToast } = useToast();
  const isSignup = mode === "signup";

  /* â”€â”€ routing state â”€â”€ */
  const [switchingMode, setSwitchingMode] = useState("");
  const switchTimerRef = useRef(null);

  /* â”€â”€ form state â”€â”€ */
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [loading, setLoading] = useState(false);

  /* â”€â”€ OTP step state â”€â”€ */
  // "form" = filling name/email/password, "otp" = entering OTP code
  const [signupStep, setSignupStep] = useState("form");
  const [otpValue, setOtpValue] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef(null);

  /* â”€â”€ password visibility â”€â”€ */
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);

  /* â”€â”€ confirm-password validation â”€â”€ */
  const [confirmTouched, setConfirmTouched] = useState(false);
  const passwordMismatch =
    confirmTouched &&
    signupForm.confirm_password.length > 0 &&
    signupForm.password !== signupForm.confirm_password;

  /* â”€â”€ redirect if already authenticated â”€â”€ */
  useEffect(() => {
    if (isAuthInitialized && isAuthenticated) {
      router.replace(ROUTE_PATHS.WORKSPACE_UPLOAD);
    }
  }, [isAuthInitialized, isAuthenticated, router]);

  /* â”€â”€ cleanup timers â”€â”€ */
  useEffect(() => () => {
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
  }, []);

  /* â”€â”€ reset state when switching modes â”€â”€ */
  useEffect(() => {
    setShowLoginPw(false);
    setShowSignupPw(false);
    setConfirmTouched(false);
    setSignupStep("form");
    setOtpValue("");
    setResendCooldown(0);
  }, [mode]);

  /* â”€â”€ mode switch â”€â”€ */
  const activeMode = switchingMode || mode;

  const handleModeSwitch = useCallback((next) => {
    if (next === mode || switchingMode) return;
    setSwitchingMode(next);
    switchTimerRef.current = setTimeout(() => {
      router.push(next === "signup" ? ROUTE_PATHS.AUTH_SIGNUP : ROUTE_PATHS.AUTH_LOGIN);
    }, 200);
  }, [mode, switchingMode, router]);

  /* â”€â”€ form change handlers â”€â”€ */
  const handleSignupChange = useCallback((e) => {
    const { name, value } = e.target;
    setSignupForm((c) => ({ ...c, [name]: value }));
  }, []);

  const handleLoginChange = useCallback((e) => {
    const { name, value } = e.target;
    setLoginForm((c) => ({ ...c, [name]: value }));
  }, []);

  /* â”€â”€ confirm-password blur â”€â”€ */
  const handleConfirmBlur = useCallback(() => {
    if (signupForm.confirm_password.length > 0) setConfirmTouched(true);
  }, [signupForm.confirm_password]);

  /* â”€â”€ start resend cooldown (60s) â”€â”€ */
  const startResendCooldown = useCallback(() => {
    setResendCooldown(60);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /* â”€â”€ Step 1: send OTP â”€â”€ */
  const handleSignupInit = async (e) => {
    e.preventDefault();

    if (!signupForm.name.trim()) {
      showToast({ title: "Sign up", variant: "warning", message: "Enter your name." });
      return;
    }
    if (!emailLooksValid(signupForm.mail_id)) {
      showToast({ title: "Sign up", variant: "warning", message: "Enter a valid email." });
      return;
    }
    if (signupForm.password.length < 6) {
      showToast({ title: "Sign up", variant: "warning", message: "Password must be at least 6 characters." });
      return;
    }
    if (signupForm.confirm_password !== signupForm.password) {
      setConfirmTouched(true);
      showToast({ title: "Sign up", variant: "warning", message: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const hashedPw = await sha256Hex(signupForm.password);
      await callAuthApi("/signup/init", {
        name: signupForm.name.trim(),
        mail_id: signupForm.mail_id.trim(),
        password: hashedPw,
      });
      setOtpValue("");
      setSignupStep("otp");
      startResendCooldown();
    } catch (err) {
      showToast({ title: "Sign up", variant: "error", message: err?.message || "Unable to send OTP." });
    } finally {
      setLoading(false);
    }
  };

  /* â”€â”€ Step 2: verify OTP â”€â”€ */
  const handleSignupVerify = async (e) => {
    e.preventDefault();

    if (otpValue.trim().length !== 6) {
      showToast({ title: "Sign up", variant: "warning", message: "Enter the 6-digit OTP." });
      return;
    }

    setLoading(true);
    try {
      await callAuthApi("/signup/verify", {
        mail_id: signupForm.mail_id.trim(),
        otp: otpValue.trim(),
      });
      showToast({ title: "Sign up", variant: "success", message: "Account verified! Please log in." });
      setSignupForm(initialSignupForm);
      setConfirmTouched(false);
      setSignupStep("form");
      setOtpValue("");
      switchTimerRef.current = setTimeout(() => router.push(ROUTE_PATHS.AUTH_LOGIN), 500);
    } catch (err) {
      showToast({ title: "Sign up", variant: "error", message: err?.message || "OTP verification failed." });
    } finally {
      setLoading(false);
    }
  };

  /* â”€â”€ Resend OTP â”€â”€ */
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const hashedPw = await sha256Hex(signupForm.password);
      await callAuthApi("/signup/init", {
        name: signupForm.name.trim(),
        mail_id: signupForm.mail_id.trim(),
        password: hashedPw,
      });
      showToast({ title: "Sign up", variant: "success", message: "New OTP sent to your email." });
      setOtpValue("");
      startResendCooldown();
    } catch (err) {
      showToast({ title: "Sign up", variant: "error", message: err?.message || "Unable to resend OTP." });
    } finally {
      setLoading(false);
    }
  };

  /* â”€â”€ login submit â”€â”€ */
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!emailLooksValid(loginForm.mail_id)) {
      showToast({ title: "Login", variant: "warning", message: "Enter a valid email." });
      return;
    }
    if (!loginForm.password) {
      showToast({ title: "Login", variant: "warning", message: "Enter your password." });
      return;
    }

    setLoading(true);
    try {
      const hashedPw = await sha256Hex(loginForm.password);
      const res = await callAuthApi("/auth/login", {
        mail_id: loginForm.mail_id.trim(),
        password: hashedPw,
      });
      setAuthSession({
        userId: res?.user_id,
        name: res?.name,
        mailId: res?.mail_id,
      });
      showToast({ title: "Login", variant: "success", message: res?.message || "Login successful." });
      switchTimerRef.current = setTimeout(
        () => router.push(ROUTE_PATHS.WORKSPACE_UPLOAD),
        500,
      );
    } catch (err) {
      showToast({ title: "Authentication", variant: "error", message: err?.message || "Unable to login." });
    } finally {
      setLoading(false);
    }
  };

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     RENDER
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  return (
    <main className={styles.page}>

      {/* â”€â”€ LEFT PANE â”€â”€ */}
      <section className={styles.leftPane}>
        <div className={styles.leftInner}>

          {/* top bar */}
          <div className={styles.topRow}>
            <Link className={styles.brand} href={ROUTE_PATHS.HOME}>
              <span className={styles.brandMark} />
              InsightPDF
            </Link>
            <Link className={styles.homeLink} href={ROUTE_PATHS.HOME}>
              Home
            </Link>
          </div>

          {/* centre zone */}
          <div className={styles.centreZone}>

            {/* mode toggle */}
            <div className={`${styles.modeRow} ${activeMode === "signup" ? styles.modeRowSignup : styles.modeRowLogin}`}>
              <button
                className={`${styles.modeLink} ${activeMode === "login" ? styles.modeLinkActive : ""}`}
                type="button"
                onClick={() => handleModeSwitch("login")}
              >
                Login
              </button>
              <button
                className={`${styles.modeLink} ${activeMode === "signup" ? styles.modeLinkActive : ""}`}
                type="button"
                onClick={() => handleModeSwitch("signup")}
              >
                Sign Up
              </button>
            </div>

            {/* heading */}
            <div className={styles.header}>
              <h1 className={styles.title}>
                {isSignup
                  ? signupStep === "otp" ? "Verify your email" : "Create your account"
                  : "Sign in to your account"}
              </h1>
              <p className={styles.description}>
                {isSignup
                  ? signupStep === "otp"
                    ? `We sent a 6-digit code to ${signupForm.mail_id}. Enter it below.`
                    : "Create your account to start using the InsightPDF workspace."
                  : "Enter your email and password to continue."}
              </p>
            </div>

            {/* â”€â”€ SIGNUP: STEP 1 â€” details form â”€â”€ */}
            {isSignup && signupStep === "form" && (
              <form className={styles.form} onSubmit={handleSignupInit} key="signup-form">

                <label className={styles.field}>
                  <span className={styles.label}>Username</span>
                  <input
                    className={styles.input}
                    name="name"
                    placeholder="Enter your name"
                    value={signupForm.name}
                    onChange={handleSignupChange}
                    autoComplete="name"
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Email</span>
                  <input
                    className={styles.input}
                    name="mail_id"
                    placeholder="Enter your email"
                    type="email"
                    value={signupForm.mail_id}
                    onChange={handleSignupChange}
                    autoComplete="email"
                  />
                </label>

                <div className={styles.field}>
                  <span className={styles.label}>Password</span>
                  <div className={styles.inputWrap}>
                    <input
                      className={styles.input}
                      name="password"
                      placeholder="Create your password"
                      type={showSignupPw ? "text" : "password"}
                      value={signupForm.password}
                      onChange={handleSignupChange}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowSignupPw((v) => !v)}
                      tabIndex={-1}
                      aria-label={showSignupPw ? "Hide password" : "Show password"}
                    >
                      <EyeIcon open={showSignupPw} />
                    </button>
                  </div>
                </div>

                <div className={styles.field}>
                  <span className={styles.label}>Confirm Password</span>
                  <input
                    className={`${styles.input} ${passwordMismatch ? styles.inputError : ""}`}
                    name="confirm_password"
                    placeholder="Re-enter your password"
                    type="password"
                    value={signupForm.confirm_password}
                    onChange={handleSignupChange}
                    onBlur={handleConfirmBlur}
                    autoComplete="new-password"
                  />
                  {passwordMismatch && (
                    <span className={styles.fieldError}>Passwords do not match</span>
                  )}
                </div>

                <button
                  className={styles.submitButton}
                  disabled={loading || passwordMismatch}
                  type="submit"
                >
                  {loading ? "Sending OTP" : "Send OTP"}
                </button>
              </form>
            )}

            {/* â”€â”€ SIGNUP: STEP 2 â€” OTP verification â”€â”€ */}
            {isSignup && signupStep === "otp" && (
              <form className={styles.form} onSubmit={handleSignupVerify} key="signup-otp">

                <label className={styles.field}>
                  <span className={styles.label}>OTP Code</span>
                  <input
                    className={styles.input}
                    name="otp"
                    placeholder="Enter 6-digit OTP"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                  />
                </label>

                <button
                  className={styles.submitButton}
                  disabled={loading || otpValue.length !== 6}
                  type="submit"
                >
                  {loading ? "Verifying" : "Verify & Create Account"}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className={styles.hintToggle}
                    onClick={handleResendOtp}
                    disabled={loading || resendCooldown > 0}
                  >
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                  <span style={{ color: "var(--muted-foreground, #888)", fontSize: 13 }}>Â·</span>
                  <button
                    type="button"
                    className={styles.hintToggle}
                    onClick={() => { setSignupStep("form"); setOtpValue(""); }}
                  >
                    Change email
                  </button>
                </div>
              </form>
            )}

            {/* â”€â”€ LOGIN FORM â”€â”€ */}
            {!isSignup && (
              <form className={styles.form} onSubmit={handleLogin} key="login">

                <label className={styles.field}>
                  <span className={styles.label}>Email</span>
                  <input
                    className={styles.input}
                    name="mail_id"
                    placeholder="Enter your email"
                    type="email"
                    value={loginForm.mail_id}
                    onChange={handleLoginChange}
                    autoComplete="email"
                  />
                </label>

                <div className={styles.field}>
                  <span className={styles.label}>Password</span>
                  <div className={styles.inputWrap}>
                    <input
                      className={styles.input}
                      name="password"
                      placeholder="Enter your password"
                      type={showLoginPw ? "text" : "password"}
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowLoginPw((v) => !v)}
                      tabIndex={-1}
                      aria-label={showLoginPw ? "Hide password" : "Show password"}
                    >
                      <EyeIcon open={showLoginPw} />
                    </button>
                  </div>
                </div>

                <button className={styles.submitButton} disabled={loading} type="submit">
                  {loading ? "Signing in" : "Sign In"}
                </button>
              </form>
            )}

            {/* switch hint */}
            <p className={styles.hint}>
              {isSignup ? (
                <>Already have an account?{" "}
                  <button type="button" className={styles.hintToggle} onClick={() => handleModeSwitch("login")}>
                    Switch to login
                  </button>
                </>
              ) : (
                <>Need an account?{" "}
                  <button type="button" className={styles.hintToggle} onClick={() => handleModeSwitch("signup")}>
                    Switch to signup
                  </button>
                </>
              )}
            </p>

          </div>
        </div>
      </section>

      {/* â”€â”€ RIGHT PANE â”€â”€ */}
      <aside className={styles.rightPane}>
        <div className={styles.gradientOverlay} />
        <div className={styles.orb + " " + styles.orb1} />
        <div className={styles.orb + " " + styles.orb2} />
        <div className={styles.orb + " " + styles.orb3} />
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} />
            InsightPDF Engine
          </span>
          <h2 className={styles.heroTitle}>
            Search, organize,<br />and explore documents<br />in one clean workspace.
          </h2>
          <p className={styles.heroText}>
            Upload PDFs, run intelligent queries, and track every experiment - all from one professional platform.
          </p>
          <div className={styles.heroStats}>
            {RIGHT_STATS.map((s) => (
              <div key={s} className={styles.heroStat}>
                <span className={styles.heroStatDot} />
                {s}
              </div>
            ))}
          </div>
        </div>
      </aside>

    </main>
  );
}

