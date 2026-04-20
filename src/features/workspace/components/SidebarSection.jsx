"use client";

import styles from "./Home/Projects.module.css";

const SidebarSection = ({ icon: Icon, title, description, expanded, children }) => (
  <section className={styles.sidebarSection}>
    <div className={styles.sidebarSectionHeader}>
      <div className={styles.sidebarSectionIcon}>
        <Icon size={16} />
      </div>
      {expanded && (
        <div>
          <p className={styles.sidebarSectionTitle}>{title}</p>
          {description && <p className={styles.sidebarSectionDescription}>{description}</p>}
        </div>
      )}
    </div>
    {expanded && <div className={styles.sidebarSectionBody}>{children}</div>}
  </section>
);

export default SidebarSection;
