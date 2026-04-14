"use client";

import Link from "next/link";
import { Bell, BarChart3, ChevronRight, History } from "lucide-react";
import styles from "./styles.module.css";

const getUserInitials = (userProfile) => {
  const name = String(userProfile?.name || "").trim();
  if (name) {
    const letters = name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    if (letters) return letters;
  }
  return String(userProfile?.email || "U").trim().charAt(0).toUpperCase();
};

const ACTION_ICONS = {
  notifications: Bell,
  history: History,
  analytics: BarChart3,
  metrics: BarChart3,
};

/**
 * @param {{ label: string, href?: string }[]} [breadcrumbItems]
 * Segments without `href` render as the current page (not clickable).
 * @param {import("react").ReactNode} [endSlot] — Renders in the right cluster before icon actions (e.g. Open chat).
 */
export default function TopNavbar({ userProfile, actions = [], breadcrumbItems = null, endSlot = null }) {
  const initial = getUserInitials(userProfile);
  const name = userProfile?.name || "User";
  const email = userProfile?.email || "user@company.com";

  const crumbs = Array.isArray(breadcrumbItems) ? breadcrumbItems.filter(Boolean) : [];

  return (
    <header className={styles.topNav}>
      <div className={styles.leftArea}>
        <div className={styles.brandDot} />
        {crumbs.length > 0 ? (
          <nav className={styles.breadcrumbNav} aria-label="Breadcrumb">
            <ol className={styles.breadcrumbList}>
              {crumbs.map((item, index) => (
                <li key={`${item.label}-${index}`} className={styles.breadcrumbItem}>
                  {index > 0 && (
                    <ChevronRight size={14} className={styles.breadcrumbChevron} aria-hidden />
                  )}
                  {item.href ? (
                    <Link href={item.href} className={styles.breadcrumbLink}>
                      {item.label}
                    </Link>
                  ) : (
                    <span className={styles.breadcrumbCurrent} aria-current="page">
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : (
          <span className={styles.orgText}>{email}&apos;s Org</span>
        )}
      </div>

      <div className={styles.rightArea}>
        {endSlot ? <div className={styles.endSlot}>{endSlot}</div> : null}
        {actions.map((action) => {
          const Icon = ACTION_ICONS[action.icon] || Bell;
          return (
            <button
              key={action.id}
              type="button"
              className={styles.actionButton}
              onClick={action.onClick}
              title={action.label}
              aria-label={action.label}
            >
              <Icon size={15} />
            </button>
          );
        })}
        <div className={styles.userCard} title={name}>
          <div className={styles.userAvatar}>{initial}</div>
          <div className={styles.userInfo}>
            <strong>{name}</strong>
            <span>{email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
