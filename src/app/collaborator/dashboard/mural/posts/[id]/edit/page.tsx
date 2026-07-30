import { MuralPostEdit } from "@/components/dashboard/mural/mural-post-editor";

export default async function EditMuralPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MuralPostEdit id={id} basePath="/collaborator/dashboard/mural" />;
}
