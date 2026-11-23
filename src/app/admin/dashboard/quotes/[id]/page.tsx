"use client";

import { usePathname } from "next/navigation";
import { QuoteDetailView } from "@/components/dashboard/quotes/quote-detail-view";
import { quoteScopeFromPath, quotesBase } from "@/lib/quote-scope";

/** Sirve a los dos cotizadores: la URL dice a cuál regresar. */
export default function AdminQuoteDetailPage() {
  const base = quotesBase("admin", quoteScopeFromPath(usePathname()));
  return (
    <QuoteDetailView
      apiEndpoint="/api/admin/generated-quotes"
      listHref={base}
      editBase={base}
    />
  );
}
