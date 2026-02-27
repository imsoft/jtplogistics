"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { IdeaForm } from "@/components/dashboard/ideas/idea-form";

export default function NewCollaboratorIdeaPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/ideas",
    redirectHref: "/collaborator/dashboard/ideas",
  });

  return (
    <ResourceNewPage
      title="Nueva idea"
      description="Comparte una idea o sugerencia con el equipo."
      backHref="/collaborator/dashboard/ideas"
      backLabel="Volver a ideas"
      error={error}
    >
      <IdeaForm
        submitLabel="Enviar idea"
        cancelHref="/collaborator/dashboard/ideas"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
