import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { createAuthUser } from "@/lib/create-auth-user";

export function GET() {
  return adminHandler(async () => {
    const vendors = await prisma.user.findMany({
      where: { role: "vendedor" },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(
      vendors.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  });
}

export function POST(request: Request) {
  return adminHandler(async () => {
    const body = await request.json();
    const { name, email, password, birthDate } = body as {
      name: string;
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
        role: "vendedor",
        ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
      },
    });

    return Response.json({ id: userId }, { status: 201 });
  });
}
