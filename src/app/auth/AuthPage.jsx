"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./auth.module.css";
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
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  const candidates = [
    configured,
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
  const isSignup = mode === "signup";
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

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
      setStatus({ type: "error", message: "Enter your name to create the account." });
      return;
    }

    if (!emailLooksValid(signupForm.mail_id)) {
      setStatus({ type: "error", message: "Enter a valid mail id." });
      return;
    }

    if (signupForm.password.length < 6) {
      setStatus({
        type: "error",
        message: "Password should be at least 6 characters.",
      });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = {
        name: signupForm.name.trim(),
        mail_id: signupForm.mail_id.trim(),
        password: signupForm.password,
      };

      const response = await callAuthApi("/auth/signup", payload);

      setStatus({
        type: "success",
        message: response?.message || "Signup successful. Continue with login.",
      });
      setSignupForm(initialSignupForm);
      setTimeout(() => {
        router.push(ROUTE_PATHS.AUTH_LOGIN);
      }, 500);
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "Unable to sign up right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!emailLooksValid(loginForm.mail_id)) {
      setStatus({ type: "error", message: "Enter a valid mail id." });
      return;
    }

    if (!loginForm.password) {
      setStatus({ type: "error", message: "Enter your password to login." });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = {
        mail_id: loginForm.mail_id.trim(),
        password: loginForm.password,
      };

      const response = await callAuthApi("/auth/login", payload);

      if (typeof window !== "undefined") {
        if (response?.access_token) {
          window.localStorage.setItem("access_token", response.access_token);
        }
        if (response?.refresh_token) {
          window.localStorage.setItem("refresh_token", response.refresh_token);
        }
        if (response?.user_id != null) {
          window.localStorage.setItem("user_id", String(response.user_id));
        }
        if (response?.name) {
          window.localStorage.setItem("user_name", response.name);
        }
        if (response?.mail_id) {
          window.localStorage.setItem("user_mail_id", response.mail_id);
        }
      }

      setStatus({
        type: "success",
        message: response?.message || "Login successful.",
      });

      setTimeout(() => {
        router.push("/workspace");
      }, 500);
    } catch (error) {
      setStatus({
        type: "error",
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

          <div className={styles.formWrap}>
            <div className={styles.modeRow}>
              <Link
                className={`${styles.modeLink} ${!isSignup ? styles.modeLinkActive : ""}`}
                href={ROUTE_PATHS.AUTH_LOGIN}
              >
                Login
              </Link>
              <Link
                className={`${styles.modeLink} ${isSignup ? styles.modeLinkActive : ""}`}
                href={ROUTE_PATHS.AUTH_SIGNUP}
              >
                Sign Up
              </Link>
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

            {status.message ? (
              <div
                className={`${styles.status} ${
                  status.type === "error" ? styles.statusError : styles.statusSuccess
                }`}
              >
                {status.message}
              </div>
            ) : null}

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
