"use client";

import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthlyEvaluations, OverallCard } from "@/components/dashboard/evaluations/evaluations-view";
import type { CarrierEvaluations } from "@/lib/carrier-evaluation-server";

type Data = CarrierEvaluations | { legalName: null; overall: null; months: [] };

/** "Mis evaluaciones": cómo califica JTP al proveedor, en general y mes por mes. */
export default function CarrierEvaluationsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/carrier/evaluations")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => setData(d))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Mis evaluaciones</h1>
        <p className="text-muted-foreground mt-1 text-xs font-semibold tracking-wide uppercase sm:text-sm">
          Tu calificación en JTP y cómo te fue cada mes.
        </p>
        <Separator className="mt-4" />
      </div>

      {error ? (
        <p className="text-destructive text-sm">No se pudieron cargar tus evaluaciones.</p>
      ) : !data ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : data.legalName === null ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Para ver tus evaluaciones, completa la razón social en tu perfil.
        </p>
      ) : (
        <>
          <OverallCard data={data} />
          <div className="text-muted-foreground rounded-lg border bg-muted/30 p-4 text-xs">
            Cada mes se califica con tus embarques: puntualidad, entregas e incidencias. JTP puede ajustar la calificación y dejarte un
            comentario. 5 estrellas es excelente.
          </div>
          <MonthlyEvaluations months={data.months} />
        </>
      )}
    </div>
  );
}
