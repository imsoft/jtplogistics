import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

const PERMISSION_MODULES = [
  { suffix: "Messages", label: "Mensajes" },
  { suffix: "Ideas", label: "Ideas" },
  { suffix: "Routes", label: "Rutas" },
  { suffix: "RouteLogs", label: "Historial de cambios" },
  { suffix: "UnitTypes", label: "Tipos de unidades" },
  { suffix: "Quotes", label: "Cotizador" },
  { suffix: "Providers", label: "Proveedores" },
  { suffix: "Clients", label: "Clientes" },
  { suffix: "Employees", label: "Colaboradores" },
  { suffix: "Vendors", label: "Vendedores" },
  { suffix: "Laptops", label: "Laptops" },
  { suffix: "Phones", label: "Celulares" },
  { suffix: "Emails", label: "Correos" },
  { suffix: "Tasks", label: "Tareas" },
  { suffix: "Shipments", label: "Embarques" },
  { suffix: "Finances", label: "Finanzas" },
] as const;

const ALLOWED_FIELDS = PERMISSION_MODULES.flatMap((module) => [
  `canView${module.suffix}`,
  `canCreate${module.suffix}`,
  `canUpdate${module.suffix}`,
  `canDelete${module.suffix}`,
]);

const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_MODULES.flatMap((module) => [
    [`canView${module.suffix}`, `${module.label}: leer`],
    [`canCreate${module.suffix}`, `${module.label}: crear`],
    [`canUpdate${module.suffix}`, `${module.label}: editar`],
    [`canDelete${module.suffix}`, `${module.label}: eliminar`],
  ])
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body: Record<string, boolean> = await request.json();

    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const data: Record<string, boolean> = {};
    const changes: { field: string; label: string; from: string; to: string }[] = [];

    for (const field of ALLOWED_FIELDS) {
      if (field in body && typeof body[field] === "boolean") {
        data[field] = body[field];
        const prev = u[field as keyof typeof u];
        if (prev !== body[field]) {
          changes.push({
            field,
            label: FIELD_LABELS[field],
            from: prev ? "Activado" : "Desactivado",
            to: body[field] ? "Activado" : "Desactivado",
          });
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "Sin campos válidos" }, { status: 400 });
    }

    await prisma.user.update({ where: { id }, data });

    if (changes.length > 0) {
      void logAudit({
        resource: "employee_permissions",
        resourceId: id,
        resourceLabel: u.name,
        action: "updated",
        userId: session.user.id,
        userName: session.user.name,
        changes,
      });
    }

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
