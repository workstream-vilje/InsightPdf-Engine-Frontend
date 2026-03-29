import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { ChevronRight, ChevronDown } from 'lucide-react';
import styles from './styles.module.css';

const Pipeline = ({ steps, activeStep, className, vertical }) => {
  return (
    <div className={classNames(styles.pipeline, { [styles.vertical]: vertical }, className)}>
      {steps.map((step, idx) => (
        <React.Fragment key={step.id || idx}>
          <div className={classNames(styles.step, {
            [styles.active]: idx === activeStep,
            [styles.completed]: idx < activeStep,
            [styles.verticalStep]: vertical
          })}>
            {step.icon && <span className={styles.icon}>{step.icon}</span>}
            <span className={styles.label}>{step.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={classNames(styles.separatorWrapper, { [styles.verticalSeparator]: vertical })}>
              {vertical ? (
                <ChevronDown className={styles.separator} size={14} />
              ) : (
                <ChevronRight className={styles.separator} size={14} />
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

Pipeline.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    label: PropTypes.string.isRequired,
    icon: PropTypes.node,
  })).isRequired,
  activeStep: PropTypes.number,
  className: PropTypes.string,
};

Pipeline.defaultProps = {
  activeStep: 0,
  className: "",
};

export { Pipeline };
