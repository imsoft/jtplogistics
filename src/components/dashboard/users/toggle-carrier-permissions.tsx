"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ToggleCarrierPermissions({
  userId,
  initialCanEditRoutes,
  initialCanEditTarget,
}: {
  userId: string;
  initialCanEditRoutes: boolean;
  initialCanEditTarget: boolean;
  initialCanAddRoutes?: boolean;
}) {
  const [canEditRoutes, setCanEditRoutes] = useState(initialCanEditRoutes);
  const [canEditTarget, setCanEditTarget] = useState(initialCanEditTarget);
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggleEdit() {
    const next = !canEditRoutes;
    setIsLoading(true);
    try {
      await Promise.all([
        fetch(`/api/admin/users/${userId}/can-edit-routes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canEditRoutes: next }),
        }),
        fetch(`/api/admin/users/${userId}/can-edit-target`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canEditTarget: next }),
        }),
      ]);
      setCanEditRoutes(next);
      setCanEditTarget(next);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Editar rutas existentes</p>
          <p className="text-muted-foreground text-xs">
            Rutas: {canEditRoutes ? "desbloqueadas" : "bloqueadas"}
            {" · "}
            Target: {canEditTarget ? "habilitado" : "deshabilitado"}
          </p>
        </div>
        <Button
          type="button"
          variant={canEditRoutes ? "destructive" : "outline"}
          size="sm"
          onClick={handleToggleEdit}
          disabled={isLoading}
          className="shrink-0"
        >
          {isLoading ? "Guardando…" : canEditRoutes ? "Bloquear edición" : "Desbloquear edición"}
        </Button>
      </div>
    </div>
  );
}
