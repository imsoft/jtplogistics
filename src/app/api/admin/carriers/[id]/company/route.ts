import { adminOrDeveloperHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";
import { findCarrierCompany } from "@/lib/admin-carrier-target";
import { loadCarrierNotes, loadCompany, readCompanyBody, saveCarrierNotes, saveCompany } from "@/lib/carrier-company-server";

/**
 * Datos de la empresa de un proveedor (razón social, RFC, domicilio, contactos
 * y notas de servicios). Los cambia JTP: el proveedor solo los captura al
 * registrarse.
 */
export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminOrDeveloperHandler(async () => {
    const { id } = await params;
    const carrier = await findCarrierCompany(id);
    if (!carrier) return Response.json({ error: "Proveedor no encontrado." }, { status: 404 });
    return Response.json({ name: carrier.name, ...(await loadCompany(id)), notes: await loadCarrierNotes(id) });
  });
}

export function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminOrDeveloperHandler(async (session) => {
    const { id } = await params;
    const carrier = await findCarrierCompany(id);
    if (!carrier) return Response.json({ error: "Proveedor no encontrado." }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const company = readCompanyBody(body);
    if (!company.ok) return Response.json({ error: company.error }, { status: 400 });

    const saved = await saveCompany(id, company.data);
    let notes = await loadCarrierNotes(id);
    if (typeof body.notes === "string") {
      notes = body.notes.slice(0, 5000);
      await saveCarrierNotes(id, notes.trim() ? notes : null);
    }
    void logAudit({
      resource: "profile",
      resourceId: id,
      resourceLabel: saved.commercialName || saved.legalName || carrier.name,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });
    return Response.json({ name: carrier.name, ...saved, notes });
  });
}
