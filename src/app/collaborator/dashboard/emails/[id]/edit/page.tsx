"use client";

import { useParams } from "next/navigation";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { EmailForm } from "@/components/dashboard/resources/email-form";
import type { EmailAccount } from "@/types/resources.types";

export default function EditCollaboratorEmailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: account, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<EmailAccount>({
      endpoint: "/api/collaborator/emails",
      redirectHref: `/collaborator/dashboard/emails/${id}`,
      deleteRedirectHref: "/collaborator/dashboard/emails",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={account?.email ?? "Cuenta de correo"}
        description="Editar información de la cuenta de correo."
        backHref={`/collaborator/dashboard/emails/${id}`}
        backLabel="Volver a la cuenta"
        deleteTitle="¿Eliminar cuenta?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
      />
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {account && (
          <EmailForm
            initialValues={account}
            submitLabel="Guardar cambios"
            cancelHref={`/collaborator/dashboard/emails/${id}`}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
