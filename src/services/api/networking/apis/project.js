import httpClient from "@/services/axios";
import {
  createProject,
  deleteProject,
  fetchProjects,
  fetchProjectHistory,
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
  fetchAllProjects: () => httpClient.get(withUserIdQuery(fetchProjects)),
  deleteProject: (projectId) => httpClient.delete(deleteProject(projectId)),
  fetchProjectHistory: (projectId) => httpClient.get(fetchProjectHistory(projectId)),
};

export default projectApi;
