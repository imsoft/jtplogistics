"use client";

import { FinanceDetailView } from "@/components/dashboard/finances/finance-detail-view";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorFinanceReadOnlyPage() {
  const { permissions } = useCollaboratorPermissions();
  return <FinanceDetailView panel="collaborator" canMarkEvidence={Boolean(permissions?.canUpdateFinances)} />;
}
