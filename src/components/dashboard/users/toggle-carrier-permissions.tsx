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
}) {
  const [canEditRoutes, setCanEditRoutes] = useState(initialCanEditRoutes);
  const [canEditTarget, setCanEditTarget] = useState(initialCanEditTarget);
  const [isLoading, setIsLoading] = useState(false);

  const isUnlocked = canEditRoutes || canEditTarget;

  async function handleToggle() {
    const next = !isUnlocked;
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
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Permisos de edición</p>
        <p className="text-muted-foreground text-xs">
          Rutas: {canEditRoutes ? "desbloqueadas" : "bloqueadas"}
          {" · "}
          Target: {canEditTarget ? "habilitado" : "deshabilitado"}
        </p>
      </div>
      <Button
        type="button"
        variant={isUnlocked ? "destructive" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
        className="shrink-0"
      >
        {isLoading ? "Guardando…" : isUnlocked ? "Bloquear" : "Desbloquear"}
      </Button>
    </div>
  );
}
