import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

function toJson(u: { id: string; name: string; value: string; createdAt: Date }) {
  return { id: u.id, name: u.name, value: u.value, createdAt: u.createdAt.toISOString() };
}

export async function GET() {
  try {
    await requireAdmin();
    const types = await prisma.unitTypeDef.findMany({ orderBy: { createdAt: "asc" } });
    return Response.json(types.map(toJson));
  } catch (e) {
    if (e instanceof Response) throw e;
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const value = String(body.value ?? "").trim().toLowerCase().replace(/\s+/g, "_");

    if (!name || !value) {
      return Response.json({ error: "Nombre y valor son requeridos" }, { status: 400 });
    }

    const existing = await prisma.unitTypeDef.findUnique({ where: { value } });
    if (existing) {
      return Response.json({ error: `El valor "${value}" ya existe.` }, { status: 409 });
    }

    const created = await prisma.unitTypeDef.create({ data: { name, value } });
    return Response.json(toJson(created), { status: 201 });
  } catch (e) {
    if (e instanceof Response) throw e;
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
