import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { normalizeDisplayName } from "@/lib/normalize";
import { logAudit } from "@/lib/audit-log";
import { validateCarrierProfilePayload } from "@/lib/validators/registration-abuse";
import { companyAlreadySet, loadCompany, readCompanyBody, saveCompany } from "@/lib/carrier-company-server";

export async function GET() {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        birthDate: true,
        role: true,
        parentCarrierId: true,
        profile: {
          select: {
            commercialName: true,
            legalName: true,
            rfc: true,
            address: true,
            contacts: {
              select: { id: true, type: true, value: true, label: true, position: true, personName: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        employeeProfile: {
          select: { position: true, department: true },
        },
      },
    });

    if (!user) {
      return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Un usuario agregado por un proveedor no tiene empresa propia: ve la de su
    // principal. Sus datos personales (nombre, fecha) sí son suyos.
    const company = user.parentCarrierId
      ? await prisma.profile.findUnique({
          where: { userId: user.parentCarrierId },
          select: {
            commercialName: true,
            legalName: true,
            rfc: true,
            address: true,
            contacts: {
              select: { id: true, type: true, value: true, label: true, position: true, personName: true },
              orderBy: { createdAt: "asc" },
            },
          },
        })
      : user.profile;

    return Response.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
      role: user.role,
      commercialName: company?.commercialName ?? "",
      legalName: company?.legalName ?? "",
      rfc: company?.rfc ?? "",
      address: company?.address ?? "",
      contacts: company?.contacts ?? [],
      isCarrierMember: Boolean(user.parentCarrierId),
      // La pantalla bloquea la sección de empresa cuando esto es falso: el
      // proveedor la captura al registrarse; después la administra JTP.
      companyEditable:
        user.role === "carrier" ? !user.parentCarrierId && !(company?.legalName?.trim() || company?.rfc?.trim()) : true,
      position: user.employeeProfile?.position ?? null,
      department: user.employeeProfile?.department ?? null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    const body = (await request.json()) as Record<string, unknown>;

    // Lo personal se guarda en quien está dentro; lo de la empresa, en el
    // principal. Los datos de la empresa los captura el proveedor una sola vez
    // (al registrarse); después solo los cambia JTP. Si no puede tocarlos, esa
    // parte se ignora en vez de rechazar el guardado: su nombre sí lo cambia.
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, parentCarrierId: true },
    });
    const companyOwnerId = me?.parentCarrierId ?? userId;
    const canTouchCompany =
      me?.role === "carrier" ? !me.parentCarrierId && !(await companyAlreadySet(companyOwnerId)) : true;

    const name = body.name != null ? normalizeDisplayName(String(body.name)) : undefined;
    const birthDate = body.birthDate != null
      ? (body.birthDate ? new Date(String(body.birthDate)) : null)
      : undefined;
    if (birthDate && Number.isNaN(birthDate.getTime())) {
      return Response.json({ error: "La fecha de nacimiento no es válida." }, { status: 400 });
    }
    const company = readCompanyBody(body);
    if (!company.ok) return Response.json({ error: company.error }, { status: 400 });
    const abuse = validateCarrierProfilePayload({ name });
    if (!abuse.ok) return Response.json({ error: abuse.message }, { status: 400 });

    if (name !== undefined || birthDate !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined && { name }),
          ...(birthDate !== undefined && { birthDate }),
        },
      });
    }

    const saved = canTouchCompany ? await saveCompany(companyOwnerId, company.data) : await loadCompany(companyOwnerId);

    void logAudit({
      resource: "profile", resourceId: userId, resourceLabel: (name ?? session.user.name) as string,
      action: "updated", userId, userName: (name ?? session.user.name) as string,
    });

    return Response.json({ name: name ?? session.user.name, ...saved });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
