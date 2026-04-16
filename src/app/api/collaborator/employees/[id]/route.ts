import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

async function requirePermission(userId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { canViewEmployees: true },
  });
  if (!me?.canViewEmployees) {
    throw new Response(JSON.stringify({ error: "Sin permiso" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    await requirePermission(session.user.id);

    const { id } = await params;
    const u = await prisma.user.findUnique({
      where: { id },
      include: {
        employeeProfile: true,
        assignedLaptops: {
          include: { emailAccount: { select: { id: true, email: true } } },
        },
        assignedPhones: {
          include: { emailAccount: { select: { id: true, email: true } } },
        },
        assignedEmails: {
          include: { emailAccount: { select: { id: true, type: true, email: true } } },
        },
      },
    });

    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    return Response.json({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
      hireDate: u.employeeProfile?.hireDate
        ? u.employeeProfile.hireDate.toISOString().split("T")[0]
        : null,
      position: u.employeeProfile?.position ?? null,
      department: u.employeeProfile?.department ?? null,
      phone: u.employeeProfile?.phone ?? null,
      hasPasswordReference: Boolean(u.employeeProfile?.password?.trim()),
      canViewMessages: u.canViewMessages,
      canViewIdeas: u.canViewIdeas,
      canViewRoutes: u.canViewRoutes,
      canViewRouteLogs: u.canViewRouteLogs,
      canViewUnitTypes: u.canViewUnitTypes,
      canViewQuotes: u.canViewQuotes,
      canViewProviders: u.canViewProviders,
      canViewClients: u.canViewClients,
      canViewEmployees: u.canViewEmployees,
      canViewVendors: u.canViewVendors,
      canViewLaptops: u.canViewLaptops,
      canViewPhones: u.canViewPhones,
      canViewEmails: u.canViewEmails,
      canViewTasks: u.canViewTasks,
      createdAt: u.createdAt.toISOString(),
      laptops: u.assignedLaptops.map((l) => ({
        id: l.id,
        name: l.name,
        serialNumber: l.serialNumber,
        emailAccount: l.emailAccount
          ? { id: l.emailAccount.id, email: l.emailAccount.email }
          : null,
      })),
      phones: u.assignedPhones.map((p) => ({
        id: p.id,
        name: p.name,
        phoneNumber: p.phoneNumber,
        emailAccount: p.emailAccount
          ? { id: p.emailAccount.id, email: p.emailAccount.email }
          : null,
      })),
      emailAccounts: u.assignedEmails.map((ea) => ({
        id: ea.emailAccount.id,
        type: ea.emailAccount.type,
        email: ea.emailAccount.email,
      })),
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
    const session = await requireCollaboratorOrAdmin();
    await requirePermission(session.user.id);

    const { id } = await params;
    const body = await request.json();
    const { name, position, department, phone, password, birthDate, hireDate } = body as {
      name?: string;
      position?: string;
      department?: string;
      phone?: string;
      password?: string;
      birthDate?: string | null;
      hireDate?: string | null;
    };

    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const parsedBirthDate =
      birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined;
    const parsedHireDate =
      hireDate !== undefined ? (hireDate ? new Date(hireDate) : null) : undefined;

    const userUpdate: Record<string, unknown> = {};
    if (name) userUpdate.name = name;
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
        ...(parsedHireDate !== undefined && { hireDate: parsedHireDate }),
        ...(password !== undefined && { password: password || null }),
      },
      create: {
        userId: id,
        position: position?.trim() || null,
        department: department?.trim() || null,
        phone: phone?.trim() || null,
        hireDate: parsedHireDate ?? null,
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
    const session = await requireCollaboratorOrAdmin();
    await requirePermission(session.user.id);

    const { id } = await params;
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "collaborator") {
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
