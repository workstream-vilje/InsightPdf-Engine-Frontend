import httpClient from "@/services/axios";

export async function getExperimentPerformanceById(experimentId) {
  const path = `/experiments/${encodeURIComponent(String(experimentId))}/performance`;
  const data = await httpClient.get(path);
  return data.performance;
}