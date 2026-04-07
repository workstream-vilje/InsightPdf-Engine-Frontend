import MetricsScreen from "@/screens/Metrics";

export default async function MetricsPage({ searchParams }) {
  const params = await searchParams;
  const projectId = params?.project ?? "insight-finance-rag";
  const projectName = params?.name ?? params?.project ?? "insight-finance-rag";
  const categoryName = params?.category ?? "Finance";

  return (
    <MetricsScreen
      projectId={projectId}
      projectName={projectName}
      categoryName={categoryName}
    />
  );
}
