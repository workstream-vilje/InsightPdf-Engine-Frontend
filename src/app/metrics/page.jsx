import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MetricsScreen from "@/features/analytics/components/Analytics/Analytics";

export default async function MetricsPage({ searchParams }) {
  const params = await searchParams;
  const projectId = params?.project ?? "insight-finance-rag";
  const projectName = params?.name ?? params?.project ?? "insight-finance-rag";
  const categoryName = params?.category ?? "Finance";

  return (
    <ProtectedRoute>
      <MetricsScreen
        projectId={projectId}
        projectName={projectName}
        categoryName={categoryName}
      />
    </ProtectedRoute>
  );
}
