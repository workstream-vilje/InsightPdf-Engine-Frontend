import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './styles.module.css';

const Table = ({ children, className }) => (
  <div className={styles.container}>
    <table className={classNames(styles.table, className)}>
      {children}
    </table>
  </div>
);

Table.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const THeader = ({ children, className }) => (
  <thead className={classNames(styles.thead, className)}>
    {children}
  </thead>
);

THeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const TBody = ({ children, className }) => (
  <tbody className={classNames(styles.tbody, className)}>
    {children}
  </tbody>
);

TBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const TR = ({ children, className }) => (
  <tr className={classNames(styles.tr, className)}>
    {children}
  </tr>
);

TR.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const TH = ({ children, className }) => (
  <th className={classNames(styles.th, className)}>
    {children}
  </th>
);

TH.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const TD = ({ children, className }) => (
  <td className={classNames(styles.td, className)}>
    {children}
  </td>
);

TD.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export { Table, THeader, TBody, TR, TH, TD };
