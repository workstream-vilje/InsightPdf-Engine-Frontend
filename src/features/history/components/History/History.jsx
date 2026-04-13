"use client";
import React from 'react';
import { DashboardLayout } from "@/layouts/dashboard-layout";
import TopBar from "@/features/dashboard/components/Dashboard/TopBar";
import HistoryView from "@/features/history/components/History/HistoryView";
import styles from './History.module.css';

const HistoryScreen = () => {
  return (
    <DashboardLayout
      header={
        <TopBar
          onStatsClick={() => {}}
          isStatsActive={false}
          isRunning={false}
          onRun={() => {}}
        />
      }
      // When in History, we don't necessarily need the pipeline config sidebar
      // But we can keep it collapsed for consistent layout geometry
      sidebar={null}
      secondarySidebar={null}
      isCollapsed={true}
      isSecondaryCollapsed={true}
    >
      <div className={styles.container}>
        <HistoryView />
      </div>
    </DashboardLayout>
  );
};

export default HistoryScreen;
