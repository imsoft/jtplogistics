import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import {
  QuotesCrmTable,
  type CrmQuote,
} from "@/components/dashboard/quotes/quotes-crm-table";

export const metadata = {
  title: "Cotizaciones | JTP Logistics",
};

export default async function QuotesPage() {
  await requireAdmin();

  const quotes = await prisma.generatedQuote.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quoteNumber: true,
      company: true,
      contact: true,
      phone: true,
      validUntil: true,
      status: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });

  const crmQuotes: CrmQuote[] = quotes.map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    company: q.company,
    contact: q.contact,
    phone: q.phone,
    validUntil: q.validUntil.toISOString(),
    status: q.status,
    createdAt: q.createdAt.toISOString(),
    createdByName: q.createdBy.name,
  }));

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-heading">Cotizaciones</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Seguimiento del estado de cada cotización generada.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/dashboard/quotes/new">
            <Plus className="size-4" />
            Nueva cotización
          </Link>
        </Button>
      </div>

      {crmQuotes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aún no se han generado cotizaciones.
        </p>
      ) : (
        <QuotesCrmTable initialQuotes={crmQuotes} />
      )}
    </div>
  );
}
