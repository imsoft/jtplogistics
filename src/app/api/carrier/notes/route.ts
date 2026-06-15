import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

const DEFAULT_NOTES = "- Estadías\n- Reparto";

async function requireCarrier() {
  const session = await getSession();
  if (!session || session.user.role !== "carrier") {
    throw Response.json({ error: "Sin permiso" }, { status: 403 });
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireCarrier();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { carrierNotes: true },
    });
    return Response.json({ notes: user?.carrierNotes ?? DEFAULT_NOTES });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireCarrier();
    const { notes } = await request.json() as { notes: string };
    const prev = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { carrierNotes: true },
    });
    await prisma.user.update({
      where: { id: session.user.id },
      data: { carrierNotes: notes ?? null },
    });
    if ((prev?.carrierNotes ?? "") !== (notes ?? "")) {
      void logAudit({
        resource: "profile", resourceId: session.user.id, resourceLabel: session.user.name,
        action: "updated", userId: session.user.id, userName: session.user.name,
        changes: [{ field: "carrierNotes", label: "Notas de servicios", from: prev?.carrierNotes ?? null, to: notes || null }],
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
