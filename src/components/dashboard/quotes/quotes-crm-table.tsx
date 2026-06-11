"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { QuoteStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPhone, cn } from "@/lib/utils";
import {
  QUOTE_STATUS_CONFIG,
  QUOTE_STATUS_OPTIONS,
  getQuoteDisplayStatus,
  type QuoteStatusDisplay,
} from "@/lib/constants/quote-status";
import { QuoteRowActions } from "@/components/dashboard/quotes/quote-row-actions";

export interface CrmQuote {
  id: string;
  quoteNumber: string;
  company: string;
  contact: string;
  phone: string | null;
  validUntil: string;
  createdAt: string;
  createdByName: string;
  status: QuoteStatus;
}

const FILTER_ALL = "all" as const;
type FilterValue = typeof FILTER_ALL | QuoteStatusDisplay;

function StatusBadge({ status }: { status: QuoteStatusDisplay }) {
  const config = QUOTE_STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("border-0", config.badgeClass)}>
      {config.label}
    </Badge>
  );
}

function StatusCell({
  quote,
  onChange,
}: {
  quote: CrmQuote;
  onChange: (id: string, status: QuoteStatus) => void;
}) {
  const display = getQuoteDisplayStatus(quote.status, quote.validUntil);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <StatusBadge status={display} />
        <ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {QUOTE_STATUS_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onChange(quote.id, opt.value)}
            className={cn(quote.status === opt.value && "font-semibold")}
          >
            <span
              className={cn(
                "mr-2 inline-block size-2 rounded-full",
                QUOTE_STATUS_CONFIG[opt.value].badgeClass
              )}
            />
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function QuotesCrmTable({ initialQuotes }: { initialQuotes: CrmQuote[] }) {
  const [quotes, setQuotes] = useState<CrmQuote[]>(initialQuotes);
  const [filter, setFilter] = useState<FilterValue>(FILTER_ALL);

  // Conteo por estado mostrado (incluye "vencida" calculada).
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const q of quotes) {
      const d = getQuoteDisplayStatus(q.status, q.validUntil);
      c[d] = (c[d] ?? 0) + 1;
    }
    return c;
  }, [quotes]);

  const filtered = useMemo(() => {
    if (filter === FILTER_ALL) return quotes;
    return quotes.filter(
      (q) => getQuoteDisplayStatus(q.status, q.validUntil) === filter
    );
  }, [quotes, filter]);

  async function changeStatus(id: string, status: QuoteStatus) {
    const prev = quotes;
    setQuotes((qs) => qs.map((q) => (q.id === id ? { ...q, status } : q)));
    try {
      const res = await fetch(`/api/admin/generated-quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Estado actualizado");
    } catch {
      setQuotes(prev);
      toast.error("No se pudo actualizar el estado");
    }
  }

  const filterChips: { value: FilterValue; label: string; count: number }[] = [
    { value: FILTER_ALL, label: "Todas", count: quotes.length },
    ...(
      ["enviada", "negociacion", "aceptada", "rechazada", "vencida", "borrador"] as QuoteStatusDisplay[]
    )
      .map((s) => ({
        value: s,
        label: QUOTE_STATUS_CONFIG[s].label,
        count: counts[s] ?? 0,
      }))
      .filter((c) => c.count > 0),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => {
          const active = filter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilter(chip.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold",
                  active ? "bg-primary-foreground/20" : "bg-muted"
                )}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">No. Cotización</th>
                  <th className="px-4 py-2 text-left font-medium">Compañía</th>
                  <th className="px-4 py-2 text-left font-medium">Estado</th>
                  <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">Contacto</th>
                  <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Teléfono</th>
                  <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Vigencia</th>
                  <th className="px-4 py-2 text-left font-medium hidden lg:table-cell">Generado por</th>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{q.quoteNumber}</td>
                    <td className="px-4 py-3">{q.company}</td>
                    <td className="px-4 py-3">
                      <StatusCell quote={q} onChange={changeStatus} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{q.contact}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {q.phone ? formatPhone(q.phone) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {new Date(q.validUntil).toLocaleDateString("es-MX", {
                        year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{q.createdByName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(q.createdAt).toLocaleDateString("es-MX", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </td>
                    <td className="px-2 py-2">
                      <QuoteRowActions id={q.id} quoteNumber={q.quoteNumber} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No hay cotizaciones en este estado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
