import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './styles.module.css';

const Label = ({ children, className, ...props }) => (
  <label 
    className={classNames(styles.label, className)}
    {...props}
  >
    {children}
  </label>
);

Label.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

Label.defaultProps = {
  className: "",
};

export { Label };
