"use client";
import React from "react";
import classNames from "classnames";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import TopBar from "@/features/dashboard/components/Dashboard/TopBar";
import LeftSidebar from "@/features/dashboard/components/Dashboard/left-sidebar/LeftSidebar";
import CenterPanel from "@/features/dashboard/components/Dashboard/center/CenterPanel";
import RightSidebar from "@/features/dashboard/components/Dashboard/right-sidebar/RightSidebar";
import MonitoringPanel from "@/features/dashboard/components/Dashboard/MonitoringPanel";
import queryApi from "@/services/api/networking/apis/query";
import comparisonApi from "@/services/api/networking/apis/comparison";
import styles from "./Dashboard.module.css";

const defaultResultsData = {
  response: "",
  chunks: [],
  performance: {
    totalTime: 0,
    embedTime: 0,
    retrievalTime: 0,
    llmGenTime: 0,
    totalTokens: 0,
    cost: 0,
  },
  qualityMetrics: [],
  tracing: [],
  experiment: null,
  comparison: null,
};

const defaultPipelineConfig = {
  text_processing: {
    chunk_size: 500,
    chunk_overlap: 50,
    splitter: "recursive",
  },
  data_extraction: {
    method: "pymupdf",
  },
  embeddings: {
    provider: "openai",
    model: "text-embedding-3-small",
  },
  vector_store: {
    backends: ["faiss"],
    collection_name: "documents",
  },
  query: {
    retrieval_strategy: {
      top_k: 5,
      search_type: "similarity",
      vector_db: "faiss",
      collection_name: "documents",
    },
    embedding: {
      provider: "openai",
      model: "text-embedding-3-small",
    },
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.2,
    },
    self_reflection: {
      enabled: true,
      max_retries: 2,
      retrieval_top_k_step: 2,
    },
  },
};

const buildQualityMetrics = (payload) => {
  const accuracy = Math.round(Number(payload?.accuracy || 0) * 100);
  const relevance = Math.round(Number(payload?.relevance || 0));
  return [
    { label: "Faithfulness", value: accuracy || 0 },
    { label: "Context Precision", value: relevance || 0 },
    { label: "Context Recall", value: relevance || 0 },
    { label: "Answer Relevance", value: relevance || accuracy || 0 },
  ];
};

const formatMs = (value) => `${(Number(value || 0) / 1000).toFixed(2)}s`;

const buildTracing = (payload, documentLabel) => [
  {
    step: "Document Source",
    time: "-",
    detail: documentLabel || "Selected project file",
  },
  {
    step: "Embedding Generation",
    time: formatMs(payload?.embed_time),
    detail: payload?.embedding || "Embedding model",
  },
  {
    step: "Similarity Search",
    time: formatMs(payload?.retrieval_time),
    detail: payload?.retrieval || "similarity",
  },
  {
    step: "LLM Generation",
    time: formatMs(payload?.llm_gen_time),
    detail: payload?.llm || "LLM response generation",
  },
  {
    step: "Final Response",
    time: formatMs(payload?.total_time),
    detail: payload?.experiment_code || "Pipeline completed",
  },
];

const mapChunks = (chunks = []) =>
  chunks.map((chunk, index) => ({
    id: `${chunk?.source || "chunk"}-${index}`,
    text: chunk?.content || "",
    page: chunk?.page || index + 1,
    source: chunk?.source || "Document",
    score: Number(chunk?.relevance_score ?? chunk?.raw_score ?? 0),
  }));

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [isRightCollapsed, setIsRightCollapsed] = React.useState(true);
  const [bottomPanelState, setBottomPanelState] = React.useState("hidden");
  const [isRunning, setIsRunning] = React.useState(false);
  const [resultsData, setResultsData] = React.useState(defaultResultsData);
  const [pipelineConfig, setPipelineConfig] = React.useState(defaultPipelineConfig);
  const [selectionState, setSelectionState] = React.useState({
    projectId: null,
    fileId: null,
    documentLabel: "",
  });

  const toggleBottomPanel = () => {
    setBottomPanelState((prev) => (prev === "hidden" ? "standard" : "hidden"));
  };

  const handleSelectionChange = React.useCallback((selection) => {
    setSelectionState(selection);
  }, []);

  const handleRunQuery = React.useCallback(
    async ({ projectId, fileId, query }) => {
      if (!projectId || !fileId || !query?.trim()) {
        throw new Error("Please select a project, document, and query.");
      }

      setIsRunning(true);
      setBottomPanelState("standard");

      try {
        const queryPayload = {
          project_id: projectId,
          file_id: fileId,
          query: query.trim(),
          config: {
            retrieval_strategy: {
              top_k: 5,
              search_type: "similarity",
              vector_db: "faiss",
              collection_name: "documents",
            },
            embedding: {
              provider: "openai",
              model: "text-embedding-3-large",
            },
            llm: {
              provider: "openai",
              model: "gpt-4o-mini",
              temperature: 0.2,
            },
            self_reflection: {
              enabled: true,
              max_retries: 2,
              retrieval_top_k_step: 2,
            },
          },
        };

        const queryResponse = await queryApi.runQuery(queryPayload);
        let savedResponse = null;
        let comparisonResponse = null;

        if (queryResponse?.experiment_id) {
          try {
            const saved = await queryApi.fetchSavedResponse({
              projectId,
              fileId,
              experimentId: queryResponse.experiment_id,
            });
            savedResponse = Array.isArray(saved?.data)
              ? saved.data[0] || null
              : saved?.data || saved || null;
          } catch (error) {
            savedResponse = null;
          }
        }

        try {
          comparisonResponse = await comparisonApi.fetchComparisonAnalytics(
            projectId,
            fileId,
          );
        } catch (error) {
          comparisonResponse = null;
        }

        const resultPayload = {
          ...queryResponse,
          answer: savedResponse?.response || queryResponse?.answer || "",
          chunks: savedResponse?.chunks || queryResponse?.chunks || [],
        };

        setResultsData({
          response: resultPayload.answer || "",
          chunks: mapChunks(resultPayload.chunks),
          performance: {
            totalTime: Number(resultPayload.total_time || 0),
            embedTime: Number(resultPayload.embed_time || 0),
            retrievalTime: Number(resultPayload.retrieval_time || 0),
            llmGenTime: Number(resultPayload.llm_gen_time || 0),
            totalTokens: Number(resultPayload.total_tokens || 0),
            cost: Number(resultPayload.cost || 0),
          },
          qualityMetrics: buildQualityMetrics(resultPayload),
          tracing: buildTracing(resultPayload, selectionState.documentLabel),
          experiment: {
            id:
              resultPayload.experiment_code ||
              `EXP-${resultPayload.experiment_id || "000"}`,
            llm: resultPayload.llm || "gpt-4o-mini",
            embedding: resultPayload.embedding || "text-embedding-3-large",
            db: resultPayload.db || "faiss",
            retrieval: resultPayload.retrieval || "similarity",
            accuracy: Math.round(Number(resultPayload.accuracy || 0) * 100),
            latency: Number(resultPayload.total_time || 0) / 1000,
          },
          comparison: comparisonResponse?.data || null,
        });

        return resultPayload;
      } finally {
        setIsRunning(false);
      }
    },
    [pipelineConfig.query, selectionState.documentLabel],
  );

  return (
    <DashboardLayout
      header={
        <TopBar
          onStatsClick={toggleBottomPanel}
          isStatsActive={bottomPanelState !== "hidden"}
          isRunning={isRunning}
          onRun={toggleBottomPanel}
        />
      }
      sidebar={
        <LeftSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      }
      secondarySidebar={
        <RightSidebar
          isCollapsed={isRightCollapsed}
          setIsCollapsed={setIsRightCollapsed}
          resultsData={resultsData}
        />
      }
      isCollapsed={isCollapsed}
      isSecondaryCollapsed={isRightCollapsed}
    >
      <div
        className={classNames(
          styles.container,
          styles[`bottom_${bottomPanelState}`],
        )}
      >
        <div className={styles.topRegion}>
          <CenterPanel
            onRunQuery={handleRunQuery}
            onSelectionChange={handleSelectionChange}
            isRunning={isRunning}
            processingConfig={pipelineConfig}
          />
        </div>

        {bottomPanelState !== "hidden" && (
          <div
            className={classNames(
              styles.bottomRegion,
              styles[`bottomRegion_${bottomPanelState}`],
            )}
          >
            <MonitoringPanel
              state={bottomPanelState}
              setState={setBottomPanelState}
              onClose={() => setBottomPanelState("hidden")}
              isRunning={isRunning}
              resultsData={resultsData}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
