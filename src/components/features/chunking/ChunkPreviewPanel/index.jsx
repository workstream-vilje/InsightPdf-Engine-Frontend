import React from 'react';
import classNames from 'classnames';
import { Eye, Hash, Type, AlignLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MOCK_CHUNKS } from "@/lib/chunking/data";
import { generatePreviewChunks } from "@/utils/functions/data-generators";
import styles from './styles.module.css';

const ChunkPreviewPanel = ({ strategy = "recursive", chunkSize = 1000, overlap = 200 }) => {
  const chunks = generatePreviewChunks(strategy, chunkSize, overlap, MOCK_CHUNKS);

  return (
    <div className={styles.previewPanel}>
      <div className={styles.panelHeader}>
        <Eye size={16} className={styles.headerIcon} />
        <span className={styles.headerTitle}>
          Chunk Preview
        </span>
        <Badge variant="outline" className={styles.headerBadge}>
          {chunks.length} chunks
        </Badge>
      </div>

      <ScrollArea className={styles.scrollArea}>
        <div className={styles.chunkList}>
          {chunks.map((chunk) => (
            <div
              key={chunk.id}
              className={styles.chunkCard}
            >
              {/* Chunk Header */}
              <div className={styles.chunkHeader}>
                <div className={styles.chunkMeta}>
                  <span className={styles.chunkId}>
                    #{chunk.id}
                  </span>
                  <div className={styles.metaItem}>
                    <Hash size={10} />
                    <span>{chunk.tokens} tokens</span>
                  </div>
                  <div className={styles.metaItem}>
                    <Type size={10} />
                    <span>{chunk.chars} chars</span>
                  </div>
                </div>
                {(chunk.overlapStart > 0 || chunk.overlapEnd > 0) && (
                  <div className={styles.overlapInfo}>
                    <AlignLeft size={10} className={styles.warningIcon} />
                    <span className={styles.warningText}>
                      overlap: {chunk.overlapStart > 0 ? `↑${chunk.overlapStart}` : ""}{" "}
                      {chunk.overlapEnd > 0 ? `↓${chunk.overlapEnd}` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Chunk Text */}
              <div className={styles.chunkContent}>
                {chunk.overlapStart > 0 && (
                  <span className={styles.overlapMarker}>
                    {"[overlap] "}
                  </span>
                )}
                <span className={styles.chunkText}>
                  {chunk.text}
                </span>
                {chunk.overlapEnd > 0 && (
                  <span className={styles.overlapMarker}>
                    {" [overlap]"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChunkPreviewPanel;
