"use client";

import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { IdeaForm } from "@/components/dashboard/ideas/idea-form";
import type { Idea } from "@/types/idea.types";

export default function EditIdeaPage() {
  const {
    data: idea,
    isLoaded,
    error,
    isSubmitting,
    handleSubmit,
    handleDelete,
  } = useResourceEdit<Idea>({
    endpoint: "/api/admin/ideas",
    redirectHref: "/admin/dashboard/ideas",
  });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

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
