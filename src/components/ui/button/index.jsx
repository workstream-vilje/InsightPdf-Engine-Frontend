import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './styles.module.css';

const Button = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  children, 
  ...props 
}, ref) => {
  const buttonClass = classNames(
    styles.button,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    className
  );

  return (
    <button
      ref={ref}
      className={buttonClass}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'outline', 'ghost', 'destructive']),
  size: PropTypes.oneOf(['default', 'sm', 'lg', 'icon']),
  children: PropTypes.node,
};

Button.defaultProps = {
  className: "",
  variant: 'default',
  size: 'default',
};

export { Button };
