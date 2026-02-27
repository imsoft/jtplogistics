"use client";

import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { EmailForm } from "@/components/dashboard/resources/email-form";
import type { EmailAccount } from "@/types/resources.types";

export default function EditEmailPage() {
  const { data: account, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<EmailAccount>({
      endpoint: "/api/admin/emails",
      redirectHref: "/admin/dashboard/emails",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={account?.email ?? "Cuenta de correo"}
        description="Editar información de la cuenta de correo."
        backHref="/admin/dashboard/emails"
        backLabel="Volver a correos"
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
            cancelHref="/admin/dashboard/emails"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
