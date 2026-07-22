"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { IdeasTable } from "@/components/dashboard/ideas/ideas-table";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorIdeasPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewIdeas && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [isLoaded, permissions, router]);

  if (!isLoaded) {
    return (
      <ResourceListPage title="Ideas" description="Banco de ideas de la empresa.">
        <DataTableSkeleton />
      </ResourceListPage>
    );
  }

  if (!permissions?.canViewIdeas) return null;

  return (
    <ResourceListPage
      title="Ideas"
      description="Banco de ideas de la empresa."
      newHref={permissions.canCreateIdeas ? "/collaborator/dashboard/ideas/new" : undefined}
      newLabel={permissions.canCreateIdeas ? "Nueva idea" : undefined}
    >
      <IdeasTable apiEndpoint="/api/ideas" />
    </ResourceListPage>
  );
}
