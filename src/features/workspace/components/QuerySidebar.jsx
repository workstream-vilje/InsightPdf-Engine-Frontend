"use client";

import { Database, FolderKanban, MessageSquare, Sparkles, X } from "lucide-react";
import {
  LLM_MODEL_OPTIONS,
  QUERY_CONFIGURATION_OPTIONS,
  RETRIEVAL_STRATEGY_OPTIONS,
} from "@/lib/projects/data";
import { usePlan } from "@/contexts/PlanContext";
import MultiSelectChips from "./MultiSelectChips";
import SidebarSection from "./SidebarSection";
import styles from "./Home/Projects.module.css";

const QUERY_CONFIGURATION_SIDEBAR_OPTIONS = QUERY_CONFIGURATION_OPTIONS.filter(
  (option) => option.value !== "agent",
);

export default function QuerySidebar({
  activeWorkspace,
  updateActiveWorkspace,
  toggleWorkspaceValue,
  queryAgentModeEnabled,
  allowedVectorStoreOptions,
  allowedEmbeddingOptions,
  ollamaDocsOpen,
  setOllamaDocsOpen,
  setOllamaWarningOpen,
  isImageFile = false,
}) {
  const { features } = usePlan();
  
  // Filter query configuration options based on plan features
  const QUERY_CONFIGURATION_SIDEBAR_OPTIONS_FILTERED = QUERY_CONFIGURATION_SIDEBAR_OPTIONS.filter(
    (option) => {
      if (option.value === "reranking" && !features.reranking) return false;
      if (option.value === "validation" && !features.validation) return false;
      return true;
    }
  );
  
  if (isImageFile) {
    return (
      <aside className={styles.workspaceQuerySidebar}>
        <div className={styles.workspaceContextSidebarInner}>
          <section className={styles.sidebarPane}>
            <div className={styles.sidebarGroupTitle}>Query techniques</div>
            <div className={styles.sidebarPaneScroll} style={{ padding: "16px", color: "var(--muted-foreground, #888)", fontSize: 13, lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>
                Image queries use built-in defaults automatically.
              </p>
              <p style={{ margin: "8px 0 0", opacity: 0.7 }}>
                FAISS · text-embedding-3-large · gpt-4o-mini
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
          <div className={styles.sidebarGroupTitle}>Query techniques</div>
          <div className={styles.sidebarPaneScroll}>
            <SidebarSection
              icon={Database}
              title="Retrieved Strategy"
              description={queryAgentModeEnabled ? "Shown for reference while Agent mode is on (use Agent mode in the chat bar)" : "Select multiple retrieval strategies"}
              expanded
            >
              <MultiSelectChips
                options={RETRIEVAL_STRATEGY_OPTIONS}
                selectedValues={activeWorkspace.retrievalStrategies}
                onToggle={(v) => toggleWorkspaceValue("retrievalStrategies", v)}
                disabled={queryAgentModeEnabled}
              />
            </SidebarSection>

            <SidebarSection icon={FolderKanban} title="Vector DB" description="Only techniques selected during file processing" expanded>
              <MultiSelectChips options={allowedVectorStoreOptions} selectedValues={activeWorkspace.vectorStores} onToggle={(v) => toggleWorkspaceValue("vectorStores", v)} />
            </SidebarSection>

            <SidebarSection icon={Sparkles} title="Embedding" description="Only techniques selected during file processing" expanded>
              <MultiSelectChips options={allowedEmbeddingOptions} selectedValues={activeWorkspace.embeddingModels} onToggle={(v) => toggleWorkspaceValue("embeddingModels", v)} />
            </SidebarSection>

            <SidebarSection icon={MessageSquare} title="LLM Model" description="Language model used to generate the answer" expanded>
              <MultiSelectChips
                options={LLM_MODEL_OPTIONS}
                selectedValues={[activeWorkspace.selectedLlmModel || "gpt-4o-mini"]}
                onToggle={(value) => {
                  updateActiveWorkspace((c) => ({ ...c, selectedLlmModel: value }));
                  if (value === "llama3.2") { setOllamaWarningOpen(true); }
                  else { setOllamaWarningOpen(false); setOllamaDocsOpen(false); }
                }}
                singleSelect
              />

              {activeWorkspace.selectedLlmModel === "llama3.2" && !ollamaDocsOpen && (
                <div className={styles.ollamaWarningCard}>
                  <div className={styles.ollamaWarningIcon} aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className={styles.ollamaWarningBody}>
                    <p className={styles.ollamaWarningTitle}>Requires local Ollama</p>
                    <p className={styles.ollamaWarningDesc}>Llama 3.2 runs locally via Ollama. Make sure Ollama is installed and the model is pulled before querying.</p>
                    <div className={styles.ollamaWarningActions}>
                      <button type="button" className={styles.ollamaWarningBtnSecondary} onClick={() => setOllamaDocsOpen(true)}>Learn more</button>
                      <button type="button" className={styles.ollamaWarningBtnPrimary} onClick={() => setOllamaWarningOpen(false)}>Got it</button>
                    </div>
                  </div>
                </div>
              )}

              {ollamaDocsOpen && (
                <div className={styles.ollamaDocsCard}>
                  <div className={styles.ollamaDocsHeader}>
                    <span className={styles.ollamaDocsTitle}>Using Ollama with InsightPDF</span>
                    <button type="button" className={styles.ollamaDocsClose} onClick={() => setOllamaDocsOpen(false)} aria-label="Close"><X size={14} /></button>
                  </div>
                  <div className={styles.ollamaDocsBody}>
                    <p className={styles.ollamaDocsSection}>What is Ollama?</p>
                    <p className={styles.ollamaDocsText}>Ollama lets you run large language models locally on your machine — no API key, no internet required for inference.</p>
                    <p className={styles.ollamaDocsSection}>Step 1 — Install Ollama</p>
                    <p className={styles.ollamaDocsText}>Download and install from <strong>ollama.com</strong>. Available for macOS, Linux, and Windows.</p>
                    <p className={styles.ollamaDocsSection}>Step 2 — Pull the model</p>
                    <code className={styles.ollamaDocsCode}>ollama pull llama3.2</code>
                    <p className={styles.ollamaDocsSection}>Step 3 — Start Ollama</p>
                    <p className={styles.ollamaDocsText}>Ollama runs as a background service on <strong>http://localhost:11434</strong>. It starts automatically after install on most systems.</p>
                    <code className={styles.ollamaDocsCode}>ollama serve</code>
                    <p className={styles.ollamaDocsSection}>How it works here</p>
                    <p className={styles.ollamaDocsText}>When you select Llama 3.2, the backend automatically sets <strong>provider: ollama</strong> and calls your local Ollama server.</p>
                    <p className={styles.ollamaDocsSection}>Common errors</p>
                    <p className={styles.ollamaDocsText}><strong>Ollama not reachable</strong> — Start Ollama with <code>ollama serve</code> or relaunch the Ollama app.</p>
                    <p className={styles.ollamaDocsText}><strong>Model not installed</strong> — Run <code>ollama pull llama3.2</code> in your terminal.</p>
                    <button type="button" className={styles.ollamaWarningBtnPrimary} style={{ marginTop: 12, width: "100%" }} onClick={() => setOllamaDocsOpen(false)}>Got it, close</button>
                  </div>
                </div>
              )}
            </SidebarSection>

            <SidebarSection icon={MessageSquare} title="Query Configuration" description="Ragas and LangSmith (Agent mode is in the chat bar)" expanded>
              {!features.reranking && (
                <div style={{ padding: '8px 12px', marginBottom: '8px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#b45309' }}>
                  ⚠️ Reranking requires Medium or Advanced plan
                </div>
              )}
              {!features.validation && (
                <div style={{ padding: '8px 12px', marginBottom: '8px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#b45309' }}>
                  ⚠️ Validation requires Advanced plan
                </div>
              )}
              <MultiSelectChips
                options={QUERY_CONFIGURATION_SIDEBAR_OPTIONS_FILTERED}
                selectedValues={activeWorkspace.queryConfigurations || []}
                onToggle={(v) => toggleWorkspaceValue("queryConfigurations", v)}
              />
            </SidebarSection>
          </div>
        </section>
      </div>
    </aside>
  );
}
