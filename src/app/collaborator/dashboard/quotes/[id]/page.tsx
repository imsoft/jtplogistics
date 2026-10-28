"use client";

import { QuoteDetailView } from "@/components/dashboard/quotes/quote-detail-view";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";

export default function CollaboratorQuoteDetailPage() {
  const { permissions, isLoaded } = useCollaboratorPermissions();
  if (!isLoaded) return <ResourceDetailSkeleton />;
  return (
    <QuoteDetailView
      apiEndpoint="/api/collaborator/generated-quotes"
      listHref="/collaborator/dashboard/quotes"
      editBase={permissions?.canUpdateQuotes ? "/collaborator/dashboard/quotes" : undefined}
    />
  );
}
