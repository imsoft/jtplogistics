"use client";

import { QuoteKpisView } from "@/components/dashboard/quote-kpis/quote-kpis-view";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { DashboardHomeSkeleton } from "@/components/ui/skeletons";

export default function CollaboratorQuoteKpisPage() {
  const { permissions, isLoaded } = useCollaboratorPermissions();
  if (!isLoaded) return <DashboardHomeSkeleton />;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-heading">KPIs de cotizaciones</h1>
        <p className="text-muted-foreground text-sm">Cuánto se cotiza, cuánto se gana y por qué se pierde.</p>
      </div>
      {permissions?.canViewQuoteKpis ? (
        <QuoteKpisView />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No tienes permiso para ver los KPIs de cotizaciones. Pídelo a dirección.
        </p>
      )}
    </div>
  );
}
