import httpClient, { getStoredUserId, withQuery } from "@/services/axios";
import {
  fetchProjectFiles,
  uploadProjectFiles,
  processProjectFile,
  getProjectFile,
  deleteProjectFile,
} from "@/services/api/networking/endpoints";

export const fileApi = {
  fetchProjectFiles: (projectId) =>
    httpClient.get(
      withQuery(fetchProjectFiles(projectId), { user_id: getStoredUserId() }),
    ),
  uploadProjectFiles: (projectId, formData) =>
    httpClient.post(uploadProjectFiles(projectId), formData),
  processProjectFile: (projectId, fileId, config) => {
    const formData = new FormData();
    if (config) {
      formData.append("config", JSON.stringify(config));
    }
    return httpClient.post(processProjectFile(projectId, fileId), formData);
  },
  getProjectFile: (projectId, fileId) =>
    httpClient.get(getProjectFile(projectId, fileId)),
  deleteProjectFile: (projectId, fileId) =>
    httpClient.delete(deleteProjectFile(projectId, fileId)),
};

export default fileApi;
