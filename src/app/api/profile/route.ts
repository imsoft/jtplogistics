import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { normalizeDisplayName } from "@/lib/normalize";

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
        profile: {
          select: {
            commercialName: true,
            legalName: true,
            rfc: true,
            address: true,
            contacts: {
              select: { id: true, type: true, value: true, label: true },
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
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
      role: user.role,
      commercialName: user.profile?.commercialName ?? "",
      legalName: user.profile?.legalName ?? "",
      rfc: user.profile?.rfc ?? "",
      address: user.profile?.address ?? "",
      contacts: user.profile?.contacts ?? [],
      position: user.employeeProfile?.position ?? null,
      department: user.employeeProfile?.department ?? null,
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    const body = await request.json();

    const name = body.name != null ? normalizeDisplayName(String(body.name)) : undefined;
    const birthDate = body.birthDate != null
      ? (body.birthDate ? new Date(String(body.birthDate)) : null)
      : undefined;
    const commercialName = body.commercialName != null ? String(body.commercialName).trim() || null : undefined;
    const legalName = body.legalName != null ? String(body.legalName).trim() || null : undefined;
    const rfc = body.rfc != null ? String(body.rfc).trim().toUpperCase() || null : undefined;
    const address = body.address != null ? String(body.address).trim() || null : undefined;
    const contacts: { type: "phone" | "email"; value: string; label?: string }[] =
      Array.isArray(body.contacts) ? body.contacts : [];

    if (name !== undefined || birthDate !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined && { name }),
          ...(birthDate !== undefined && { birthDate }),
        },
      });
    }

    // Upsert profile
    const profile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
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
          })),
      });
    }

    const updatedContacts = await prisma.contact.findMany({
      where: { profileId: profile.id },
      select: { id: true, type: true, value: true, label: true },
      orderBy: { createdAt: "asc" },
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
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
