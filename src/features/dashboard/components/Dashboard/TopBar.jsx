"use client";
import React from 'react';
import classNames from 'classnames';
import { useRouter, usePathname } from "next/navigation";
import Image from 'next/image';
import ViljeLogo from '@/assets/images/vilje-logo.jpg';
import {
  GitCompare,
  Play,
  History,
  Settings,
  Grid,
  BarChart2,
  Loader2,
  Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/utils/routepaths";
import styles from './TopBar.module.css';

const TopBar = ({ onStatsClick, isStatsActive, isRunning, onRun }) => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className={styles.topbar}>
      {/* ── LEFT GROUP: Logo ────────────────────────────────────── */}
      {/* ── LEFT GROUP: Logo (Locked to Sidebar Axis) ────────────── */}
      <div className={styles.leftGroup}>
        <div className={styles.logoArea} onClick={() => router.push(ROUTE_PATHS.HOME)}>
          <div className={styles.logoContainer}>
            <div className={styles.logoWrapper}>
              <Image
                src={ViljeLogo}
                alt="Vilje Logo"
                width={36}
                height={36}
                className={styles.brandLogo}
              />
            </div>
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>VILJE</span>
            <span className={styles.brandSub}>RAG CANVAS</span>
          </div>
        </div>
      </div>

      {/* ── CENTER GROUP: Main Navigation ─────────────────────────── */}
      <div className={styles.centerGroup}>
        <nav className={styles.navGroup}>
          <button
            className={classNames(styles.navItem, { [styles.navItemActive]: pathname === ROUTE_PATHS.HOME })}
            onClick={() => router.push(ROUTE_PATHS.HOME)}
            title="Dashboard"
          >
            <Grid size={15} className={styles.navIcon} />
            <span>Dashboard</span>
          </button>

          <button
            className={classNames(styles.navItem, { [styles.navItemActive]: pathname === ROUTE_PATHS.HISTORY })}
            onClick={() => router.push(ROUTE_PATHS.HISTORY)}
            title="History"
          >
            <History size={15} className={styles.navIcon} />
            <span>History</span>
          </button>
        </nav>
      </div>

      {/* ── RIGHT GROUP: Unified Shared Actions ───────────────────── */}
      <div className={styles.rightGroup}>
        <div className={styles.actionsContainer}>
          <button
            className={classNames(styles.actionBtn, { [styles.actionBtnActive]: isStatsActive })}
            onClick={onStatsClick}
            title="Monitoring Stats"
          >
            <BarChart2 size={16} />
          </button>

          <div className={styles.innerDivider} />

          <button className={styles.actionBtn} title="Compare Models">
            <GitCompare size={16} />
          </button>

          <div className={styles.innerDivider} />

          <Button
            className={classNames(styles.runShellBtn, { [styles.runningBtn]: isRunning })}
            title={isRunning ? "Running Pipeline..." : "Run Pipeline"}
            onClick={onRun}
          >
            {isRunning ? (
              <Loader2 size={14} className={styles.spinIcon} />
            ) : (
              <Play size={14} className={styles.runIcon} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
