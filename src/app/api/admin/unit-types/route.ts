import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";
import { unitTypeDefOrderBy } from "@/lib/prisma/unit-type-order";

function toJson(u: { id: string; name: string; value: string; sortOrder: number; createdAt: Date }) {
  return {
    id: u.id,
    name: u.name,
    value: u.value,
    sortOrder: u.sortOrder,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const types = await prisma.unitTypeDef.findMany({ orderBy: unitTypeDefOrderBy });
    return Response.json(types.map(toJson));
  } catch (e) {
    if (e instanceof Response) throw e;
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "tipo";
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const value = body.value ? String(body.value).trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") : slugify(name);
    if (!value) {
      return Response.json({ error: "No se pudo generar un identificador válido" }, { status: 400 });
    }

    const existing = await prisma.unitTypeDef.findUnique({ where: { value } });
    if (existing) {
      return Response.json({ error: `El valor "${value}" ya existe.` }, { status: 409 });
    }

    const agg = await prisma.unitTypeDef.aggregate({ _max: { sortOrder: true } });
    const nextOrder = (agg._max.sortOrder ?? -1) + 1;
    const created = await prisma.unitTypeDef.create({
      data: { name, value, sortOrder: nextOrder },
    });

    void logAudit({
      resource: "unit_type",
      resourceId: created.id,
      resourceLabel: name,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json(toJson(created), { status: 201 });
  } catch (e) {
    if (e instanceof Response) throw e;
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
