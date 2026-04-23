"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamOrgChart } from "@/components/dashboard/resources/team-org-chart";

export default function CollaboratorOrgChartPage() {
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/collaborator/dashboard/employees" aria-label="Volver a colaboradores">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Organigrama</h1>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Equipo organizado por departamento
          </p>
        </div>
      </div>

      <TeamOrgChart apiEndpoint="/api/collaborator/employees" />
    </div>
  );
}
