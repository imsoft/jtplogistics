import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { createAuthUser } from "@/lib/create-auth-user";
import { logAudit } from "@/lib/audit-log";

export function GET() {
  return adminHandler(async (_session) => {
    const vendors = await prisma.user.findMany({
      where: { role: "vendor" },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(
      vendors.map((u) => ({
        id: u.id,
        name: u.name,
        position: u.position,
        email: u.email,
        image: u.image,
        birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json();
    const { name, position, email, password, birthDate } = body as {
      name: string;
      position?: string;
      email: string;
      password: string;
      birthDate?: string | null;
    };

    if (!name || !email || !password) {
      return Response.json({ error: "name, email y password son requeridos" }, { status: 400 });
    }

    let userId: string;
    try {
      const created = await createAuthUser({ name, email, password });
      userId = created.id;
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "No se pudo crear el usuario" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: "vendor",
        position: position?.trim() || null,
        ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
      },
    });

    void logAudit({
      resource: "vendor",
      resourceId: userId,
      resourceLabel: name,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: userId }, { status: 201 });
  });
}
