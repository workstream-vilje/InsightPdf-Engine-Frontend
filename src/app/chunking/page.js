import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ChunkingExperiments from "@/features/chunking/components/Chunking/Chunking";

export default function ChunkingPage() {
  return (
    <ProtectedRoute>
      <ChunkingExperiments />
    </ProtectedRoute>
  );
}
