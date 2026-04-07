import httpClient from "@/services/axios";
import {
  fetchProjectFiles,
  uploadProjectFiles,
  getProjectFile,
  deleteProjectFile,
} from "@/networking/endpoints";

export const fileApi = {
  fetchProjectFiles: (projectId) => httpClient.get(fetchProjectFiles(projectId)),
  uploadProjectFiles: (projectId, formData) =>
    httpClient.post(uploadProjectFiles(projectId), formData),
  getProjectFile: (projectId, fileId) =>
    httpClient.get(getProjectFile(projectId, fileId)),
  deleteProjectFile: (projectId, fileId) =>
    httpClient.delete(deleteProjectFile(projectId, fileId)),
};

export default fileApi;
