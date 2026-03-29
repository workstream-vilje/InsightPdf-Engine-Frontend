/**
 * Reusable selection and toggle handlers.
 */

/**
 * Toggles an item in an array (adds if missing, removes if present).
 * @param {Array} currentList - Current list of selected items.
 * @param {*} item - Item to toggle.
 * @returns {Array} - New array with the item toggled.
 */
export const toggleListItem = (currentList, item) => {
  if (!currentList) return [item];
  return currentList.includes(item)
    ? currentList.filter((s) => s !== item)
    : [...currentList, item];
};

/**
 * Updates a specific key in an object.
 * Useful for state updates with IDs.
 */
export const updateMapItem = (prevMap, id, newValue) => {
  return { ...prevMap, [id]: newValue };
};
