import ProjectCanvas from "@/features/workspace/components/Home/Projects";

export default async function WorkspacePage({ searchParams }) {
  const params = await searchParams;
  const initialProjectId = params?.project ?? null;

  return <ProjectCanvas initialProjectId={initialProjectId} />;
}
