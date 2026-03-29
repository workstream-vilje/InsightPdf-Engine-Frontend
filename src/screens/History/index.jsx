"use client";
import React from 'react';
import { DashboardLayout } from "@/layouts/dashboard-layout";
import TopBar from "@/components/features/dashboard/TopBar";
import HistoryView from "@/components/features/history/HistoryView";
import styles from './styles.module.css';

const HistoryScreen = () => {
  // Navigation dummy state
  const [bottomPanelState, setBottomPanelState] = React.useState('hidden');

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
