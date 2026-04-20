"use client";

import styles from "./Home/Projects.module.css";

/**
 * Lightweight inline markdown → React nodes (no library).
 * Handles: headings, **bold**, *italic*, `code`, bullet lists,
 *          numbered lists, blockquotes, horizontal rules, line breaks.
 */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const nodes = [];
  let key = 0;

  const parseInline = (str) => {
    const parts = [];
    const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
    let last = 0;
    let m;
    let k = 0;
    while ((m = regex.exec(str)) !== null) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      if (m[1].startsWith("***")) parts.push(<strong key={k++}><em>{m[2]}</em></strong>);
      else if (m[1].startsWith("**")) parts.push(<strong key={k++}>{m[3]}</strong>);
      else if (m[1].startsWith("*")) parts.push(<em key={k++}>{m[4]}</em>);
      else if (m[1].startsWith("`")) parts.push(<code key={k++} className={styles.aiResponseInlineCode}>{m[5]}</code>);
      last = m.index + m[0].length;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) { nodes.push(<br key={key++} />); continue; }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      nodes.push(<hr key={key++} className={styles.aiResponseHr} />);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const Tag = `h${Math.min(level, 6)}`;
      nodes.push(<Tag key={key++} className={styles[`aiResponseH${level}`] || styles.aiResponseH3}>{parseInline(headingMatch[2])}</Tag>);
      continue;
    }

    const blockquoteMatch = trimmed.match(/^>\s*(.+)$/);
    if (blockquoteMatch) {
      nodes.push(<blockquote key={key++} className={styles.aiResponseBlockquote}>{parseInline(blockquoteMatch[1])}</blockquote>);
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      nodes.push(
        <div key={key++} className={styles.aiResponseListItem}>
          <span className={styles.aiResponseBulletDot} aria-hidden>•</span>
          <span>{parseInline(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    const listMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (listMatch) {
      nodes.push(
        <div key={key++} className={styles.aiResponseListItem}>
          <span className={styles.aiResponseListNum}>{listMatch[1]}.</span>
          <span>{parseInline(listMatch[2])}</span>
        </div>
      );
      continue;
    }

    nodes.push(<span key={key++} className={styles.aiResponseLine}>{parseInline(trimmed)}</span>);
  }
  return nodes;
}

export default renderMarkdown;
