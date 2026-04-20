"use client";

import classNames from "classnames";
import { Checkbox } from "@/components/ui/checkbox";
import styles from "./Home/Projects.module.css";

const MultiSelectChips = ({
  options,
  selectedValues,
  onToggle,
  disabled = false,
  singleSelect = false,
}) => (
  <div className={classNames(styles.choiceGrid, { [styles.choiceGridDisabled]: disabled })}>
    {options.map((option) => {
      const checked = selectedValues.includes(option.value);
      return (
        <div
          key={option.value}
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={classNames(styles.choiceChip, { [styles.choiceChipActive]: checked })}
          aria-disabled={disabled}
          aria-pressed={checked}
          onClick={() => {
            if (disabled) return;
            if (singleSelect && checked) return;
            onToggle(option.value);
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (singleSelect && checked) return;
              onToggle(option.value);
            }
          }}
        >
          <Checkbox checked={checked} className={styles.choiceCheckbox} asSpan />
          <span>{option.label}</span>
        </div>
      );
    })}
  </div>
);

export default MultiSelectChips;
