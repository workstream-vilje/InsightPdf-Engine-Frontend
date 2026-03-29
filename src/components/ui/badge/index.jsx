import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './styles.module.css';

const Badge = ({ 
  children, 
  variant, 
  className 
}) => {
  const badgeClass = classNames(
    styles.badge,
    styles[`variant-${variant}`],
    className
  );

  return (
    <span className={badgeClass}>
      {children}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'outline', 'secondary', 'success', 'warning', 'destructive']),
  className: PropTypes.string,
};

Badge.defaultProps = {
  variant: 'default',
  className: "",
};

export { Badge };
