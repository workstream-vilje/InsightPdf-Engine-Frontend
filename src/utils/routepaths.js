/**
 * Centralized Route Paths for the RAG Canvas application.
 * Using constants ensures consistency and easier refactoring across the codebase.
 */
export const ROUTE_PATHS = {
  HOME: '/',
  AUTH_LOGIN: '/auth/login',
  AUTH_SIGNUP: '/auth/signup',
  DASHBOARD: '/dashboard',
  CHUNKING: '/chunking',
  COMPARE: '/compare',
  SETTINGS: '/settings',
  HISTORY: '/history',
  DOCUMENTATION: '/docs',
  METRICS: '/analytics',
  ANALYTICS: '/analytics',
  /** Project workspace: documents + ingestion (default after opening a project) */
  WORKSPACE_UPLOAD: '/workspace/upload',
  /** Project workspace: RAG query + chat */
  WORKSPACE_QUERY: '/workspace/query',
};

/** @param {string | number | null | undefined} projectId */
export const workspaceUploadUrl = (projectId, fileId = null) => {
  if (projectId == null || projectId === '') return ROUTE_PATHS.WORKSPACE_UPLOAD;
  const params = new URLSearchParams({ project: String(projectId) });
  if (fileId != null && fileId !== '') params.set('file', String(fileId));
  return `${ROUTE_PATHS.WORKSPACE_UPLOAD}?${params.toString()}`;
};

/** @param {string | number | null | undefined} projectId */
export const workspaceQueryUrl = (projectId, fileId = null) => {
  if (projectId == null || projectId === '') return ROUTE_PATHS.WORKSPACE_QUERY;
  const params = new URLSearchParams({ project: String(projectId) });
  if (fileId != null && fileId !== '') params.set('file', String(fileId));
  return `${ROUTE_PATHS.WORKSPACE_QUERY}?${params.toString()}`;
};
