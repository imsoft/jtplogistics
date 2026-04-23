"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { ShipmentForm } from "@/components/dashboard/resources/shipment-form";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import type { Shipment } from "@/types/shipment.types";

export default function EditShipmentPage() {
  const { id } = useParams<{ id: string }>();

  const { data: shipment, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Shipment>({
      endpoint: "/api/admin/shipments",
      redirectHref: `/admin/dashboard/shipments/${id}`,
      deleteRedirectHref: "/admin/dashboard/shipments",
    });

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockEmail, setUnlockEmail] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setIsUnlocking(true);
    setUnlockError("");
    try {
      const res = await fetch("/api/profile");
      const profile = await res.json() as { email?: string };
      if (profile.email?.toLowerCase() === unlockEmail.trim().toLowerCase()) {
        setIsUnlocked(true);
      } else {
        setUnlockError("El correo no coincide con tu cuenta.");
      }
    } catch {
      setUnlockError("No se pudo verificar. Intenta de nuevo.");
    } finally {
      setIsUnlocking(false);
    }
  }

  async function handleSubmitWithConfirmation(formData: unknown) {
    await handleSubmit({ ...(formData as object), _confirmedEmail: unlockEmail.trim().toLowerCase() });
  }

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  const title = shipment
    ? [shipment.eco, shipment.origin, shipment.destination].filter(Boolean).join(" – ") || "Embarque"
    : "Embarque";

  const isClosed = shipment?.status === "returned";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={title}
        description="Editar información del embarque."
        backHref={`/admin/dashboard/shipments/${id}`}
        backLabel="Volver al detalle"
        deleteTitle="¿Eliminar embarque?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
        showDelete={shipment?.status !== "returned"}
      />

      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        {isClosed && !isUnlocked && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="mb-3 flex items-center gap-2">
              <LockKeyhole className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                Embarque cerrado
              </p>
            </div>
            <p className="mb-4 text-sm text-amber-700 dark:text-amber-500">
              Este embarque está cerrado. Escribe tu correo electrónico para verificar que quieres editarlo.
            </p>
            <form onSubmit={handleUnlock} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="unlock-email" className="text-xs text-amber-800 dark:text-amber-400">
                  Correo electrónico
                </Label>
                <Input
                  id="unlock-email"
                  type="email"
                  value={unlockEmail}
                  onChange={(e) => { setUnlockEmail(e.target.value); setUnlockError(""); }}
                  className="bg-white dark:bg-transparent"
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={!unlockEmail.trim() || isUnlocking} className="sm:self-end">
                {isUnlocking ? "Verificando…" : "Desbloquear"}
              </Button>
            </form>
            {unlockError && (
              <p className="mt-2 text-xs text-destructive">{unlockError}</p>
            )}
          </div>
        )}

        {shipment && (
          <ShipmentForm
            initialValues={shipment}
            submitLabel="Guardar cambios"
            cancelHref={`/admin/dashboard/shipments/${id}`}
            onSubmit={isClosed ? handleSubmitWithConfirmation : handleSubmit}
            isSubmitting={isSubmitting}
            unlocked={isUnlocked}
          />
        )}
      </div>
    </div>
  );
}
