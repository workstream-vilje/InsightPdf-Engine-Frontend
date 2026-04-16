import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ProjectCanvas from "@/features/workspace/components/Home/Projects";

export default async function WorkspaceQueryPage({ searchParams }) {
  const params = await searchParams;
  const initialProjectId = params?.project ?? null;

  return (
    <ProtectedRoute>
      <ProjectCanvas initialProjectId={initialProjectId} workspaceMode="query" />
    </ProtectedRoute>
  );
}
