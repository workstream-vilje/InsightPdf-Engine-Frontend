import httpClient from "@/services/axios";
import { fetchComparisonAnalytics } from "@/services/api/networking/endpoints";

export const comparisonApi = {
  fetchComparisonAnalytics: (projectId, fileId) => {
    const path = fetchComparisonAnalytics(projectId);
    const query = fileId ? `?file_id=${fileId}` : "";
    return httpClient.get(`${path}${query}`);
  },
};

export default comparisonApi;
