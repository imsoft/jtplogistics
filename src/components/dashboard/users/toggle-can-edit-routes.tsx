"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ToggleCanEditRoutes({
  userId,
  initialValue,
}: {
  userId: string;
  initialValue: boolean;
}) {
  const [canEditRoutes, setCanEditRoutes] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggle() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/can-edit-routes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canEditRoutes: !canEditRoutes }),
      });
      if (res.ok) setCanEditRoutes((prev) => !prev);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Editar selección de rutas</p>
        <p className="text-muted-foreground text-xs">
          {canEditRoutes
            ? "Habilitado — puede modificar sus rutas seleccionadas."
            : "Bloqueado — no puede modificar sus rutas seleccionadas."}
        </p>
      </div>
      <Button
        type="button"
        variant={canEditRoutes ? "destructive" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
        className="shrink-0"
      >
        {isLoading
          ? "Guardando…"
          : canEditRoutes
            ? "Bloquear"
            : "Desbloquear"}
      </Button>
    </div>
  );
}
