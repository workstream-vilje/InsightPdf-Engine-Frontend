"use client";
import React from 'react';
import classNames from 'classnames';
import { DashboardLayout } from "@/layouts/dashboard-layout";
import TopBar from "@/components/features/dashboard/TopBar";
import ConfigPanel from "@/components/features/dashboard/ConfigPanel";
import CenterPanel from "@/components/features/dashboard/CenterPanel";
import ResultsPanel from "@/components/features/dashboard/ResultsPanel";
import MonitoringPanel from "@/components/features/dashboard/MonitoringPanel";
import styles from './styles.module.css';

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(true); // Left sidebar
  const [isRightCollapsed, setIsRightCollapsed] = React.useState(true); // Right sidebar
  const [bottomPanelState, setBottomPanelState] = React.useState('hidden'); // 'hidden', 'standard', 'maximized'
  const [isRunning, setIsRunning] = React.useState(false); // Pipeline running state

  const toggleBottomPanel = () => {
    setBottomPanelState(prev => prev === 'hidden' ? 'standard' : 'hidden');
  };

  const startSimulatedRun = () => {
    if (isRunning) return;
    setIsRunning(true);
    setBottomPanelState('standard'); // Auto-open monitoring on run

    // Simulated technical sequence
    setTimeout(() => {
      setIsRunning(false);
      // Optional: Update data here
    }, 3500);
  };

  return (
    <DashboardLayout
      header={
        <TopBar
          onStatsClick={toggleBottomPanel}
          isStatsActive={bottomPanelState !== 'hidden'}
          isRunning={isRunning}
          onRun={startSimulatedRun}
        />
      }
      sidebar={
        <ConfigPanel
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      }
      secondarySidebar={
        <ResultsPanel
          isCollapsed={isRightCollapsed}
          setIsCollapsed={setIsRightCollapsed}
        />
      }
      isCollapsed={isCollapsed}
      isSecondaryCollapsed={isRightCollapsed}
    >
      <div className={classNames(styles.container, styles[`bottom_${bottomPanelState}`])}>
        <div className={styles.topRegion}>
          <CenterPanel />
        </div>

        {bottomPanelState !== 'hidden' && (
          <div className={classNames(styles.bottomRegion, styles[`bottomRegion_${bottomPanelState}`])}>
            <MonitoringPanel
              state={bottomPanelState}
              setState={setBottomPanelState}
              onClose={() => setBottomPanelState('hidden')}
              isRunning={isRunning}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
