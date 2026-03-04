import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { adminHandler } from "@/lib/api-handler";

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

    const res = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });

    if (!res?.user?.id) {
      return Response.json({ error: "No se pudo crear el usuario" }, { status: 500 });
    }

    await prisma.user.update({
      where: { id: res.user.id },
      data: {
        role: "vendedor",
        ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
      },
    });

    return Response.json({ id: res.user.id }, { status: 201 });
  });
}
