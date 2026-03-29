"use client";
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { ChevronDown } from 'lucide-react';
import styles from './styles.module.css';

const SelectContext = React.createContext();

const Select = ({ children, value, onValueChange, defaultValue, className }) => {
  const [internalValue, setInternalValue] = useState(value || defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  const currentValue = value !== undefined ? value : internalValue;

  const handleSelect = (val) => {
    if (onValueChange) onValueChange(val);
    setInternalValue(val);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find the label for the current value by scanning children
  let currentLabel = null;
  React.Children.forEach(children, child => {
    if (child.type === SelectContent) {
      React.Children.forEach(child.props.children, item => {
        if (item && item.props && item.props.value === currentValue) {
          currentLabel = item.props.children;
        }
      });
    }
  });

  return (
    <SelectContext.Provider value={{ isOpen, setIsOpen, currentValue, handleSelect, currentLabel }}>
      <div className={classNames(styles.select, className)} ref={selectRef}>
        {React.Children.map(children, child => {
          if (child.type === SelectTrigger) return child;
          if (child.type === SelectContent) return child;
          return child;
        })}
      </div>
    </SelectContext.Provider>
  );
};

Select.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.string,
  onValueChange: PropTypes.func,
  defaultValue: PropTypes.string,
  className: PropTypes.string,
};

const SelectTrigger = ({ children, className }) => {
  const { isOpen, setIsOpen, currentLabel } = React.useContext(SelectContext);
  return (
    <button 
      className={classNames(styles.trigger, { [styles.open]: isOpen }, className)}
      onClick={() => setIsOpen(!isOpen)}
      type="button"
    >
      <span className={styles.value}>
        {currentLabel || children || "Select..."}
      </span>
      <ChevronDown size={14} className={styles.icon} />
    </button>
  );
};

SelectTrigger.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

const SelectValue = ({ placeholder }) => {
  const { currentLabel } = React.useContext(SelectContext);
  return <span className={styles.value}>{currentLabel || placeholder}</span>;
}

SelectValue.propTypes = {
  placeholder: PropTypes.string,
};

const SelectContent = ({ children, className }) => {
  const { isOpen, handleSelect, currentValue } = React.useContext(SelectContext);
  if (!isOpen) return null;
  return (
    <div className={classNames(styles.content, className)}>
      {React.Children.map(children, child => {
        if (!child) return null;
        return React.cloneElement(child, { 
          onSelect: () => handleSelect(child.props.value),
          isSelected: currentValue === child.props.value
        });
      })}
    </div>
  );
};

SelectContent.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const SelectItem = ({ children, value, onSelect, isSelected, className }) => (
  <div 
    className={classNames(styles.item, { [styles.selected]: isSelected }, className)}
    onClick={onSelect}
  >
    <span className={styles.itemText}>{children}</span>
  </div>
);

SelectItem.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.string.isRequired,
  onSelect: PropTypes.func,
  isSelected: PropTypes.bool,
  className: PropTypes.string,
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
