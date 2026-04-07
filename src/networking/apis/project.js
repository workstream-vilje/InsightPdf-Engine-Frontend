import httpClient from "@/services/axios";
import {
  createProject,
  fetchProjects,
  fetchProjectHistory,
} from "@/networking/endpoints";

export const projectApi = {
  createProject: (payload) => httpClient.post(createProject, payload),
  fetchAllProjects: () => httpClient.get(fetchProjects),
  fetchProjectHistory: (projectId) => httpClient.get(fetchProjectHistory(projectId)),
};

export default projectApi;
