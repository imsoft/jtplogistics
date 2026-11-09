import { redirect } from "next/navigation";

/**
 * La ficha del prospecto ahora se abre en el panel lateral de la tabla, igual
 * que en Prospección de proveedores. Los enlaces viejos (notificaciones,
 * auditoría) llegan aquí y se mandan a la tabla con esa ficha abierta.
 */
export default async function ClientLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/dashboard/client-leads?ficha=${id}`);
}
