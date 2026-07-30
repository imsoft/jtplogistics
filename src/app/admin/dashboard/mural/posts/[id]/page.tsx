import { MuralPostDetail } from "@/components/dashboard/mural/mural-post-detail";

export default async function MuralPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MuralPostDetail id={id} basePath="/admin/dashboard/mural" />;
}
