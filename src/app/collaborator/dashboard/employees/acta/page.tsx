import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { requireCollaboratorPage } from "@/lib/auth-server";
import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { ActaForm } from "@/components/dashboard/hr/acta-form";

export const metadata = { title: "Acta administrativa | JTP Logistics" };

/** Lo usa RH: pide poder editar colaboradores. */
export default async function CollaboratorActaPage() {
  const session = await requireCollaboratorPage();
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { canUpdateEmployees: true },
  });
  const allowed = session.user.role === "admin" || Boolean(me?.canUpdateEmployees);

  return (
    <ResourceListPage
      title="Acta administrativa"
      description="Captura los datos y descarga el acta en PDF con el formato de JTP. No se guarda en la plataforma."
    >
      {allowed ? (
        <Suspense>
          <ActaForm responsibleName={session.user.name} employeesEndpoint="/api/collaborator/employees" />
        </Suspense>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Para levantar actas necesitas el permiso de editar colaboradores.
        </p>
      )}
    </ResourceListPage>
  );
}
