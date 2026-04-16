/**
 * Deduplicate items by a stable string key (first occurrence wins, order preserved).
 */
export function dedupeByKey(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
