"use client";

import classNames from "classnames";
import { ArrowLeft, LogOut, Settings } from "lucide-react";
import styles from "./Home/Projects.module.css";

const AppWorkspaceRail = ({
  onProjects,
  onSettings,
  onLogout,
  projectsButtonLabel = "Projects",
  projectsButtonTitle = "Projects",
  ProjectsNavIcon = ArrowLeft,
}) => (
  <aside className={styles.appWorkspaceRail} aria-label="Account and navigation">
    <div className={styles.appWorkspaceRailFlyout}>
      <div className={styles.appWorkspaceRailTop}>
        <button
          type="button"
          className={styles.appWorkspaceRailItem}
          onClick={onProjects}
          title={projectsButtonTitle}
        >
          <ProjectsNavIcon size={18} className={styles.appWorkspaceRailIcon} />
          <span className={styles.appWorkspaceRailLabel}>{projectsButtonLabel}</span>
        </button>
      </div>
      <div className={styles.appWorkspaceRailSpacer} aria-hidden />
      <div className={styles.appWorkspaceRailBottom}>
        <button
          type="button"
          className={styles.appWorkspaceRailItem}
          onClick={onSettings}
          title="Settings"
        >
          <Settings size={18} className={styles.appWorkspaceRailIcon} />
          <span className={styles.appWorkspaceRailLabel}>Settings</span>
        </button>
        <button
          type="button"
          className={classNames(styles.appWorkspaceRailItem, styles.appWorkspaceRailItemDanger)}
          onClick={onLogout}
          title="Log out"
        >
          <LogOut size={18} className={styles.appWorkspaceRailIcon} />
          <span className={styles.appWorkspaceRailLabel}>Log out</span>
        </button>
      </div>
    </div>
  </aside>
);

export default AppWorkspaceRail;
