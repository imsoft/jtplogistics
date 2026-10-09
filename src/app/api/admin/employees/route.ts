import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { createAuthUser } from "@/lib/create-auth-user";
import { logAudit } from "@/lib/audit-log";
import { employeeListWhere, serializeEmployeeRow } from "@/lib/employees";

export function GET(request: Request) {
  return adminHandler(async () => {
    const employees = await prisma.user.findMany({
      where: employeeListWhere(request),
      orderBy: { createdAt: "desc" },
      include: { employeeProfile: true },
    });
    return Response.json(employees.map(serializeEmployeeRow));
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json();
    const { name, email, password, birthDate, hireDate, position, department, phone, nss, rfc, curp, address } = body as {
      name: string;
      email: string;
      password: string;
      birthDate?: string | null;
      hireDate?: string | null;
      position?: string;
      department?: string;
      phone?: string;
      nss?: string;
      rfc?: string;
      curp?: string;
      address?: string;
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
        position: position?.trim() || null,
        department: department?.trim() || null,
        phone: phone?.trim() || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        password: null,
        nss: nss?.trim() || null,
        rfc: rfc?.trim() || null,
        curp: curp?.trim() || null,
        address: address?.trim() || null,
      },
    });

    void logAudit({
      resource: "employee",
      resourceId: userId,
      resourceLabel: name,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: userId }, { status: 201 });
  });
}
