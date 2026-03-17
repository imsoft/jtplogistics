"use client";

import { useState } from "react";
import Link from "next/link";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { IdeaForm } from "@/components/dashboard/ideas/idea-form";
import { Button } from "@/components/ui/button";
import { IDEA_STATUS_COLORS, IDEA_STATUS_LABELS } from "@/lib/constants/idea-category";
import type { Idea, IdeaStatus } from "@/types/idea.types";

export default function EditIdeaPage() {
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  const {
    data: idea,
    setData: setIdea,
    isLoaded,
    error,
    isSubmitting,
    handleSubmit,
    handleDelete,
  } = useResourceEdit<Idea>({
    endpoint: "/api/admin/ideas",
    redirectHref: "/admin/dashboard/ideas",
  });

  async function handleStatusChange(newStatus: IdeaStatus) {
    setStatusUpdating(true);
    setStatusError(null);
    setCreatedTaskId(null);
    try {
      const res = await fetch(`/api/admin/ideas/${idea!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Error al actualizar estado");
      const data = await res.json();
      setIdea((prev) => prev ? { ...prev, status: newStatus } : prev);
      if (data.taskId) setCreatedTaskId(data.taskId);
    } catch {
      setStatusError("No se pudo actualizar el estado");
    } finally {
      setStatusUpdating(false);
    }
  }

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  const currentStatus = idea?.status ?? "pending";
  const statusColor = IDEA_STATUS_COLORS[currentStatus] ?? "";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={idea?.title ?? "Idea"}
        description="Editar idea del equipo."
        backHref="/admin/dashboard/ideas"
        backLabel="Volver a ideas"
        deleteTitle="¿Eliminar idea?"
        deleteDescription="Esta acción no se puede deshacer. La idea se eliminará permanentemente."
        onDelete={handleDelete}
      />

      {/* Estado actual + acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-muted-foreground text-sm">Estado actual:</span>
        <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${statusColor}`}>
          {IDEA_STATUS_LABELS[currentStatus]}
        </span>
        {currentStatus !== "accepted" && (
          <Button
            size="sm"
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50"
            disabled={statusUpdating}
            onClick={() => handleStatusChange("accepted")}
          >
            Aceptar
          </Button>
        )}
        {currentStatus !== "rejected" && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-400 text-red-500 hover:bg-red-50"
            disabled={statusUpdating}
            onClick={() => handleStatusChange("rejected")}
          >
            Rechazar
          </Button>
        )}
        {currentStatus !== "pending" && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            disabled={statusUpdating}
            onClick={() => handleStatusChange("pending")}
          >
            Marcar como pendiente
          </Button>
        )}
        {statusError && <p className="text-destructive text-sm">{statusError}</p>}
        {createdTaskId && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Tarea creada.{" "}
            <Link
              href={`/admin/dashboard/tasks/${createdTaskId}/edit`}
              className="underline underline-offset-2"
            >
              Ver tarea →
            </Link>
          </p>
        )}
      </div>

      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {idea && (
          <IdeaForm
            initialValues={idea}
            submitLabel="Guardar cambios"
            cancelHref="/admin/dashboard/ideas"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
