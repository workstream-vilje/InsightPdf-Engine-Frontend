import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Check } from 'lucide-react';
import styles from './styles.module.css';

const Checkbox = ({ checked, onCheckedChange, disabled, className, asSpan }) => {
  const mergedClass = classNames(styles.checkbox, { [styles.checked]: checked }, className);
  if (asSpan) {
    return (
      <span className={mergedClass} aria-hidden="true">
        {checked && <Check size={12} className={styles.icon} />}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={mergedClass}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      disabled={disabled}
    >
      {checked && <Check size={12} className={styles.icon} />}
    </button>
  );
};

Checkbox.propTypes = {
  checked: PropTypes.bool,
  onCheckedChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  asSpan: PropTypes.bool,
};

Checkbox.defaultProps = {
  checked: false,
  disabled: false,
  className: "",
  asSpan: false,
};

export { Checkbox };
