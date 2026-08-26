"use client";

import { SupportPanel } from "@/components/dashboard/support/support-panel";

export default function SupportPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Soporte de TI</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          ¿Problemas con tu equipo? Escríbenos y le damos seguimiento.
        </p>
      </div>
      <SupportPanel />
    </div>
  );
}
