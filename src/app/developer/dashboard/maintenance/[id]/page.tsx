import { MaintenanceDetail } from "@/components/dashboard/support/maintenance-detail";
import { requireDeveloperPage } from "@/lib/auth-server";

export const metadata = { title: "Mantenimiento | JTP Logistics" };

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireDeveloperPage();
  const { id } = await params;
  return <MaintenanceDetail id={id} />;
}
