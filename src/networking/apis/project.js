import httpClient from "@/services/axios";
import {
  createProject,
  deleteProject,
  fetchProjects,
  fetchProjectHistory,
} from "@/networking/endpoints";

export const projectApi = {
  createProject: (payload) => httpClient.post(createProject, payload),
  fetchAllProjects: () => httpClient.get(fetchProjects),
  deleteProject: (projectId) => httpClient.delete(deleteProject(projectId)),
  fetchProjectHistory: (projectId) => httpClient.get(fetchProjectHistory(projectId)),
};

export default projectApi;
