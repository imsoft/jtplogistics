"use client";

import { FinanceDetailView } from "@/components/dashboard/finances/finance-detail-view";

export default function FinanceShipmentReadOnlyPage() {
  return <FinanceDetailView panel="admin" canMarkEvidence />;
}
