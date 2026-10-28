"use client";

import { QuoteDetailView } from "@/components/dashboard/quotes/quote-detail-view";

// El vendedor consulta y descarga; la edición y los comentarios son del equipo de JTP.
export default function VendorQuoteDetailPage() {
  return (
    <QuoteDetailView
      apiEndpoint="/api/vendor/generated-quotes"
      listHref="/vendor/dashboard/generated-quotes"
      showComments={false}
    />
  );
}
