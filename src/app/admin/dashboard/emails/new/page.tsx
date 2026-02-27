"use client";

import { useResourceCreate } from "@/hooks/use-resource-create";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { EmailForm } from "@/components/dashboard/resources/email-form";

export default function NewEmailPage() {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({
    endpoint: "/api/admin/emails",
    redirectHref: "/admin/dashboard/emails",
  });

  return (
    <ResourceNewPage
      title="Nueva cuenta de correo"
      description="Registra una cuenta de correo en el sistema."
      backHref="/admin/dashboard/emails"
      backLabel="Volver a correos"
      error={error}
    >
      <EmailForm
        submitLabel="Crear cuenta"
        cancelHref="/admin/dashboard/emails"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ResourceNewPage>
  );
}
