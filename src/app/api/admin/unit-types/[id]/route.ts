import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const name = body.name ? String(body.name).trim() : undefined;

    if (!name) return Response.json({ error: "El nombre es requerido" }, { status: 400 });

    const updated = await prisma.unitTypeDef.update({
      where: { id },
      data: { name },
    });
    return Response.json({ id: updated.id, name: updated.name, value: updated.value, createdAt: updated.createdAt.toISOString() });
  } catch (e) {
    if (e instanceof Response) throw e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const inUse = await prisma.route.findFirst({
      where: { unitType: (await prisma.unitTypeDef.findUnique({ where: { id } }))?.value ?? "" },
    });
    if (inUse) {
      return Response.json({ error: "No se puede eliminar: hay rutas usando este tipo de unidad." }, { status: 409 });
    }

    await prisma.unitTypeDef.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) throw e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
