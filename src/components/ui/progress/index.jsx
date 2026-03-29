import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './styles.module.css';

const Progress = ({ value, max, className }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={classNames(styles.progress, className)}>
      <div 
        className={styles.indicator} 
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
};

Progress.propTypes = {
  value: PropTypes.number,
  max: PropTypes.number,
  className: PropTypes.string,
};

Progress.defaultProps = {
  value: 0,
  max: 100,
  className: "",
};

export { Progress };
