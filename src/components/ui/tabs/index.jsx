"use client";
import React, { useState, createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './styles.module.css';

const TabsContext = createContext(null);

const Tabs = ({ children, defaultValue, className }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={classNames(styles.tabs, className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

Tabs.propTypes = {
  children: PropTypes.node.isRequired,
  defaultValue: PropTypes.string,
  className: PropTypes.string,
};

const TabsList = ({ children, className }) => (
  <div className={classNames(styles.list, className)}>
    {children}
  </div>
);

TabsList.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const TabsTrigger = ({ children, value, onClick, className }) => {
  const context = useContext(TabsContext);
  if (!context) return null;

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  const handleClick = (e) => {
    setActiveTab(value);
    if (onClick) onClick(e);
  };

  return (
    <button
      className={classNames(styles.trigger, { [styles.active]: isActive }, className)}
      onClick={handleClick}
      type="button"
      data-state={isActive ? 'active' : 'inactive'}
    >
      {children}
    </button>
  );
};

TabsTrigger.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

const TabsContent = ({ children, value, className }) => {
  const context = useContext(TabsContext);
  if (!context) return null;

  const { activeTab } = context;
  if (value !== activeTab) return null;

  return (
    <div className={classNames(styles.content, className)}>
      {children}
    </div>
  );
};

TabsContent.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
