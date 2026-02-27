"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { IdeaForm } from "@/components/dashboard/ideas/idea-form";

export default function NewIdeaAdminPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/ideas",
    redirectHref: "/admin/dashboard/ideas",
  });

  return (
    <ResourceNewPage
      title="Nueva idea"
      description="Comparte una idea o sugerencia con el equipo."
      backHref="/admin/dashboard/ideas"
      backLabel="Volver a ideas"
      error={error}
    >
      <IdeaForm
        submitLabel="Crear idea"
        cancelHref="/admin/dashboard/ideas"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
