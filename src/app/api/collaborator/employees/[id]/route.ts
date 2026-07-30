import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-vault";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { logAudit, diffObjects } from "@/lib/audit-log";

const EMPLOYEE_LABELS: Record<string, string> = {
  name: "Nombre", birthDate: "Fecha de nacimiento", hireDate: "Fecha de ingreso",
  position: "Puesto", department: "Departamento", phone: "Teléfono",
  nss: "NSS", rfc: "RFC", curp: "CURP", address: "Domicilio",
};

type EmployeeAction = "read" | "update" | "delete";

async function requirePermission(userId: string, action: EmployeeAction) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      canViewEmployees: true,
      canUpdateEmployees: true,
      canDeleteEmployees: true,
    },
  });
  const allowed =
    action === "read"
      ? Boolean(me?.canViewEmployees)
      : action === "update"
        ? Boolean(me?.canUpdateEmployees)
        : Boolean(me?.canDeleteEmployees);
  if (!allowed) {
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
    await requirePermission(session.user.id, "read");

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
      nss: u.employeeProfile?.nss ?? null,
      rfc: u.employeeProfile?.rfc ?? null,
      curp: u.employeeProfile?.curp ?? null,
      address: u.employeeProfile?.address ?? null,
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
      canViewShipments: u.canViewShipments,
      canViewFinances: u.canViewFinances,
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
    if (e instanceof Response) return e;
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
    await requirePermission(session.user.id, "update");

    const { id } = await params;
    const body = await request.json();
    const { name, position, department, phone, password, birthDate, hireDate, nss, rfc, curp, address } = body as {
      name?: string;
      position?: string;
      department?: string;
      phone?: string;
      password?: string;
      birthDate?: string | null;
      hireDate?: string | null;
      nss?: string;
      rfc?: string;
      curp?: string;
      address?: string;
    };

    const u = await prisma.user.findUnique({ where: { id }, include: { employeeProfile: true } });
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const ep = u.employeeProfile;
    const before = {
      name: u.name,
      birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
      hireDate: ep?.hireDate ? ep.hireDate.toISOString().split("T")[0] : null,
      position: ep?.position ?? null, department: ep?.department ?? null, phone: ep?.phone ?? null,
      nss: ep?.nss ?? null, rfc: ep?.rfc ?? null, curp: ep?.curp ?? null, address: ep?.address ?? null,
    };

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
        ...(password !== undefined && { password: encryptSecret(password) }),
        ...(nss !== undefined && { nss: nss.trim() || null }),
        ...(rfc !== undefined && { rfc: rfc.trim() || null }),
        ...(curp !== undefined && { curp: curp.trim() || null }),
        ...(address !== undefined && { address: address.trim() || null }),
      },
      create: {
        userId: id,
        position: position?.trim() || null,
        department: department?.trim() || null,
        phone: phone?.trim() || null,
        hireDate: parsedHireDate ?? null,
        password: encryptSecret(password),
        nss: nss?.trim() || null,
        rfc: rfc?.trim() || null,
        curp: curp?.trim() || null,
        address: address?.trim() || null,
      },
    });

    const after = {
      name: name ?? u.name,
      birthDate: parsedBirthDate !== undefined ? (birthDate ?? null) : before.birthDate,
      hireDate: parsedHireDate !== undefined ? (hireDate ?? null) : before.hireDate,
      position: position !== undefined ? (position.trim() || null) : before.position,
      department: department !== undefined ? (department.trim() || null) : before.department,
      phone: phone !== undefined ? (phone.trim() || null) : before.phone,
      nss: nss !== undefined ? (nss.trim() || null) : before.nss,
      rfc: rfc !== undefined ? (rfc.trim() || null) : before.rfc,
      curp: curp !== undefined ? (curp.trim() || null) : before.curp,
      address: address !== undefined ? (address.trim() || null) : before.address,
    };
    const changes = diffObjects(before, after, EMPLOYEE_LABELS);
    if (password !== undefined && password) {
      changes.push({ field: "password", label: "Contraseña", from: null, to: "Actualizada" });
    }
    if (changes.length > 0) {
      void logAudit({
        resource: "employee", resourceId: id, resourceLabel: (name ?? u.name) ?? "",
        action: "updated", userId: session.user.id, userName: session.user.name, changes,
      });
    }

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
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
    await requirePermission(session.user.id, "delete");

    const { id } = await params;
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });
    void logAudit({
      resource: "employee", resourceId: id, resourceLabel: u.name ?? "",
      action: "deleted", userId: session.user.id, userName: session.user.name,
    });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
