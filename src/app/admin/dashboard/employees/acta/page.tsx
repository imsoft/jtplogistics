import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth-server";
import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { ActaPageContent } from "@/components/dashboard/hr/acta-page-content";

export const metadata = { title: "Acta administrativa | JTP Logistics" };

export default async function AdminActaPage() {
  const session = await requireAdminPage();
  return (
    <ResourceListPage
      title="Acta administrativa"
      description="Captura los datos y descarga el acta en PDF con el formato de JTP. Queda registrada en la plataforma."
    >
      <Suspense>
        <ActaPageContent responsibleName={session.user.name} employeesEndpoint="/api/admin/employees" />
      </Suspense>
    </ResourceListPage>
  );
}
