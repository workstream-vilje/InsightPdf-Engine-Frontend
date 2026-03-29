import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './styles.module.css';

const Switch = ({ checked, onCheckedChange, disabled, className }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={classNames(styles.switch, { [styles.checked]: checked }, className)}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      disabled={disabled}
    >
      <span className={styles.thumb} />
    </button>
  );
};

Switch.propTypes = {
  checked: PropTypes.bool,
  onCheckedChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

Switch.defaultProps = {
  checked: false,
  disabled: false,
  className: "",
};

export { Switch };
