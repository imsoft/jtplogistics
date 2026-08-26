import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { decryptSecret } from "@/lib/secret-vault";
import { logAudit } from "@/lib/audit-log";

/**
 * Revela UNA credencial de activo bajo demanda.
 *
 * Los listados y los detalles ya no devuelven contraseñas: solo llegan aquí,
 * de una en una, cuando alguien pica el ojito. Cada revelación se registra en
 * la bitácora de auditoría.
 *
 * Los permisos son los mismos que para leer el módulo: quien puede ver las
 * laptops puede ver sus contraseñas. Dirección y soporte de TI pasan siempre.
 */

type CredentialType = "laptop" | "phone" | "email" | "employee";

const RESOURCES: Record<
  CredentialType,
  {
    permission: "canViewLaptops" | "canViewPhones" | "canViewEmails" | "canViewEmployees";
    auditResource: string;
    load: (id: string) => Promise<{ password: string | null; label: string } | null>;
  }
> = {
  laptop: {
    permission: "canViewLaptops",
    auditResource: "laptop",
    load: async (id) => {
      const row = await prisma.laptop.findUnique({
        where: { id },
        select: { password: true, name: true },
      });
      return row && { password: row.password, label: row.name };
    },
  },
  phone: {
    permission: "canViewPhones",
    auditResource: "phone",
    load: async (id) => {
      const row = await prisma.phone.findUnique({
        where: { id },
        select: { password: true, name: true },
      });
      return row && { password: row.password, label: row.name };
    },
  },
  email: {
    permission: "canViewEmails",
    auditResource: "email",
    load: async (id) => {
      const row = await prisma.emailAccount.findUnique({
        where: { id },
        select: { password: true, email: true },
      });
      return row && { password: row.password, label: row.email };
    },
  },
  employee: {
    permission: "canViewEmployees",
    auditResource: "employee",
    load: async (id) => {
      const row = await prisma.employeeProfile.findUnique({
        where: { userId: id },
        select: { password: true, user: { select: { name: true } } },
      });
      return row && { password: row.password, label: row.user.name };
    },
  },
};

function isCredentialType(value: string): value is CredentialType {
  return value in RESOURCES;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await requireSession();
    const role = session.user.role;
    if (role !== "admin" && role !== "developer" && role !== "collaborator") {
      return Response.json({ error: "Prohibido" }, { status: 403 });
    }
    const { type, id } = await params;

    if (!isCredentialType(type)) {
      return Response.json({ error: "Tipo inválido" }, { status: 400 });
    }
    const resource = RESOURCES[type];

    // Dirección y soporte pasan siempre; el colaborador necesita el permiso.
    if (role === "collaborator") {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { [resource.permission]: true },
      });
      if (!me || !(me as Record<string, unknown>)[resource.permission]) {
        return Response.json({ error: "Sin permiso" }, { status: 403 });
      }
    }

    const row = await resource.load(id);
    if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });

    const password = decryptSecret(row.password);
    if (row.password && password === null) {
      // Hay valor guardado pero no se pudo descifrar: llave equivocada o dato
      // alterado. Mejor decirlo que devolver un vacío silencioso.
      return Response.json(
        { error: "No se pudo descifrar la contraseña. Revisa la llave de cifrado." },
        { status: 500 }
      );
    }

    void logAudit({
      resource: resource.auditResource,
      resourceId: id,
      resourceLabel: row.label,
      action: "revealed",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ password });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[credentials]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
