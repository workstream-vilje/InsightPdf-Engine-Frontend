'use client';

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './styles.module.css';

const DashboardLayout = ({
  sidebar,
  secondarySidebar,
  header,
  children,
  className,
  isCollapsed = false,
  isSecondaryCollapsed = false,
  isSidebarMaximized = false
}) => {
  return (
    <div className={classNames(styles.layout, className)}>
      {/* ── GLOBAL TOP BAR (Spans 100% width) ────────────────────── */}
      <header className={styles.globalHeader}>
        {header}
      </header>

      {/* ── WORKSPACE REGION (Below Top Bar) ──────────────────────── */}
      <div className={styles.workspaceRegion}>

        {/* Left Sidebar (Pipeline Config) - Only render if present */}
        {sidebar && (
          <aside className={classNames(styles.sidebar, {
            [styles.sidebarCollapsed]: isCollapsed && !isSidebarMaximized,
            [styles.sidebarMaximized]: isSidebarMaximized
          })}>
            <div className={styles.sidebarContent}>
              {sidebar}
            </div>
          </aside>
        )}

        {/* Center Panel (Knowledge Canvas) - Hidden if sidebar is maximized */}
        {!isSidebarMaximized && (
          <main className={styles.main}>
            <section className={styles.content}>
              <div className={styles.contentInner}>
                {children}
              </div>
            </section>
          </main>
        )}

        {/* Right Sidebar (Real-Time Results) - Hidden if sidebar is maximized */}
        {(secondarySidebar && !isSidebarMaximized) && (
          <aside className={classNames(styles.secondarySidebar, { [styles.secondaryCollapsed]: isSecondaryCollapsed })}>
            <div className={styles.sidebarContent}>
              {secondarySidebar}
            </div>
          </aside>
        )}

      </div>
    </div>
  );
};

DashboardLayout.propTypes = {
  sidebar: PropTypes.node,
  secondarySidebar: PropTypes.node,
  header: PropTypes.node,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  isCollapsed: PropTypes.bool,
  isSecondaryCollapsed: PropTypes.bool,
};

DashboardLayout.defaultProps = {
  className: "",
};

export { DashboardLayout };
