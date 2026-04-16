import React from 'react';
import classNames from 'classnames';
import { ArrowRight } from "lucide-react";
import { CHUNKING_STRATEGIES } from "@/lib/chunking/data";
import { PIPELINE_STEPS } from "@/lib/chunking/data";
import styles from './PipelineIntegrationBar.module.css';

const steps = PIPELINE_STEPS;

const PipelineIntegrationBar = ({ activeStrategy }) => {
  const strategyLabel = activeStrategy
    ? CHUNKING_STRATEGIES.find((s) => s.id === activeStrategy)?.label ?? activeStrategy
    : null;

  return (
    <div className={styles.integrationBar}>
      <div className={styles.stepList}>
        {steps.map((step, i) => (
          <div key={step.key} className={styles.stepItemWrapper}>
            <div
              className={classNames(styles.stepItem, {
                [styles.highlight]: step.highlight
              })}
            >
              {step.highlight && strategyLabel ? strategyLabel : step.label}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight size={12} className={styles.separator} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineIntegrationBar;
