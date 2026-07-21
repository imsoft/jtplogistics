"use client";

import { useState, useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import type { UnitTypeDef } from "@/types/unit-type.types";

export default function CollaboratorUnitTypesPage() {
  const [unitTypes, setUnitTypes] = useState<UnitTypeDef[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/unit-types")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar tipos de unidades");
        return r.json();
      })
      .then((data: UnitTypeDef[]) => {
        setUnitTypes(data);
        setIsLoaded(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, []);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading flex items-center gap-2">
            Tipos de unidades
            {isLoaded && (
              <span className="text-sm font-normal text-muted-foreground">({unitTypes.length})</span>
            )}
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Tipos de unidades disponibles en el sistema.
          </p>
        </div>
      </div>
      <Separator />
      {!isLoaded ? (
        <DataTableSkeleton />
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base sm:text-lg">Tipos registrados</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Estos son los tipos de unidades que puedes usar al crear rutas. La información es de solo lectura.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {unitTypes.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">No hay tipos de unidades registrados.</p>
            ) : (
              <div className="divide-y">
                <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Nombre</span>
                  <span>Valor</span>
                </div>
                {unitTypes.map((u) => (
                  <div
                    key={u.id}
                    className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 items-center hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium">{u.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{u.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
