import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './styles.module.css';

const ScrollArea = ({ children, className }) => {
  return (
    <div className={classNames(styles.scrollArea, className)}>
      <div className={styles.viewport}>
        {children}
      </div>
    </div>
  );
};

ScrollArea.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

ScrollArea.defaultProps = {
  className: "",
};

export { ScrollArea };
