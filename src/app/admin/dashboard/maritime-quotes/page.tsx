import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { computeMaritimeQuote, type MaritimeQuoteInput } from "@/lib/maritime-quote";
import {
  MaritimeQuotesCrmTable,
  type CrmMaritimeQuote,
} from "@/components/dashboard/maritime-quotes/maritime-quotes-crm-table";

export const metadata = {
  title: "Cotización marítima | JTP Logistics",
};

export default async function MaritimeQuotesPage() {
  await requireAdmin();

  const quotes = await prisma.maritimeQuote.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      client: true,
      data: true,
      status: true,
      validUntil: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });

  const crmQuotes: CrmMaritimeQuote[] = quotes.map((q) => ({
    id: q.id,
    reference: q.reference,
    client: q.client,
    status: q.status,
    validUntil: q.validUntil.toISOString(),
    createdAt: q.createdAt.toISOString(),
    createdByName: q.createdBy.name,
    total: computeMaritimeQuote(q.data as unknown as MaritimeQuoteInput).totalADepositar,
  }));

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-heading">Cotización marítima</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Solicitudes de impuestos de importación y su estado.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/dashboard/maritime-quotes/new">
            <Plus className="size-4" />
            Nueva cotización
          </Link>
        </Button>
      </div>

      {crmQuotes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aún no se han generado cotizaciones marítimas.
        </p>
      ) : (
        <MaritimeQuotesCrmTable initialQuotes={crmQuotes} editBase="/admin/dashboard/maritime-quotes" canEditAccepted />
      )}
    </div>
  );
}
