"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GeneratedQuotesTable } from "@/components/dashboard/quotes/generated-quotes-table";

export default function CollaboratorQuotesPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="page-heading">Mis cotizaciones</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Las cotizaciones que has creado y guardado con número de referencia.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/collaborator/dashboard/quotes/new">
            <Plus className="size-4 mr-2" />
            Nueva cotización
          </Link>
        </Button>
      </div>

      <Separator />

      <GeneratedQuotesTable />
    </div>
  );
}
