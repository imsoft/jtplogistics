"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { QuoteComments } from "@/components/dashboard/quotes/quote-comments";
import { QuoteDownloadButton } from "@/components/dashboard/quotes/quote-download-button";
import { QuoteSendButton } from "@/components/dashboard/quotes/quote-send-button";
import { QUOTE_STATUS_CONFIG, getQuoteDisplayStatus } from "@/lib/constants/quote-status";
import { QUOTE_REJECTION_LABELS } from "@/lib/quote-rejection";
import { formatMxn, formatPhone } from "@/lib/utils";
import type { QuoteRow } from "@/types/carrier-quote.types";
import type { QuoteStatus } from "@prisma/client";

interface QuoteDetail {
  id: string;
  quoteNumber: string;
  company: string;
  contact: string;
  phone: string | null;
  email: string | null;
  validUntil: string;
  rows: QuoteRow[];
  status: QuoteStatus;
  rejectionReason: string | null;
  rejectionNote: string | null;
  creatorName: string;
  creatorPosition: string | null;
  createdAt: string;
}

/** Fila de dato para la columna angosta: corta por palabras, no por letras. */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b py-3 last:border-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 text-sm font-medium break-words">{value ?? "—"}</p>
    </div>
  );
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

/**
 * Perfil de una cotización: todo lo que tiene, sin entrar a editarla.
 * Desde aquí se descarga el PDF, se envía o (con permiso) se abre la edición.
 */
export function QuoteDetailView({
  apiEndpoint,
  listHref,
  editBase,
  showComments = true,
}: {
  apiEndpoint: string;
  listHref: string;
  /** Sin él no se ofrece editar (vendedor o colaborador sin permiso). */
  editBase?: string;
  showComments?: boolean;
}) {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiEndpoint}/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: QuoteDetail) => setQuote(d))
      .catch(() => setError("No se pudo cargar la cotización."));
  }, [apiEndpoint, id]);

  if (error) return <p className="text-destructive py-6 text-sm">{error}</p>;
  if (!quote) return <ResourceDetailSkeleton />;

  const display = getQuoteDisplayStatus(quote.status, quote.validUntil);
  const status = QUOTE_STATUS_CONFIG[display];
  const rows = Array.isArray(quote.rows) ? quote.rows : [];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={listHref} aria-label="Volver a cotizaciones">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="page-heading truncate">{quote.quoteNumber}</h1>
              <Badge variant="outline" className={`shrink-0 border-0 text-xs font-medium ${status.badgeClass}`}>
                {status.label}
              </Badge>
            </div>
            <p className="text-muted-foreground truncate text-sm">{quote.company || "Sin cliente"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuoteDownloadButton id={quote.id} quoteNumber={quote.quoteNumber} apiEndpoint={apiEndpoint} />
          <QuoteSendButton id={quote.id} quoteNumber={quote.quoteNumber} apiEndpoint={apiEndpoint} />
          {editBase && (
            <Button asChild>
              <Link href={`${editBase}/${quote.id}/edit`}>
                <Pencil className="size-4" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Compañía" value={quote.company || null} />
              <InfoRow label="Contacto" value={quote.contact || null} />
              <InfoRow label="Teléfono" value={quote.phone ? formatPhone(quote.phone) : null} />
              <InfoRow label="Correo" value={quote.email} isEmail />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rutas cotizadas ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin rutas.</p>
              ) : (
                <div className="w-full overflow-x-auto rounded-md border">
                  <table className="w-full text-xs font-medium tracking-wide">
                    <thead>
                      <tr className="bg-primary/[0.07] border-b">
                        {["Origen", "Destino", "Estado", "Unidad"].map((h) => (
                          <th key={h} className="text-primary px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>
                        ))}
                        <th className="text-primary px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2.5">{r.origin}</td>
                          <td className="px-3 py-2.5">{r.destination}</td>
                          <td className="text-muted-foreground px-3 py-2.5">{r.destinationState ?? "—"}</td>
                          <td className="px-3 py-2.5">{r.unitLabel}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">${formatMxn(Number(r.cost) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Datos de la cotización</CardTitle>
            </CardHeader>
            <CardContent>
              <Field label="Estado" value={status.label} />
              {quote.status === "rechazada" && (
                <>
                  <Field
                    label="Motivo"
                    value={quote.rejectionReason ? QUOTE_REJECTION_LABELS[quote.rejectionReason as keyof typeof QUOTE_REJECTION_LABELS] ?? quote.rejectionReason : null}
                  />
                  {quote.rejectionNote && <Field label="Nota" value={quote.rejectionNote} />}
                </>
              )}
              <Field label="Vigencia" value={day(quote.validUntil)} />
              <Field label="Generada" value={day(quote.createdAt)} />
              <Field label="Generada por" value={[quote.creatorName, quote.creatorPosition].filter(Boolean).join(" · ") || null} />
            </CardContent>
          </Card>
          {showComments && <QuoteComments quoteId={quote.id} />}
        </div>
      </div>
    </div>
  );
}
