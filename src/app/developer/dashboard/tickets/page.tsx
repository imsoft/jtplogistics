import { TicketsBoard } from "@/components/dashboard/support/tickets-board";
import { requireDeveloperPage } from "@/lib/auth-server";

export const metadata = { title: "Reportes de equipo | JTP Logistics" };

export default async function TicketsPage() {
  await requireDeveloperPage();
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Reportes de equipo</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Lo que reporta el equipo de JTP cuando algo falla.
        </p>
      </div>
      <TicketsBoard />
    </div>
  );
}
