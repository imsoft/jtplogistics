"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaritimeQuoteForm } from "@/components/dashboard/maritime-quotes/maritime-quote-form";
import type { MaritimeQuoteInput } from "@/lib/maritime-quote";

export default function EditCollaboratorMaritimeQuotePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [initialInput, setInitialInput] = useState<MaritimeQuoteInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/maritime-quotes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar la cotización");
        return r.json();
      })
      .then((q: { reference: string; client: string; validUntil: string; data: MaritimeQuoteInput }) => {
        setInitialInput({
          ...q.data,
          reference: q.reference,
          client: q.client,
          validUntil: q.validUntil,
        });
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/collaborator/dashboard/maritime-quotes" aria-label="Volver">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Editar cotización marítima</h1>
        </div>
      </div>
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : initialInput === null ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <MaritimeQuoteForm mode="edit" quoteId={id} backHref="/collaborator/dashboard/maritime-quotes" initialInput={initialInput} />
      )}
    </div>
  );
}
