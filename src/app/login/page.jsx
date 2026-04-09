"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

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

const UserIcon = () => <span className={styles.icon}>◌</span>;
const MailIcon = () => <span className={styles.icon}>✉</span>;
const LockIcon = () => <span className={styles.icon}>⌂</span>;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signup");
  const [animateSwap, setAnimateSwap] = useState(false);
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const shellClassName = useMemo(() => {
    const parts = [styles.shell];
    if (mode === "login") parts.push(styles.shellLogin);
    if (animateSwap) parts.push(styles.shellAnim);
    return parts.join(" ");
  }, [animateSwap, mode]);

  const triggerSwap = (nextMode) => {
    setAnimateSwap(false);
    setTimeout(() => {
      setMode(nextMode);
      setAnimateSwap(true);
      setTimeout(() => setAnimateSwap(false), 950);
    }, 10);
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
      setLoginForm({
        mail_id: payload.mail_id,
        password: "",
      });
      setSignupForm(initialSignupForm);
      triggerSwap("login");
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

  const showingSignup = mode === "signup";

  return (
    <main className={styles.page}>
      <section className={shellClassName}>
        {showingSignup ? (
          <>
            <section className={styles.formPane}>
              <div className={styles.paneInner}>
                <div className={styles.locale}>
                  <span className={styles.localeDot} />
                  English (US)
                </div>

                <div className={styles.copyBlock}>
                  <p className={styles.eyebrow}>Register now</p>
                  <h1 className={styles.title}>Sign Up For Free.</h1>
                  <p className={styles.subtitle}>Already have an account?</p>
                  <div className={styles.switchRow}>
                    <span>Jump straight into your workspace.</span>
                    <button
                      className={styles.switchButton}
                      type="button"
                      onClick={() => triggerSwap("login")}
                    >
                      Sign In.
                    </button>
                  </div>
                </div>

                <form className={styles.form} onSubmit={handleSignup}>
                  <label className={styles.field}>
                    <span className={styles.label}>Username</span>
                    <span className={styles.inputWrap}>
                      <input
                        className={styles.input}
                        name="name"
                        placeholder="yourusername"
                        value={signupForm.name}
                        onChange={handleSignupChange}
                        autoComplete="name"
                      />
                      <UserIcon />
                    </span>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>E-Mail</span>
                    <span className={styles.inputWrap}>
                      <input
                        className={styles.input}
                        name="mail_id"
                        placeholder="youremail@gmail.com"
                        type="email"
                        value={signupForm.mail_id}
                        onChange={handleSignupChange}
                        autoComplete="email"
                      />
                      <MailIcon />
                    </span>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Password</span>
                    <span className={styles.inputWrap}>
                      <input
                        className={styles.input}
                        name="password"
                        placeholder="****************"
                        type="password"
                        value={signupForm.password}
                        onChange={handleSignupChange}
                        autoComplete="new-password"
                      />
                      <LockIcon />
                    </span>
                  </label>

                  <button className={styles.submitButton} disabled={loading} type="submit">
                    {loading ? "Creating account..." : "Create account"}
                  </button>
                </form>

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
                  By clicking create account, you agree to the platform privacy policy and
                  can continue with login right after signup.
                </p>
              </div>
            </section>

            <IllustrationPanel />
          </>
        ) : (
          <>
            <IllustrationPanel />

            <section className={styles.formPane}>
              <div className={styles.paneInner}>
                <div className={styles.locale}>
                  <span className={styles.localeDot} />
                  InsightPDF Login
                </div>

                <div className={styles.copyBlock}>
                  <p className={styles.eyebrow}>Welcome back</p>
                  <h1 className={styles.title}>Login To Continue.</h1>
                  <p className={styles.subtitle}>Don&apos;t have an account yet?</p>
                  <div className={styles.switchRow}>
                    <span>Create your access in a few seconds.</span>
                    <button
                      className={styles.switchButton}
                      type="button"
                      onClick={() => triggerSwap("signup")}
                    >
                      Sign Up.
                    </button>
                  </div>
                </div>

                <form className={styles.form} onSubmit={handleLogin}>
                  <label className={styles.field}>
                    <span className={styles.label}>E-Mail</span>
                    <span className={styles.inputWrap}>
                      <input
                        className={styles.input}
                        name="mail_id"
                        placeholder="youremail@gmail.com"
                        type="email"
                        value={loginForm.mail_id}
                        onChange={handleLoginChange}
                        autoComplete="email"
                      />
                      <MailIcon />
                    </span>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Password</span>
                    <span className={styles.inputWrap}>
                      <input
                        className={styles.input}
                        name="password"
                        placeholder="****************"
                        type="password"
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        autoComplete="current-password"
                      />
                      <LockIcon />
                    </span>
                  </label>

                  <button className={styles.submitButton} disabled={loading} type="submit">
                    {loading ? "Signing in..." : "Login"}
                  </button>
                </form>

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
                  Access token and refresh token are stored locally after successful login so
                  the dashboard can call the backend immediately.
                </p>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function IllustrationPanel() {
  return (
    <section className={styles.artPane}>
      <div className={styles.artInner}>
        <div className={styles.brand}>
          <span className={styles.brandMark} />
          ocula
        </div>

        <div className={styles.device}>
          <div className={styles.deviceFrame}>
            <div className={styles.deviceBar} />
            <div className={styles.deviceCard} />
            <div className={styles.deviceCard} />
            <div className={styles.deviceCard} />
          </div>
        </div>

        <div className={styles.character}>
          <div className={styles.head} />
          <div className={styles.hairBun} />
          <div className={`${styles.arm} ${styles.armLeft}`} />
          <div className={`${styles.arm} ${styles.armRight}`}>
            <div className={styles.hand} />
          </div>
          <div className={styles.body}>
            <div className={styles.legLeft} />
            <div className={styles.legRight} />
          </div>
        </div>

        <div className={`${styles.orb} ${styles.orbOne}`} />
        <div className={`${styles.orb} ${styles.orbTwo}`} />
        <div className={styles.sceneLine} />
      </div>
    </section>
  );
}
