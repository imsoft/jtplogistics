"use client";

import { QuoteDetailView } from "@/components/dashboard/quotes/quote-detail-view";

export default function AdminQuoteDetailPage() {
  return (
    <QuoteDetailView
      apiEndpoint="/api/admin/generated-quotes"
      listHref="/admin/dashboard/quotes"
      editBase="/admin/dashboard/quotes"
    />
  );
}
