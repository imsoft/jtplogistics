import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth-server";
import { MaritimeQuoteForm } from "@/components/dashboard/maritime-quotes/maritime-quote-form";
import type { MaritimeQuoteInput } from "@/lib/maritime-quote";

export const metadata = {
  title: "Editar cotización marítima | JTP Logistics",
};

export default async function EditMaritimeQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const quote = await prisma.maritimeQuote.findUnique({ where: { id } });
  if (!quote) notFound();

  const initialInput = {
    ...(quote.data as unknown as MaritimeQuoteInput),
    reference: quote.reference,
    client: quote.client,
    validUntil: quote.validUntil.toISOString().split("T")[0],
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/admin/dashboard/maritime-quotes" aria-label="Volver">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Editar cotización marítima</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            {quote.reference}
          </p>
        </div>
      </div>
      <MaritimeQuoteForm mode="edit" quoteId={id} backHref="/admin/dashboard/maritime-quotes" initialInput={initialInput} />
    </div>
  );
}
