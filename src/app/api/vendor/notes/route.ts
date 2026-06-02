import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth-server";

const DEFAULT_NOTES = "- Estadías\n- Reparto";

async function requireVendor() {
  const session = await getSession();
  if (!session || session.user.role !== "vendor") {
    throw Response.json({ error: "Sin permiso" }, { status: 403 });
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireVendor();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { vendorNotes: true },
    });
    return Response.json({ notes: user?.vendorNotes ?? DEFAULT_NOTES });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireVendor();
    const { notes } = await request.json() as { notes: string };
    await prisma.user.update({
      where: { id: session.user.id },
      data: { vendorNotes: notes ?? null },
    });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
