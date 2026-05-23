import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { formatPhone } from "@/lib/utils";
import { QuoteRowActions } from "@/components/dashboard/quotes/quote-row-actions";

export const metadata = {
  title: "Cotizaciones | JTP Logistics",
};

export default async function QuotesPage() {
  await requireAdmin();

  const quotes = await prisma.generatedQuote.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      quoteNumber: true,
      company: true,
      contact: true,
      phone: true,
      validUntil: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-heading">Cotizaciones</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Historial de cotizaciones generadas.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/dashboard/quotes/new">
            <Plus className="size-4" />
            Nueva cotización
          </Link>
        </Button>
      </div>

      {quotes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aún no se han generado cotizaciones.
        </p>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Últimas 50 cotizaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">No. Cotización</th>
                    <th className="px-4 py-2 text-left font-medium">Compañía</th>
                    <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">Contacto</th>
                    <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Teléfono</th>
                    <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Vigencia</th>
                    <th className="px-4 py-2 text-left font-medium hidden lg:table-cell">Generado por</th>
                    <th className="px-4 py-2 text-left font-medium">Fecha</th>
                    <th className="px-4 py-2 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{q.quoteNumber}</td>
                      <td className="px-4 py-3">{q.company}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{q.contact}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{q.phone ? formatPhone(q.phone) : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {q.validUntil.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{q.createdBy.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {q.createdAt.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-2 py-2">
                        <QuoteRowActions id={q.id} quoteNumber={q.quoteNumber} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
