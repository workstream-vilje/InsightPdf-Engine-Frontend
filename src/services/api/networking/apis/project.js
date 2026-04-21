import httpClient, { withQuery } from "@/services/axios";
import {
  createProject,
  deleteProject,
  fetchProjectExperiments,
  fetchProjects,
  fetchProjectHistory,
  fetchUserHistory,
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

export const projectApi = {
  createProject: (payload) =>
    httpClient.post(createProject, {
      ...payload,
      ...(getCurrentUserId() ? { user_id: Number(getCurrentUserId()) } : {}),
    }),
  fetchAllProjects: (options = {}) => httpClient.get(withUserIdQuery(fetchProjects), options),
  deleteProject: (projectId) => httpClient.delete(deleteProject(projectId)),
  fetchProjectHistory: (projectId) => httpClient.get(fetchProjectHistory(projectId)),
  fetchProjectExperiments: (projectId, fileId) =>
    httpClient.get(
      withQuery(fetchProjectExperiments(projectId), {
        file_id: fileId || undefined,
      }),
    ),
  fetchUserHistory: (projectId) =>
    httpClient.get(
      withQuery(fetchUserHistory, {
        user_id: getCurrentUserId(),
        project_id: projectId || undefined,
      }),
    ),
};

export default projectApi;
