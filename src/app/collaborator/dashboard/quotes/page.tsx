"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import {
  QuotesCrmTable,
  type CrmQuote,
} from "@/components/dashboard/quotes/quotes-crm-table";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorQuotesPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const [quotes, setQuotes] = useState<CrmQuote[] | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewQuotes && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [isLoaded, permissions, router]);

  useEffect(() => {
    if (!permissions?.canViewQuotes) return;
    fetch("/api/collaborator/generated-quotes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CrmQuote[]) => setQuotes(Array.isArray(data) ? data : []))
      .catch(() => setQuotes([]));
  }, [permissions]);

  if (!isLoaded || !permissions?.canViewQuotes) return null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-heading">Cotizaciones</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Seguimiento del estado de cada cotización generada.
          </p>
        </div>
        {permissions.canCreateQuotes && (
          <Button asChild>
            <Link href="/collaborator/dashboard/quotes/new">
              <Plus className="size-4" />
              Nueva cotización
            </Link>
          </Button>
        )}
      </div>

      {quotes === null ? (
        <DataTableSkeleton />
      ) : quotes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aún no se han generado cotizaciones.
        </p>
      ) : (
        <QuotesCrmTable
          initialQuotes={quotes}
          apiEndpoint="/api/collaborator/generated-quotes"
          editBase="/collaborator/dashboard/quotes"
          canUpdateStatus={false}
          canEdit={permissions.canUpdateQuotes}
          canDelete={permissions.canDeleteQuotes}
        />
      )}
    </div>
  );
}
