import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFinanceRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/admin/dashboard/finances/${id}`);
}
