API usage structure:

- `src/services/axios.js`
  Central HTTP client shared by the app.

- `src/services/auth.js`
  Token helpers for future JWT-based auth.

- `src/networking/endpoints.js`
  All backend paths in one flat file.

- `src/networking/apis/project.js`
  Project-related API methods.

- `src/networking/apis/file.js`
  File upload and file management API methods.

- `src/networking/apis/comparison.js`
  Comparison analytics API methods.

- `src/networking/apis/query.js`
  Query and saved-response API methods.

- `src/networking/apis/pipeline.js`
  Shared pipeline payload builders plus query-pipeline API helper.

- `src/networking/apis/system.js`
  Root and health API methods.

- `src/networking/apis/index.js`
  Optional barrel export for all API modules.
