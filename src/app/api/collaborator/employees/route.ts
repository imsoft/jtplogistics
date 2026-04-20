import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { createAuthUser } from "@/lib/create-auth-user";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewEmployees: true },
    });

    if (!me?.canViewEmployees) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const employees = await prisma.user.findMany({
      where: { role: "collaborator" },
      orderBy: { createdAt: "desc" },
      include: { employeeProfile: true },
    });

    return Response.json(
      employees.map((u) => ({
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
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewEmployees: true },
    });

    if (!me?.canViewEmployees) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

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
      return Response.json(
        { error: e instanceof Error ? e.message : "No se pudo crear el usuario" },
        { status: 400 }
      );
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

    return Response.json({ id: userId }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
