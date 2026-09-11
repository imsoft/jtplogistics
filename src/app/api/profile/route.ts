import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { normalizeDisplayName } from "@/lib/normalize";
import { logAudit } from "@/lib/audit-log";
import { validateCarrierProfilePayload } from "@/lib/validators/registration-abuse";

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
        memberCanEditCompany: true,
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
      // La pantalla bloquea la sección de empresa cuando esto es falso.
      companyEditable: !user.parentCarrierId || user.memberCanEditCompany,
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
    const body = await request.json();

    // Lo personal se guarda en quien está dentro; lo de la empresa, en el
    // principal. Si un usuario agregado no tiene permiso sobre la empresa, esa
    // parte se ignora en vez de rechazar el guardado entero: su nombre sí
    // puede cambiarlo.
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentCarrierId: true, memberCanEditCompany: true },
    });
    const companyOwnerId = me?.parentCarrierId ?? userId;
    const canTouchCompany = !me?.parentCarrierId || me.memberCanEditCompany;

    const name = body.name != null ? normalizeDisplayName(String(body.name)) : undefined;
    const birthDate = body.birthDate != null
      ? (body.birthDate ? new Date(String(body.birthDate)) : null)
      : undefined;
    const commercialName = body.commercialName != null ? String(body.commercialName).trim() || null : undefined;
    const legalName = body.legalName != null ? String(body.legalName).trim() || null : undefined;
    const rfc = body.rfc != null ? String(body.rfc).trim().toUpperCase() || null : undefined;
    const address = body.address != null ? String(body.address).trim() || null : undefined;
    const contacts: { type: "phone" | "email"; value: string; label?: string; position?: string; personName?: string }[] =
      Array.isArray(body.contacts) ? body.contacts : [];

    const abuse = validateCarrierProfilePayload({
      name,
      commercialName,
      legalName,
      contacts,
    });
    if (!abuse.ok) {
      return Response.json({ error: abuse.message }, { status: 400 });
    }

    if (name !== undefined || birthDate !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined && { name }),
          ...(birthDate !== undefined && { birthDate }),
        },
      });
    }

    if (!canTouchCompany) {
      const current = await prisma.profile.findUnique({
        where: { userId: companyOwnerId },
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
      });
      void logAudit({
        resource: "profile", resourceId: userId, resourceLabel: (name ?? session.user.name) as string,
        action: "updated", userId, userName: (name ?? session.user.name) as string,
      });
      return Response.json({
        name: name ?? session.user.name,
        commercialName: current?.commercialName ?? "",
        legalName: current?.legalName ?? "",
        rfc: current?.rfc ?? "",
        address: current?.address ?? "",
        contacts: current?.contacts ?? [],
      });
    }

    // Upsert profile
    const profile = await prisma.profile.upsert({
      where: { userId: companyOwnerId },
      create: {
        userId: companyOwnerId,
        commercialName: commercialName ?? undefined,
        legalName: legalName ?? undefined,
        rfc: rfc ?? undefined,
        address: address ?? undefined,
      },
      update: {
        ...(commercialName !== undefined && { commercialName }),
        ...(legalName !== undefined && { legalName }),
        ...(rfc !== undefined && { rfc }),
        ...(address !== undefined && { address }),
      },
    });

    // Replace contacts: delete all then recreate
    await prisma.contact.deleteMany({ where: { profileId: profile.id } });
    if (contacts.length > 0) {
      await prisma.contact.createMany({
        data: contacts
          .filter((c) => c.value.trim())
          .map((c) => ({
            profileId: profile.id,
            type: c.type,
            value: c.value.trim(),
            label: c.label?.trim() || null,
            position: c.position?.trim() || null,
            personName: c.personName?.trim() || null,
          })),
      });
    }

    const updatedContacts = await prisma.contact.findMany({
      where: { profileId: profile.id },
      select: { id: true, type: true, value: true, label: true, position: true, personName: true },
      orderBy: { createdAt: "asc" },
    });

    void logAudit({
      resource: "profile", resourceId: userId, resourceLabel: (name ?? session.user.name) as string,
      action: "updated", userId, userName: (name ?? session.user.name) as string,
    });

    return Response.json({
      name: name ?? session.user.name,
      commercialName: profile.commercialName ?? "",
      legalName: profile.legalName ?? "",
      rfc: profile.rfc ?? "",
      address: profile.address ?? "",
      contacts: updatedContacts,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
