# Plan-Based Routing Implementation

## Overview
The system now routes API calls to different backend endpoints based on the user's selected plan (Basic, Medium, or Advanced RAG).

## Architecture

### 1. Plan Context (`src/contexts/PlanContext.jsx`)
Global context that provides plan information throughout the app.

**Provides:**
- `plan` - Current selected plan object
- `hasPlan` - Boolean if plan is selected
- `maxPages` - Page limit (50/200/700)
- `uploadEndpoint` - Plan-specific upload endpoint
- `queryEndpoint` - Plan-specific query endpoint
- `features` - Object of enabled/disabled features

**Usage:**
```javascript
import { usePlan } from "@/contexts/PlanContext";

function MyComponent() {
  const { plan, maxPages, features } = usePlan();
  
  if (!plan) {
    return <div>Please select a plan</div>;
  }
  
  return (
    <div>
      <p>Plan: {plan.name}</p>
      <p>Max pages: {maxPages}</p>
      {features.agentPipeline && <p>Agent pipeline enabled!</p>}
    </div>
  );
}
```

### 2. RAG API Service (`src/services/ragApi.js`)
Centralized service that routes API calls based on selected plan.

**Functions:**

#### `uploadPDF(formData)`
Routes PDF upload to plan-specific endpoint:
- Basic → `POST /api/v1/basic-rag/upload`
- Medium → `POST /api/v1/medium-rag/upload`
- Advanced → `POST /api/v1/advanced-rag/upload`

```javascript
import { uploadPDF } from "@/services/ragApi";

const formData = new FormData();
formData.append("file", pdfFile);
formData.append("user_id", userId);
formData.append("project_id", projectId);

const response = await uploadPDF(formData);
```

#### `queryRAG(payload)`
Routes query to plan-specific endpoint:
- Basic → `POST /api/v1/basic-rag/query`
- Medium → `POST /api/v1/medium-rag/query`
- Advanced → `POST /api/v1/advanced-rag/query`

```javascript
import { queryRAG } from "@/services/ragApi";

const response = await queryRAG({
  user_id: 1,
  project_id: 1,
  file_id: 123,
  query: "What is this document about?",
  top_k: 5,
});
```

#### `validateFileForPlan(file)`
Validates if file meets plan limits before upload.

```javascript
import { validateFileForPlan } from "@/services/ragApi";

const validation = validateFileForPlan(pdfFile);
if (!validation.valid) {
  alert(validation.error);
  return;
}
```

#### `getPlanConfig()`
Returns current plan configuration.

```javascript
import { getPlanConfig } from "@/services/ragApi";

const config = getPlanConfig();
console.log(config.maxPages); // 50, 200, or 700
console.log(config.features.agentPipeline); // true/false
```

## Plan Features Matrix

| Feature | Basic | Medium | Advanced |
|---------|-------|--------|----------|
| **Max Pages** | 50 | 200 | 700 |
| **PDF Upload** | ✅ | ✅ | ✅ |
| **Basic Query** | ✅ | ✅ | ✅ |
| **Semantic Chunking** | ❌ | ✅ | ✅ |
| **Large Embeddings** | ❌ | ✅ | ✅ |
| **Reranking** | ❌ | ✅ | ✅ |
| **Pinecone Storage** | ❌ | ✅ | ✅ |
| **Agent Pipeline** | ❌ | ❌ | ✅ |
| **Multi-Database** | ❌ | ❌ | ✅ |
| **Answer Validation** | ❌ | ❌ | ✅ |
| **Auto Retry** | ❌ | ❌ | ✅ |
| **Query Classification** | ❌ | ❌ | ✅ |

## Backend Endpoints

### Basic RAG
```
POST /api/v1/basic-rag/upload
POST /api/v1/basic-rag/query
```

**Features:**
- Character-based chunking (500 chars, 50 overlap)
- text-embedding-3-small (1536-dim)
- FAISS local storage
- GPT-4o-mini generation
- Simple similarity search

### Medium RAG
```
POST /api/v1/medium-rag/upload
POST /api/v1/medium-rag/query
```

**Features:**
- Semantic chunking with fallback
- text-embedding-3-large (3072-dim)
- Pinecone cloud storage
- GPT-4o generation
- Semantic/MMR search + reranking

### Advanced RAG
```
POST /api/v1/advanced-rag/upload
POST /api/v1/advanced-rag/query
```

**Features:**
- Advanced semantic chunking
- text-embedding-3-large (3072-dim)
- Dual storage (Pinecone + FAISS)
- GPT-4-turbo generation
- Agent-based adaptive retrieval
- LLM validation + retry logic

## Integration Guide

### Step 1: Wrap your app with PlanProvider
Already done in `src/app/providers.jsx`:
```javascript
<PlanProvider>
  {children}
</PlanProvider>
```

### Step 2: Use plan context in components
```javascript
import { usePlan } from "@/contexts/PlanContext";

function UploadComponent() {
  const { plan, maxPages, canUpload } = usePlan();
  
  if (!canUpload) {
    return <div>Please select a plan to upload files</div>;
  }
  
  return (
    <div>
      <p>Upload PDF (max {maxPages} pages)</p>
      {/* Upload form */}
    </div>
  );
}
```

### Step 3: Use RAG API service for uploads/queries
```javascript
import { uploadPDF, queryRAG, validateFileForPlan } from "@/services/ragApi";

async function handleFileUpload(file) {
  // Validate file
  const validation = validateFileForPlan(file);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }
  
  // Upload to plan-specific endpoint
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
  formData.append("project_id", projectId);
  
  try {
    const response = await uploadPDF(formData);
    console.log("Upload successful:", response);
  } catch (error) {
    console.error("Upload failed:", error);
  }
}

async function handleQuery(query) {
  try {
    const response = await queryRAG({
      user_id: userId,
      project_id: projectId,
      file_id: fileId,
      query: query,
      top_k: 5,
    });
    console.log("Query result:", response);
  } catch (error) {
    console.error("Query failed:", error);
  }
}
```

### Step 4: Conditionally show/hide features
```javascript
import { usePlan } from "@/contexts/PlanContext";

function AdvancedSettings() {
  const { features } = usePlan();
  
  return (
    <div>
      {features.reranking && (
        <div>
          <label>Enable Reranking</label>
          <input type="checkbox" />
        </div>
      )}
      
      {features.agentPipeline && (
        <div>
          <label>Agent Pipeline Settings</label>
          {/* Advanced settings */}
        </div>
      )}
      
      {!features.answerValidation && (
        <div className="upgrade-notice">
          ⚠️ Answer validation is only available in Advanced plan
        </div>
      )}
    </div>
  );
}
```

## Error Handling

### No Plan Selected
```javascript
import { uploadPDF } from "@/services/ragApi";

try {
  await uploadPDF(formData);
} catch (error) {
  if (error.message.includes("No plan selected")) {
    // Redirect to plans page
    router.push("/");
  }
}
```

### File Too Large
```javascript
import { validateFileForPlan } from "@/services/ragApi";

const validation = validateFileForPlan(file);
if (!validation.valid) {
  // Show error to user
  showToast({
    title: "File too large",
    message: validation.error,
    variant: "error",
  });
}
```

### API Errors
```javascript
try {
  await queryRAG(payload);
} catch (error) {
  if (error.status === 400) {
    // Bad request - check payload
  } else if (error.status === 401) {
    // Unauthorized - redirect to login
  } else if (error.status === 500) {
    // Server error - show error message
  }
}
```

## Testing

### Test Plan Selection
1. Go to home page
2. Select a plan (Basic/Medium/Advanced)
3. Check localStorage: `insightpdf-cart` should contain plan data
4. Check console: Should see plan loaded in PlanContext

### Test Upload Routing
1. Select Basic plan
2. Upload a PDF
3. Check console: Should see `POST /api/v1/basic-rag/upload`
4. Repeat for Medium and Advanced plans

### Test Query Routing
1. Select Medium plan
2. Run a query
3. Check console: Should see `POST /api/v1/medium-rag/query`
4. Repeat for other plans

### Test Feature Restrictions
1. Select Basic plan
2. Try to access advanced features
3. Should see "upgrade" messages or disabled UI elements

## Future Enhancements

1. **Plan Upgrade Flow**
   - Allow users to upgrade from Basic → Medium → Advanced
   - Migrate existing data to new endpoints

2. **Usage Tracking**
   - Track API calls per plan
   - Show usage limits and quotas

3. **Plan Expiry**
   - Handle subscription expiry
   - Downgrade to free tier or block access

4. **Feature Flags**
   - Server-side feature flags
   - Dynamic feature enabling based on backend config
