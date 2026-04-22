"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoutesBulkImport } from "@/components/dashboard/routes/routes-bulk-import";

export default function ImportRoutesPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/admin/dashboard/routes" aria-label="Volver a rutas">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="page-heading">Importar rutas</h1>
          <p className="text-muted-foreground truncate text-xs sm:text-sm">
            Importa rutas masivamente desde Excel o CSV.
          </p>
        </div>
      </div>
      <div className="w-full min-w-0">
        <RoutesBulkImport />
      </div>
    </div>
  );
}
