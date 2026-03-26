import { prisma } from "@/lib/db";
import { requireCarrierOrVendor } from "@/lib/auth-server";
import { createAuthUser } from "@/lib/create-auth-user";

export async function GET() {
  try {
    const session = await requireCarrierOrVendor();
    const collaborators = await prisma.user.findMany({
      where: {
        role: "collaborator",
        employeeProfile: {
          ownerUserId: session.user.id,
        },
      },
      orderBy: { createdAt: "desc" },
      include: { employeeProfile: true },
    });

    return Response.json(
      collaborators.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
        position: u.employeeProfile?.position ?? null,
        department: u.employeeProfile?.department ?? null,
        phone: u.employeeProfile?.phone ?? null,
        password: u.employeeProfile?.password ?? null,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCarrierOrVendor();
    const body = await request.json();
    const { name, email, password, birthDate, position, department, phone } = body as {
      name: string;
      email: string;
      password: string;
      birthDate?: string | null;
      position?: string;
      department?: string;
      phone?: string;
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
        role: "collaborator",
        ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
      },
    });

    await prisma.employeeProfile.create({
      data: {
        userId,
        ownerUserId: session.user.id,
        position: position?.trim() || null,
        department: department?.trim() || null,
        phone: phone?.trim() || null,
        password,
      },
    });

    return Response.json({ id: userId }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
