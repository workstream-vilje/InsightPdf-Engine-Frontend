import httpClient, { getStoredUserId, withQuery } from "@/services/axios";
import {
  createProject,
  deleteProject,
  fetchProjects,
  fetchProjectHistory,
} from "@/services/api/networking/endpoints";

export const projectApi = {
  createProject: (payload) =>
    httpClient.post(createProject, {
      user_id: getStoredUserId(),
      ...payload,
    }),
  fetchAllProjects: () =>
    httpClient.get(withQuery(fetchProjects, { user_id: getStoredUserId() })),
  deleteProject: (projectId) => httpClient.delete(deleteProject(projectId)),
  fetchProjectHistory: (projectId) => httpClient.get(fetchProjectHistory(projectId)),
};

export default projectApi;
