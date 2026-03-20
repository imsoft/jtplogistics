import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit, diffObjects } from "@/lib/audit-log";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
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
      position: u.employeeProfile?.position ?? null,
      department: u.employeeProfile?.department ?? null,
      phone: u.employeeProfile?.phone ?? null,
      password: u.employeeProfile?.password ?? null,
      createdAt: u.createdAt.toISOString(),
      laptops: u.assignedLaptops.map((l) => ({
        id: l.id,
        name: l.name,
        serialNumber: l.serialNumber,
        emailAccount: l.emailAccount ? { id: l.emailAccount.id, email: l.emailAccount.email } : null,
      })),
      phones: u.assignedPhones.map((p) => ({
        id: p.id,
        name: p.name,
        phoneNumber: p.phoneNumber,
        emailAccount: p.emailAccount ? { id: p.emailAccount.id, email: p.emailAccount.email } : null,
      })),
      emailAccounts: u.assignedEmails.map((ea) => ({
        id: ea.emailAccount.id,
        type: ea.emailAccount.type,
        email: ea.emailAccount.email,
      })),
    });
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
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

    const u = await prisma.user.findUnique({
      where: { id },
      include: { employeeProfile: true },
    });
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const before = {
      name: u.name,
      birthDate: u.birthDate,
      position: u.employeeProfile?.position,
      department: u.employeeProfile?.department,
      phone: u.employeeProfile?.phone,
    };

    const parsedBirthDate = birthDate !== undefined
      ? (birthDate ? new Date(birthDate) : null)
      : undefined;

    if (name || parsedBirthDate !== undefined) {
      await prisma.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(parsedBirthDate !== undefined && { birthDate: parsedBirthDate }),
        },
      });
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
        position: position?.trim() || null,
        department: department?.trim() || null,
        phone: phone?.trim() || null,
        password: password || null,
      },
    });

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { employeeProfile: true },
    });

    const after = {
      name: updated!.name,
      birthDate: updated!.birthDate,
      position: updated!.employeeProfile?.position,
      department: updated!.employeeProfile?.department,
      phone: updated!.employeeProfile?.phone,
    };

    const fieldLabels = {
      name: "Nombre",
      birthDate: "Fecha de nacimiento",
      position: "Puesto",
      department: "Departamento",
      phone: "Teléfono",
    };

    const changes = diffObjects(
      before as Record<string, unknown>,
      after as Record<string, unknown>,
      fieldLabels,
    );

    if (changes.length > 0) {
      void logAudit({
        resource: "employee",
        resourceId: id,
        resourceLabel: updated!.name ?? u.name ?? "",
        action: "updated",
        userId: session.user.id,
        userName: session.user.name,
        changes,
      });
    }

    return Response.json({ ok: true });
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    await prisma.user.delete({ where: { id } });

    void logAudit({
      resource: "employee",
      resourceId: id,
      resourceLabel: u.name ?? "",
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}
