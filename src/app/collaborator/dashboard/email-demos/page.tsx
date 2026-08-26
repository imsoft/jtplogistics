"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { EmailDemos } from "@/components/dashboard/resources/email-demos";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { DataTableSkeleton } from "@/components/ui/skeletons";

export default function CollaboratorEmailDemosPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewEmailDemos && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [isLoaded, permissions, router]);

  if (!isLoaded) return <DataTableSkeleton />;
  if (!permissions?.canViewEmailDemos) return null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Correos de prueba</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Manda a la cuenta que quieras cualquiera de los correos que envía la
          plataforma, con datos de ejemplo, para revisar cómo llegan.
        </p>
      </div>
      <Separator />
      <EmailDemos />
    </div>
  );
}
