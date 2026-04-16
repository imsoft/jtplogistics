"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { EmailForm } from "@/components/dashboard/resources/email-form";

export default function NewCollaboratorEmailPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/collaborator/emails",
    redirectHref: "/collaborator/dashboard/emails",
  });

  return (
    <ResourceNewPage
      title="Nueva cuenta de correo"
      description="Registra una nueva cuenta de correo en el sistema."
      backHref="/collaborator/dashboard/emails"
      backLabel="Volver a correos"
      error={error}
    >
      <EmailForm
        submitLabel="Crear cuenta"
        cancelHref="/collaborator/dashboard/emails"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
