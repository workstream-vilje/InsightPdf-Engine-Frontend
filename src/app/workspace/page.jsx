import { redirect } from "next/navigation";

/**
 * Preserve ?project= when redirecting to the upload dashboard (default project workspace).
 */
export default async function WorkspacePage({ searchParams }) {
  const params = await searchParams;
  const project = params?.project;
  const search = new URLSearchParams();
  if (project != null && project !== "") {
    search.set("project", String(project));
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  redirect(`/workspace/upload${suffix}`);
}
