import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth-server";
import { findCarrierCompany } from "@/lib/admin-carrier-target";
import { CarrierCompanyEditor } from "@/components/dashboard/users/carrier-company-editor";

/** JTP edita los datos de la empresa de un proveedor (el proveedor ya no puede). */
export default async function CarrierCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const carrier = await findCarrierCompany(id);
  if (!carrier) notFound();
  const backHref = `/admin/dashboard/users/${id}`;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label="Volver al perfil">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="page-heading truncate">{carrier.name}</h1>
          <p className="text-muted-foreground text-sm">Datos de la empresa, personas de contacto y notas de servicios.</p>
        </div>
      </div>
      <CarrierCompanyEditor carrierId={id} backHref={backHref} />
    </div>
  );
}
