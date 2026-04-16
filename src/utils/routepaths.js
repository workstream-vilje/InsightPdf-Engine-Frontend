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
export const workspaceUploadUrl = (projectId) =>
  projectId == null || projectId === ''
    ? ROUTE_PATHS.WORKSPACE_UPLOAD
    : `${ROUTE_PATHS.WORKSPACE_UPLOAD}?project=${encodeURIComponent(String(projectId))}`;

/** @param {string | number | null | undefined} projectId */
export const workspaceQueryUrl = (projectId) =>
  projectId == null || projectId === ''
    ? ROUTE_PATHS.WORKSPACE_QUERY
    : `${ROUTE_PATHS.WORKSPACE_QUERY}?project=${encodeURIComponent(String(projectId))}`;
