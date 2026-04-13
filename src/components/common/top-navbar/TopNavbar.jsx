import { Bell, BarChart3, History } from "lucide-react";
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

export default function TopNavbar({ userProfile, actions = [] }) {
  const initial = getUserInitials(userProfile);
  const name = userProfile?.name || "User";
  const email = userProfile?.email || "user@company.com";

  return (
    <header className={styles.topNav}>
      <div className={styles.leftArea}>
        <div className={styles.brandDot} />
        <span className={styles.orgText}>{email}&apos;s Org</span>
      </div>

      <div className={styles.rightArea}>
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
