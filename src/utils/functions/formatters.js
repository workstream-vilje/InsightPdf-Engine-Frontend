/**
 * Unit and data formatting utilities.
 */

/**
 * Formats a value as a percentage.
 */
export const formatPercent = (val) => {
  if (typeof val !== 'number') return val;
  return `${val}%`;
};

/**
 * Formats a duration in seconds.
 */
export const formatSeconds = (val) => {
  if (typeof val !== 'number') return val;
  return `${val.toFixed(2)}s`;
};

/**
 * Formats a currency value.
 */
export const formatCurrency = (val, symbol = '$') => {
  if (typeof val !== 'number') return val;
  return `${symbol}${val.toFixed(4)}`;
};

/**
 * Formats memory in MB.
 */
export const formatMemory = (val) => {
  if (typeof val !== 'number') return val;
  return `${val.toFixed(1)} MB`;
};
