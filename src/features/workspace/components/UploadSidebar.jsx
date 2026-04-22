"use client";

import { Blocks, Database, FileText, FolderKanban, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  DATA_EXTRACTION_OPTIONS,
  EMBEDDING_OPTIONS,
  TEXT_PROCESSING_OPTIONS,
  VECTOR_STORE_OPTIONS,
} from "@/lib/projects/data";
import MultiSelectChips from "./MultiSelectChips";
import SidebarSection from "./SidebarSection";
import styles from "./Home/Projects.module.css";

export default function UploadSidebar({ activeWorkspace, updateActiveWorkspace, toggleWorkspaceValue, isImageFile = false }) {
  if (isImageFile) {
    return (
      <aside className={styles.workspaceQuerySidebar}>
        <div className={styles.workspaceContextSidebarInner}>
          <section className={styles.sidebarPane}>
            <div className={styles.sidebarGroupTitle}>Upload techniques</div>
            <div className={styles.sidebarPaneScroll} style={{ padding: "16px", color: "var(--muted-foreground, #888)", fontSize: 13, lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>
                Image files are processed automatically using built-in defaults.
              </p>
              <p style={{ margin: "8px 0 0", opacity: 0.7 }}>
                No configuration required.
              </p>
            </div>
          </section>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.workspaceQuerySidebar}>
      <div className={styles.workspaceContextSidebarInner}>
        <section className={styles.sidebarPane}>
          <div className={styles.sidebarGroupTitle}>Upload techniques</div>
          <div className={styles.sidebarPaneScroll}>
            <SidebarSection icon={Blocks} title="Chunk Length" description="Same control pattern as current UI" expanded>
              <div className={styles.chunkControl}>
                <Input
                  type="number"
                  value={activeWorkspace.chunkLength}
                  onChange={(e) => updateActiveWorkspace((c) => ({ ...c, chunkLength: Number(e.target.value || 0) }))}
                />
                <Slider
                  value={[activeWorkspace.chunkLength]}
                  onValueChange={([v]) => updateActiveWorkspace((c) => ({ ...c, chunkLength: v }))}
                  min={100} max={4000} step={100}
                />
              </div>
            </SidebarSection>

            <SidebarSection icon={Database} title="Data Extraction" description="Select multiple extractors" expanded>
              <MultiSelectChips options={DATA_EXTRACTION_OPTIONS} selectedValues={activeWorkspace.dataExtraction} onToggle={(v) => toggleWorkspaceValue("dataExtraction", v)} />
            </SidebarSection>

            <SidebarSection icon={FileText} title="Text Processing" description="Select multiple extractors" expanded>
              <MultiSelectChips options={TEXT_PROCESSING_OPTIONS} selectedValues={activeWorkspace.textProcessing} onToggle={(v) => toggleWorkspaceValue("textProcessing", v)} />
            </SidebarSection>

            <SidebarSection icon={Sparkles} title="Embedding Model" description="Select multiple embedding models" expanded>
              <MultiSelectChips options={EMBEDDING_OPTIONS} selectedValues={activeWorkspace.embeddingModels} onToggle={(v) => toggleWorkspaceValue("embeddingModels", v)} />
            </SidebarSection>

            <SidebarSection icon={FolderKanban} title="Vector Store" description="Select multiple vector stores" expanded>
              <MultiSelectChips options={VECTOR_STORE_OPTIONS} selectedValues={activeWorkspace.vectorStores} onToggle={(v) => toggleWorkspaceValue("vectorStores", v)} />
            </SidebarSection>
          </div>
        </section>
      </div>
    </aside>
  );
}
