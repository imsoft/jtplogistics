import { MuralEntryEdit } from "@/components/dashboard/mural/mural-entry-editor";

export default async function EditMuralEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MuralEntryEdit id={id} basePath="/admin/dashboard/mural" />;
}
