"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/toast/ToastProvider";
import styles from "./auth.module.css";
import { setAuthSession } from "@/services/auth";
import { ROUTE_PATHS } from "@/utils/routepaths";

const initialSignupForm = { name: "", mail_id: "", password: "" };
const initialLoginForm = { mail_id: "", password: "" };

const emailLooksValid = (v) => /\S+@\S+\.\S+/.test(v);

const authBases = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST || "localhost";
  const port = process.env.NEXT_PUBLIC_API_PORT || "8000";
  return [...new Set([
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
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ct = res.headers.get("content-type") || "";
      const isJson = ct.includes("application/json");
      const parsed = isJson ? await res.json() : await res.text();
      if (!res.ok) {
        const msg = (isJson && (parsed?.detail || parsed?.message || parsed?.error)) || res.statusText || "Request failed";
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      return parsed;
    } catch (e) { lastError = e; }
  }
  throw lastError || new Error("Unable to connect to the auth service.");
};

const RIGHT_STATS = [
  "Smart PDF ingestion & chunking",
  "RAG queries with self-reflection",
  "Experiment analytics & RAGAS scores",
];

export default function AuthPage({ mode }) {
  const router = useRouter();
  const { isAuthenticated, isAuthInitialized } = useAuth();
  const { showToast } = useToast();
  const isSignup = mode === "signup";

  const [switchingMode, setSwitchingMode] = useState("");
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [loading, setLoading] = useState(false);
  const switchTimerRef = useRef(null);

  useEffect(() => {
    if (isAuthInitialized && isAuthenticated) {
      router.replace(ROUTE_PATHS.WORKSPACE_UPLOAD);
    }
  }, [isAuthInitialized, isAuthenticated, router]);

  useEffect(() => () => { if (switchTimerRef.current) clearTimeout(switchTimerRef.current); }, []);

  const activeMode = switchingMode || mode;

  const handleModeSwitch = (next) => {
    if (next === mode || switchingMode) return;
    setSwitchingMode(next);
    switchTimerRef.current = setTimeout(() => {
      router.push(next === "signup" ? ROUTE_PATHS.AUTH_SIGNUP : ROUTE_PATHS.AUTH_LOGIN);
    }, 200);
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupForm((c) => ({ ...c, [name]: value }));
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm((c) => ({ ...c, [name]: value }));
  };

  const handleSignup = async (e) => {
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
    setLoading(true);
    try {
      const res = await callAuthApi("/auth/signup", {
        name: signupForm.name.trim(),
        mail_id: signupForm.mail_id.trim(),
        password: signupForm.password,
      });
      showToast({ title: "Sign up", variant: "success", message: res?.message || "Account created. Please log in." });
      setSignupForm(initialSignupForm);
      switchTimerRef.current = setTimeout(() => router.push(ROUTE_PATHS.AUTH_LOGIN), 500);
    } catch (err) {
      showToast({ title: "Authentication", variant: "error", message: err?.message || "Unable to sign up." });
    } finally {
      setLoading(false);
    }
  };

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
      const res = await callAuthApi("/auth/login", {
        mail_id: loginForm.mail_id.trim(),
        password: loginForm.password,
      });
      setAuthSession({
        accessToken: res?.access_token,
        refreshToken: res?.refresh_token,
        userId: res?.user_id,
        name: res?.name,
        mailId: res?.mail_id,
      });
      showToast({ title: "Login", variant: "success", message: res?.message || "Login successful." });
      switchTimerRef.current = setTimeout(() => router.push("/workspace"), 500);
    } catch (err) {
      showToast({ title: "Authentication", variant: "error", message: err?.message || "Unable to login." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>

      {/* ── LEFT PANE ── */}
      <section className={styles.leftPane}>
        <div className={styles.leftInner}>

          {/* top bar — always at top */}
          <div className={styles.topRow}>
            <Link className={styles.brand} href={ROUTE_PATHS.HOME}>
              <span className={styles.brandMark} />
              InsightPDF
            </Link>
            <Link className={styles.homeLink} href={ROUTE_PATHS.HOME}>
              ← Home
            </Link>
          </div>

          {/* centre zone — toggle + header always at same vertical position */}
          <div className={styles.centreZone}>

            {/* mode toggle — FIXED position, never moves */}
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
                {isSignup ? "Create your account" : "Sign in to your account"}
              </h1>
              <p className={styles.description}>
                {isSignup
                  ? "Create your account to start using the InsightPDF workspace."
                  : "Enter your email and password to continue."}
              </p>
            </div>

            {/* form — only this part changes height */}
            {isSignup ? (
              <form className={styles.form} onSubmit={handleSignup} key="signup">
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
                <label className={styles.field}>
                  <span className={styles.label}>Password</span>
                  <input
                    className={styles.input}
                    name="password"
                    placeholder="Create your password"
                    type="password"
                    value={signupForm.password}
                    onChange={handleSignupChange}
                    autoComplete="new-password"
                  />
                </label>
                <button className={styles.submitButton} disabled={loading} type="submit">
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>
            ) : (
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
                <label className={styles.field}>
                  <span className={styles.label}>Password</span>
                  <input
                    className={styles.input}
                    name="password"
                    placeholder="Enter your password"
                    type="password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    autoComplete="current-password"
                  />
                </label>
                <button className={styles.submitButton} disabled={loading} type="submit">
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            )}

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

      {/* ── RIGHT PANE  –  never moves ── */}
      <aside className={styles.rightPane}>
        <div className={styles.gradientOverlay} />

        {/* animated floating orbs */}
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
            Upload PDFs, run intelligent queries, and track every experiment — all from one professional platform.
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
