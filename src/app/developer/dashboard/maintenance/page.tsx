import { MaintenanceBoard } from "@/components/dashboard/support/maintenance-board";
import { requireDeveloperPage } from "@/lib/auth-server";

export const metadata = { title: "Mantenimientos | JTP Logistics" };

export default async function MaintenancePage() {
  const session = await requireDeveloperPage();
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Mantenimientos</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Preventivos y correctivos del equipo de cómputo, con su evidencia.
        </p>
      </div>
      <MaintenanceBoard currentUserName={session.user.name} />
    </div>
  );
}
