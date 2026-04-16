"use client";
import React from 'react';
import { DashboardLayout } from "@/layouts/dashboard-layout";
import HistoryView from "@/features/history/components/History/HistoryView";
import styles from './History.module.css';

const HistoryScreen = () => {
  return (
    <DashboardLayout
      header={null}
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
