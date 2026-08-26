import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-vault";
import { adminHandler } from "@/lib/api-handler";
import { logAudit, diffObjects } from "@/lib/audit-log";
import {
  PERMISSION_FIELDS,
  PERMISSION_LABELS,
  loadEmployeeDetail,
  serializeEmployeeDetail,
} from "@/lib/employees";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const u = await loadEmployeeDetail(id);
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json(serializeEmployeeDetail(u));
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
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

    const u = await prisma.user.findUnique({
      where: { id },
      include: { employeeProfile: true },
    });
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const parsedHireDate = hireDate !== undefined
      ? (hireDate ? new Date(hireDate) : null)
      : undefined;

    const before: Record<string, unknown> = {
      name: u.name,
      birthDate: u.birthDate,
      hireDate: u.employeeProfile?.hireDate,
      position: u.employeeProfile?.position,
      department: u.employeeProfile?.department,
      phone: u.employeeProfile?.phone,
      nss: u.employeeProfile?.nss,
      rfc: u.employeeProfile?.rfc,
      curp: u.employeeProfile?.curp,
      address: u.employeeProfile?.address,
    };
    for (const f of PERMISSION_FIELDS) before[f] = u[f as keyof typeof u];

    const parsedBirthDate = birthDate !== undefined
      ? (birthDate ? new Date(birthDate) : null)
      : undefined;

    // Build user update data (profile fields + permissions)
    const userUpdate: Record<string, unknown> = {};
    if (name) userUpdate.name = name;
    if (parsedBirthDate !== undefined) userUpdate.birthDate = parsedBirthDate;
    for (const f of PERMISSION_FIELDS) {
      if (typeof body[f] === "boolean") userUpdate[f] = body[f];
    }

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

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { employeeProfile: true },
    });

    const after: Record<string, unknown> = {
      name: updated!.name,
      birthDate: updated!.birthDate,
      hireDate: updated!.employeeProfile?.hireDate,
      position: updated!.employeeProfile?.position,
      department: updated!.employeeProfile?.department,
      phone: updated!.employeeProfile?.phone,
      nss: updated!.employeeProfile?.nss,
      rfc: updated!.employeeProfile?.rfc,
      curp: updated!.employeeProfile?.curp,
      address: updated!.employeeProfile?.address,
    };
    for (const f of PERMISSION_FIELDS) after[f] = updated![f as keyof typeof updated];

    const fieldLabels: Record<string, string> = {
      name: "Nombre",
      birthDate: "Fecha de nacimiento",
      hireDate: "Fecha de ingreso",
      position: "Puesto",
      department: "Departamento",
      phone: "Teléfono",
      nss: "NSS",
      rfc: "RFC",
      curp: "CURP",
      address: "Domicilio",
      ...PERMISSION_LABELS,
    };

    const permFormatter = (v: unknown) => (v ? "Activado" : "Desactivado");
    const formatters: Record<string, (v: unknown) => string | null> = {};
    for (const f of PERMISSION_FIELDS) formatters[f] = permFormatter;

    const changes = diffObjects(before, after, fieldLabels, formatters);

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
