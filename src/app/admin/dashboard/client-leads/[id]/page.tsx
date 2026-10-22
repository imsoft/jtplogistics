"use client";

import { useSession } from "@/lib/auth-client";
import { LeadDetailView } from "@/components/dashboard/client-leads/lead-detail";

export default function ClientLeadPage() {
  const { data: session } = useSession();
  return (
    <LeadDetailView
      basePath="/admin/dashboard/client-leads"
      panelBase="/admin/dashboard"
      clientsEndpoint="/api/admin/clients"
      canEdit
      canDelete
      currentUserId={session?.user.id ?? null}
    />
  );
}
