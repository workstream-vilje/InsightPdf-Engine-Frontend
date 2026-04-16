import httpClient from "@/services/axios";
import { runQuery, fetchSavedResponse } from "@/services/api/networking/endpoints";

export const queryApi = {
  runQuery: (payload) => httpClient.post(runQuery, payload),
  fetchSavedResponse: ({ projectId, fileId, experimentId }) =>
    httpClient.get(
      `${fetchSavedResponse}?project_id=${projectId}&file_id=${fileId}&experiment_id=${experimentId}`,
    ),
};

export default queryApi;