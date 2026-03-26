"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ToggleCarrierPermissions({
  userId,
  initialCanEditRoutes,
  initialCanEditTarget,
  initialCanAddRoutes,
}: {
  userId: string;
  initialCanEditRoutes: boolean;
  initialCanEditTarget: boolean;
  initialCanAddRoutes: boolean;
}) {
  const [canEditRoutes, setCanEditRoutes] = useState(initialCanEditRoutes);
  const [canEditTarget, setCanEditTarget] = useState(initialCanEditTarget);
  const [canAddRoutes, setCanAddRoutes] = useState(initialCanAddRoutes);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAdd, setIsLoadingAdd] = useState(false);

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

  async function handleToggleAdd() {
    const next = !canAddRoutes;
    setIsLoadingAdd(true);
    try {
      await fetch(`/api/admin/users/${userId}/can-add-routes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canAddRoutes: next }),
      });
      setCanAddRoutes(next);
    } finally {
      setIsLoadingAdd(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border px-4 py-3">
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
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Agregar rutas nuevas</p>
          <p className="text-muted-foreground text-xs">
            {canAddRoutes ? "Desbloqueado — puede agregar nuevas rutas." : "Bloqueado — no puede agregar rutas nuevas."}
          </p>
        </div>
        <Button
          type="button"
          variant={canAddRoutes ? "destructive" : "outline"}
          size="sm"
          onClick={handleToggleAdd}
          disabled={isLoadingAdd}
          className="shrink-0"
        >
          {isLoadingAdd ? "Guardando…" : canAddRoutes ? "Bloquear agregar" : "Desbloquear agregar"}
        </Button>
      </div>
    </div>
  );
}
