// System ENDPOINTS
export const health = "/health";
export const root = "/";

// Project ENDPOINTS
export const createProject = "/create/project";
export const fetchProjects = "/fetch/projects-all";
export const fetchProjectHistory = (projectId) =>
  `/project/${projectId}/history`;

// File ENDPOINTS
export const fetchProjectFiles = (projectId) =>
  `/project/${projectId}/files`;
export const uploadProjectFiles = (projectId) =>
  `/project/${projectId}/upload`;
export const processProjectFile = (projectId, fileId) =>
  `/project/${projectId}/file/${fileId}/process`;
export const getProjectFile = (projectId, fileId) =>
  `/project/${projectId}/file/${fileId}`;
export const deleteProjectFile = (projectId, fileId) =>
  `/project/${projectId}/file/${fileId}`;

// Comparison ENDPOINTS
export const fetchComparisonAnalytics = (projectId) =>
  `/project/${projectId}/comparison/analytics`;

// Query ENDPOINTS
export const runQuery = "/query";
export const fetchSavedResponse = "/response";
