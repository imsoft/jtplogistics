import { prisma } from "@/lib/db";
import { requireCarrierOrVendor } from "@/lib/auth-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCarrierOrVendor();
    const { id } = await params;
    const user = await prisma.user.findFirst({
      where: {
        id,
        role: "collaborator",
        employeeProfile: { ownerUserId: session.user.id },
      },
      include: { employeeProfile: true },
    });

    if (!user) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    return Response.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
      position: user.employeeProfile?.position ?? null,
      department: user.employeeProfile?.department ?? null,
      phone: user.employeeProfile?.phone ?? null,
      hasPasswordReference: Boolean(user.employeeProfile?.password?.trim()),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCarrierOrVendor();
    const { id } = await params;
    const body = await request.json();
    const { name, position, department, phone, password, birthDate } = body as {
      name?: string;
      position?: string;
      department?: string;
      phone?: string;
      password?: string;
      birthDate?: string | null;
    };

    const user = await prisma.user.findFirst({
      where: {
        id,
        role: "collaborator",
        employeeProfile: { ownerUserId: session.user.id },
      },
      include: { employeeProfile: true },
    });

    if (!user) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const parsedBirthDate =
      birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined;

    const userUpdate: Record<string, unknown> = {};
    if (name !== undefined && name.trim()) userUpdate.name = name.trim();
    if (parsedBirthDate !== undefined) userUpdate.birthDate = parsedBirthDate;

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({ where: { id }, data: userUpdate });
    }

    await prisma.employeeProfile.upsert({
      where: { userId: id },
      update: {
        position: position?.trim() ?? undefined,
        department: department?.trim() ?? undefined,
        phone: phone?.trim() ?? undefined,
        ...(password !== undefined && { password: password || null }),
      },
      create: {
        userId: id,
        ownerUserId: session.user.id,
        position: position?.trim() || null,
        department: department?.trim() || null,
        phone: phone?.trim() || null,
        password: password || null,
      },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCarrierOrVendor();
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: {
        id,
        role: "collaborator",
        employeeProfile: { ownerUserId: session.user.id },
      },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
