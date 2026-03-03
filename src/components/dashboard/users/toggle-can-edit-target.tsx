"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ToggleCanEditTarget({
  userId,
  initialValue,
}: {
  userId: string;
  initialValue: boolean;
}) {
  const [canEditTarget, setCanEditTarget] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggle() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/can-edit-target`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canEditTarget: !canEditTarget }),
      });
      if (res.ok) setCanEditTarget((prev) => !prev);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Editar target</p>
        <p className="text-muted-foreground text-xs">
          {canEditTarget
            ? "Habilitado — puede modificar su target."
            : "Deshabilitado — no puede modificar su target."}
        </p>
      </div>
      <Button
        type="button"
        variant={canEditTarget ? "destructive" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
        className="shrink-0"
      >
        {isLoading
          ? "Guardando…"
          : canEditTarget
            ? "Revocar permiso"
            : "Dar permiso"}
      </Button>
    </div>
  );
}
