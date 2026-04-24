# Integration Example: Using Plan-Based Routing

## Example: Upload Component with Plan-Based Routing

```javascript
"use client";

import { useState } from "react";
import { usePlan } from "@/contexts/PlanContext";
import { uploadPDF, validateFileForPlan } from "@/services/ragApi";
import { useToast } from "@/components/toast/ToastProvider";

export default function UploadComponent({ userId, projectId }) {
  const { plan, maxPages, hasPlan } = usePlan();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file for current plan
    const validation = validateFileForPlan(selectedFile);
    if (!validation.valid) {
      showToast({
        title: "File validation failed",
        message: validation.error,
        variant: "error",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", userId);
      formData.append("project_id", projectId);

      // This automatically routes to the correct endpoint based on plan
      const response = await uploadPDF(formData);

      showToast({
        title: "Upload successful",
        message: `File processed with ${plan.name} RAG`,
        variant: "success",
      });

      console.log("Upload response:", response);
      setFile(null);
    } catch (error) {
      showToast({
        title: "Upload failed",
        message: error.message,
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!hasPlan) {
    return (
      <div className="no-plan-notice">
        <p>Please select a plan to upload files</p>
        <a href="/">Choose a plan</a>
      </div>
    );
  }

  return (
    <div className="upload-component">
      <div className="plan-info">
        <h3>Current Plan: {plan.name}</h3>
        <p>Max pages: {maxPages}</p>
      </div>

      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {file && (
        <div className="file-info">
          <p>Selected: {file.name}</p>
          <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? "Uploading..." : "Upload to " + plan.name + " RAG"}
      </button>
    </div>
  );
}
```

## Example: Query Component with Plan-Based Routing

```javascript
"use client";

import { useState } from "react";
import { usePlan } from "@/contexts/PlanContext";
import { queryRAG } from "@/services/ragApi";
import { useToast } from "@/components/toast/ToastProvider";

export default function QueryComponent({ userId, projectId, fileId }) {
  const { plan, features, hasPlan } = usePlan();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      // This automatically routes to the correct endpoint based on plan
      const response = await queryRAG({
        user_id: userId,
        project_id: projectId,
        file_id: fileId,
        query: query.trim(),
        top_k: 5,
      });

      setAnswer(response.answer);
      showToast({
        title: "Query successful",
        message: `Answered using ${plan.name} RAG`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Query failed",
        message: error.message,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasPlan) {
    return (
      <div className="no-plan-notice">
        <p>Please select a plan to query documents</p>
        <a href="/">Choose a plan</a>
      </div>
    );
  }

  return (
    <div className="query-component">
      <div className="plan-info">
        <h3>Querying with {plan.name} RAG</h3>
        <div className="features">
          {features.reranking && <span className="badge">Reranking ✓</span>}
          {features.agentPipeline && <span className="badge">Agent Pipeline ✓</span>}
          {features.answerValidation && <span className="badge">Validation ✓</span>}
        </div>
      </div>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask a question about your document..."
        disabled={loading}
      />

      <button onClick={handleQuery} disabled={!query.trim() || loading}>
        {loading ? "Querying..." : "Ask Question"}
      </button>

      {answer && (
        <div className="answer">
          <h4>Answer:</h4>
          <p>{answer}</p>
        </div>
      )}

      {!features.answerValidation && (
        <div className="upgrade-notice">
          💡 Upgrade to Advanced plan for answer validation and retry logic
        </div>
      )}
    </div>
  );
}
```

## Example: Feature-Gated Settings

```javascript
"use client";

import { usePlan } from "@/contexts/PlanContext";

export default function SettingsComponent() {
  const { plan, features } = usePlan();

  return (
    <div className="settings">
      <h2>RAG Settings</h2>

      {/* Always available */}
      <div className="setting">
        <label>Top K Results</label>
        <input type="number" min="1" max="10" defaultValue="5" />
      </div>

      {/* Medium+ only */}
      {features.reranking ? (
        <div className="setting">
          <label>Enable Reranking</label>
          <input type="checkbox" />
        </div>
      ) : (
        <div className="setting disabled">
          <label>Enable Reranking</label>
          <input type="checkbox" disabled />
          <span className="upgrade-badge">Medium+ only</span>
        </div>
      )}

      {/* Advanced only */}
      {features.agentPipeline ? (
        <div className="setting">
          <label>Agent Pipeline Mode</label>
          <select>
            <option>Automatic</option>
            <option>Manual</option>
          </select>
        </div>
      ) : (
        <div className="setting disabled">
          <label>Agent Pipeline Mode</label>
          <select disabled>
            <option>Automatic</option>
          </select>
          <span className="upgrade-badge">Advanced only</span>
        </div>
      )}

      {/* Advanced only */}
      {features.answerValidation ? (
        <div className="setting">
          <label>Answer Validation</label>
          <input type="checkbox" defaultChecked />
        </div>
      ) : (
        <div className="setting disabled">
          <label>Answer Validation</label>
          <input type="checkbox" disabled />
          <span className="upgrade-badge">Advanced only</span>
        </div>
      )}
    </div>
  );
}
```

## Complete Flow Example

```javascript
// 1. User selects plan on home page
// Plan is saved to localStorage via cartStore

// 2. User signs up and logs in
// After login, redirected to checkout

// 3. User completes payment
// Plan remains in localStorage

// 4. User accesses workspace
// PlanContext loads plan from localStorage

// 5. User uploads PDF
import { uploadPDF } from "@/services/ragApi";

const formData = new FormData();
formData.append("file", pdfFile);
formData.append("user_id", 1);
formData.append("project_id", 1);

// Automatically routes to:
// - Basic: POST /api/v1/basic-rag/upload
// - Medium: POST /api/v1/medium-rag/upload
// - Advanced: POST /api/v1/advanced-rag/upload
const uploadResponse = await uploadPDF(formData);

// 6. User queries document
import { queryRAG } from "@/services/ragApi";

// Automatically routes to:
// - Basic: POST /api/v1/basic-rag/query
// - Medium: POST /api/v1/medium-rag/query
// - Advanced: POST /api/v1/advanced-rag/query
const queryResponse = await queryRAG({
  user_id: 1,
  project_id: 1,
  file_id: uploadResponse.file_id,
  query: "What is this document about?",
  top_k: 5,
});

console.log("Answer:", queryResponse.answer);
```

## Testing the Integration

1. **Select Basic Plan:**
   ```
   - Click "Select Plan" on Basic card
   - Complete signup/login
   - Upload a PDF
   - Check console: Should see "POST /api/v1/basic-rag/upload"
   - Query the document
   - Check console: Should see "POST /api/v1/basic-rag/query"
   ```

2. **Select Medium Plan:**
   ```
   - Clear localStorage
   - Select Medium plan
   - Complete flow
   - Check console: Should see "/api/v1/medium-rag/*" endpoints
   - Verify reranking features are enabled
   ```

3. **Select Advanced Plan:**
   ```
   - Clear localStorage
   - Select Advanced plan
   - Complete flow
   - Check console: Should see "/api/v1/advanced-rag/*" endpoints
   - Verify all advanced features are enabled
   ```

## Console Logs to Watch

When everything is working correctly, you should see:

```
🎯 Plan selected: { id: "basic", name: "Basic", ... }
💾 setCart: saving plan to localStorage
✅ setCart: saved successfully
📦 getCart: parsed value: { id: "basic", ... }
🎯 PlanContext: loaded plan: { id: "basic", ... }
📤 Uploading to Basic RAG endpoint: /api/v1/basic-rag/upload
✅ Upload successful (Basic RAG): { file_id: 123, ... }
🔍 Querying Basic RAG endpoint: /api/v1/basic-rag/query
✅ Query successful (Basic RAG): { answer: "...", ... }
```
