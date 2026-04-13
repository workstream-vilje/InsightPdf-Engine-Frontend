import httpClient from "@/services/axios";
import {
  fetchProjectFiles,
  uploadProjectFiles,
  processProjectFile,
  getProjectFile,
  deleteProjectFile,
} from "@/services/api/networking/endpoints";
import { getCurrentUserId } from "@/services/auth";

const withUserIdQuery = (path) => {
  const userId = getCurrentUserId();
  if (!userId) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}user_id=${encodeURIComponent(userId)}`;
};

export const fileApi = {
  fetchProjectFiles: (projectId) =>
    httpClient.get(withUserIdQuery(fetchProjectFiles(projectId))),
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
