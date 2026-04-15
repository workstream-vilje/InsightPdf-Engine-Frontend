"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/toast/ToastProvider";
import styles from "./auth.module.css";
import { setAuthSession } from "@/services/auth";
import { ROUTE_PATHS } from "@/utils/routepaths";

const initialSignupForm = {
  name: "",
  mail_id: "",
  password: "",
};

const initialLoginForm = {
  mail_id: "",
  password: "",
};

const emailLooksValid = (value) => /\S+@\S+\.\S+/.test(value);

const authBases = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST || "localhost";
  const port = process.env.NEXT_PUBLIC_API_PORT || "8000";
  const candidates = [
    `http://${host}:${port}/api/v1`,
    "http://127.0.0.1:8000/api/v1",
    "http://localhost:8000/api/v1",
  ].filter(Boolean);

  return [...new Set(candidates)];
};

const callAuthApi = async (path, payload) => {
  let lastError = null;

  for (const base of authBases()) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const parsed = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          (isJson && (parsed?.detail || parsed?.message || parsed?.error)) ||
          response.statusText ||
          "Request failed";
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      return parsed;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to connect to the auth service.");
};

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

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) {
        window.clearTimeout(switchTimerRef.current);
      }
    };
  }, []);

  const activeMode = switchingMode || mode;

  const handleModeSwitch = (nextMode) => {
    if (nextMode === mode || switchingMode) return;

    setSwitchingMode(nextMode);
    switchTimerRef.current = window.setTimeout(() => {
      router.push(nextMode === "signup" ? ROUTE_PATHS.AUTH_SIGNUP : ROUTE_PATHS.AUTH_LOGIN);
    }, 180);
  };

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupForm((current) => ({ ...current, [name]: value }));
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  };

  const handleSignup = async (event) => {
    event.preventDefault();

    if (!signupForm.name.trim()) {
      showToast({
        title: "Sign up",
        variant: "warning",
        message: "Enter your name to create the account.",
      });
      return;
    }

    if (!emailLooksValid(signupForm.mail_id)) {
      showToast({
        title: "Sign up",
        variant: "warning",
        message: "Enter a valid mail id.",
      });
      return;
    }

    if (signupForm.password.length < 6) {
      showToast({
        title: "Sign up",
        variant: "warning",
        message: "Password should be at least 6 characters.",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: signupForm.name.trim(),
        mail_id: signupForm.mail_id.trim(),
        password: signupForm.password,
      };

      const response = await callAuthApi("/auth/signup", payload);

      showToast({
        title: "Sign up",
        variant: "success",
        message: response?.message || "Signup successful. Continue with login.",
      });
      setSignupForm(initialSignupForm);
      switchTimerRef.current = window.setTimeout(() => {
        router.push(ROUTE_PATHS.AUTH_LOGIN);
      }, 500);
    } catch (error) {
      showToast({
        title: "Authentication",
        variant: "error",
        message: error?.message || "Unable to sign up right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!emailLooksValid(loginForm.mail_id)) {
      showToast({
        title: "Login",
        variant: "warning",
        message: "Enter a valid mail id.",
      });
      return;
    }

    if (!loginForm.password) {
      showToast({
        title: "Login",
        variant: "warning",
        message: "Enter your password to login.",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        mail_id: loginForm.mail_id.trim(),
        password: loginForm.password,
      };

      const response = await callAuthApi("/auth/login", payload);

      setAuthSession({
        accessToken: response?.access_token,
        refreshToken: response?.refresh_token,
        userId: response?.user_id,
        name: response?.name,
        mailId: response?.mail_id,
      });

      showToast({
        title: "Login",
        variant: "success",
        message: response?.message || "Login successful.",
      });

      switchTimerRef.current = window.setTimeout(() => {
        router.push("/workspace");
      }, 500);
    } catch (error) {
      showToast({
        title: "Authentication",
        variant: "error",
        message: error?.message || "Unable to login right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.leftPane}>
        <div className={styles.leftInner}>
          <div className={styles.topRow}>
            <Link className={styles.brand} href={ROUTE_PATHS.HOME}>
              <span className={styles.brandMark} />
              InsightPDF
            </Link>

            <Link className={styles.homeLink} href={ROUTE_PATHS.HOME}>
              Home
            </Link>
          </div>

          <div
            className={`${styles.formWrap} ${isSignup ? styles.formWrapSignup : ""}`}
          >
            <div
              className={`${styles.modeRow} ${
                activeMode === "signup" ? styles.modeRowSignup : styles.modeRowLogin
              }`}
            >
              <button
                className={`${styles.modeLink} ${
                  activeMode === "login" ? styles.modeLinkActive : ""
                }`}
                type="button"
                onClick={() => handleModeSwitch("login")}
              >
                Login
              </button>
              <button
                className={`${styles.modeLink} ${
                  activeMode === "signup" ? styles.modeLinkActive : ""
                }`}
                type="button"
                onClick={() => handleModeSwitch("signup")}
              >
                Sign Up
              </button>
            </div>

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

            {isSignup ? (
              <form className={styles.form} onSubmit={handleSignup}>
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
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>
            ) : (
              <form className={styles.form} onSubmit={handleLogin}>
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
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )}

            <p className={styles.hint}>
              {isSignup
                ? "Already have an account? Switch to login."
                : "Need an account? Switch to signup."}
            </p>
          </div>
        </div>
      </section>

      <aside className={styles.rightPane}>
        <div className={styles.gradientOverlay} />
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>InsightPDF Engine</span>
          <h2 className={styles.heroTitle}>
            Search, organize, and explore documents in one clean workspace.
          </h2>
          <p className={styles.heroText}>
            This panel is intentionally simple for now. We can replace it later with artwork,
            screenshots, or illustrations.
          </p>
        </div>
      </aside>
    </main>
  );
}
