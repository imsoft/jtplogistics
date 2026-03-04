import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import type { UserRole } from "@/types/user.types";

function userToJson(u: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    commercialName: string | null;
    legalName: string | null;
    rfc: string | null;
    address: string | null;
    contacts: { id: string; type: string; value: string; label: string | null }[];
  } | null;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    image: u.image,
    role: u.role as UserRole,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    profile: u.profile
      ? {
          commercialName: u.profile.commercialName,
          legalName: u.profile.legalName,
          rfc: u.profile.rfc,
          address: u.profile.address,
          contacts: u.profile.contacts,
        }
      : null,
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        profile: {
          include: { contacts: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    return Response.json(users.map(userToJson));
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
