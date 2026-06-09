"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { QuoteStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn, formatMxn } from "@/lib/utils";
import {
  QUOTE_STATUS_CONFIG,
  QUOTE_STATUS_OPTIONS,
  getQuoteDisplayStatus,
  type QuoteStatusDisplay,
} from "@/lib/constants/quote-status";

export interface CrmMaritimeQuote {
  id: string;
  reference: string;
  client: string;
  status: QuoteStatus;
  validUntil: string;
  createdAt: string;
  createdByName: string;
  total: number;
}

const FILTER_ALL = "all" as const;
type FilterValue = typeof FILTER_ALL | QuoteStatusDisplay;

export function MaritimeQuotesCrmTable({
  initialQuotes,
  editBase,
}: {
  initialQuotes: CrmMaritimeQuote[];
  editBase: string;
}) {
  const [quotes, setQuotes] = useState<CrmMaritimeQuote[]>(initialQuotes);
  const [filter, setFilter] = useState<FilterValue>(FILTER_ALL);

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
    return quotes.filter((q) => getQuoteDisplayStatus(q.status, q.validUntil) === filter);
  }, [quotes, filter]);

  async function changeStatus(id: string, status: QuoteStatus) {
    const prev = quotes;
    setQuotes((qs) => qs.map((q) => (q.id === id ? { ...q, status } : q)));
    try {
      const res = await fetch(`/api/maritime-quotes/${id}`, {
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

  async function remove(id: string) {
    const prev = quotes;
    setQuotes((qs) => qs.filter((q) => q.id !== id));
    try {
      const res = await fetch(`/api/maritime-quotes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Cotización eliminada");
    } catch {
      setQuotes(prev);
      toast.error("No se pudo eliminar");
    }
  }

  const filterChips: { value: FilterValue; label: string; count: number }[] = [
    { value: FILTER_ALL, label: "Todas", count: quotes.length },
    ...(["enviada", "negociacion", "aceptada", "rechazada", "vencida", "borrador"] as QuoteStatusDisplay[])
      .map((sName) => ({ value: sName, label: QUOTE_STATUS_CONFIG[sName].label, count: counts[sName] ?? 0 }))
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
              <span className={cn("rounded-full px-1.5 text-[10px] font-semibold", active ? "bg-primary-foreground/20" : "bg-muted")}>
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
                  <th className="px-4 py-2 text-left font-medium">Referencia</th>
                  <th className="px-4 py-2 text-left font-medium">Cliente</th>
                  <th className="px-4 py-2 text-left font-medium">Estado</th>
                  <th className="px-4 py-2 text-right font-medium">Total a depositar</th>
                  <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Vigencia</th>
                  <th className="px-4 py-2 text-left font-medium hidden lg:table-cell">Creó</th>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => {
                  const display = getQuoteDisplayStatus(q.status, q.validUntil);
                  return (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{q.reference}</td>
                      <td className="px-4 py-3">{q.client}</td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <Badge variant="outline" className={cn("border-0", QUOTE_STATUS_CONFIG[display].badgeClass)}>
                              {QUOTE_STATUS_CONFIG[display].label}
                            </Badge>
                            <ChevronDown className="size-3 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {QUOTE_STATUS_OPTIONS.map((opt) => (
                              <DropdownMenuItem
                                key={opt.value}
                                onClick={() => changeStatus(q.id, opt.value)}
                                className={cn(q.status === opt.value && "font-semibold")}
                              >
                                <span className={cn("mr-2 inline-block size-2 rounded-full", QUOTE_STATUS_CONFIG[opt.value].badgeClass)} />
                                {opt.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatMxn(q.total)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {new Date(q.validUntil).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{q.createdByName}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(q.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-7" asChild>
                            <Link href={`${editBase}/${q.id}/edit`} aria-label="Editar">
                              <Pencil className="size-3.5" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" aria-label="Eliminar">
                                <Trash2 className="size-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará {q.reference} del historial. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => remove(q.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No hay cotizaciones marítimas en este estado.
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
