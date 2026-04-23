"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import styles from "./toast.module.css";

const ToastContext = createContext(null);

function makeToastId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @typedef {"error" | "success" | "warning" | "info"} ToastVariant
 */

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      message,
      title,
      variant = "error",
      duration = 3000,
    }) => {
      const text = String(message ?? "").trim();
      if (!text) return null;

      const id = makeToastId();
      setToasts((prev) => [
        ...prev,
        {
          id,
          message: text,
          title: title ? String(title) : "",
          variant,
        },
      ]);

      if (duration > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  const portal =
    isClient
      ? createPortal(
          <div className={styles.viewport} aria-live="polite">
            {toasts.map((t) => {
              const variantClass = styles[`variant_${t.variant}`] || styles.variant_info;
              return (
                <div
                  key={t.id}
                  className={`${styles.toast} ${variantClass}`}
                  role="status"
                >
                  <div className={styles.toastBody}>
                    {t.title ? <p className={styles.toastTitle}>{t.title}</p> : null}
                    <p className={styles.toastMessage}>{t.message}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.toastClose}
                    aria-label="Dismiss notification"
                    onClick={() => dismissToast(t.id)}
                  >
                    <X size={16} strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portal}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
