import ProjectCanvas from "@/Home/Projects";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const initialProjectId = params?.project ?? null;

  return <ProjectCanvas initialProjectId={initialProjectId} />;
}
