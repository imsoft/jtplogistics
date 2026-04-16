"use client";

import { useState, useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="min-w-0">
        <h1 className="page-heading">Tipos de unidades</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Tipos de unidades disponibles en el sistema.
        </p>
      </div>
      <Separator />
      {!isLoaded ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Tipos registrados</CardTitle>
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
                    className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 items-center"
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
