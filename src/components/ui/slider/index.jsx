import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './styles.module.css';

const Slider = ({ value, onValueChange, min, max, step, className }) => {
  const percentage = ((value[0] - min) / (max - min)) * 100;

  return (
    <div className={classNames(styles.slider, className)}>
      <div className={styles.track}>
        <div 
          className={styles.range} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange && onValueChange([Number(e.target.value)])}
        className={styles.input}
      />
    </div>
  );
};

Slider.propTypes = {
  value: PropTypes.arrayOf(PropTypes.number).isRequired,
  onValueChange: PropTypes.func,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  className: PropTypes.string,
};

Slider.defaultProps = {
  min: 0,
  max: 100,
  step: 1,
  className: "",
};

export { Slider };
