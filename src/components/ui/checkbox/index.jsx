import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Check } from 'lucide-react';
import styles from './styles.module.css';

const Checkbox = ({ checked, onCheckedChange, disabled, className }) => {
  return (
    <button
      type="button"
      className={classNames(styles.checkbox, { [styles.checked]: checked }, className)}
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
};

Checkbox.defaultProps = {
  checked: false,
  disabled: false,
  className: "",
};

export { Checkbox };
