"use client";

import { usePathname } from "next/navigation";
import { QuoteDetailView } from "@/components/dashboard/quotes/quote-detail-view";
import { quoteScopeFromPath, quotesBase } from "@/lib/quote-scope";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";

export default function CollaboratorQuoteDetailPage() {
  const { permissions, isLoaded } = useCollaboratorPermissions();
  // Sirve a los dos cotizadores: la URL dice a cuál regresar.
  const base = quotesBase("collaborator", quoteScopeFromPath(usePathname()));
  if (!isLoaded) return <ResourceDetailSkeleton />;
  return (
    <QuoteDetailView
      apiEndpoint="/api/collaborator/generated-quotes"
      listHref={base}
      editBase={permissions?.canUpdateQuotes ? base : undefined}
    />
  );
}
