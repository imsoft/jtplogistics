import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { createAuthUser } from "@/lib/create-auth-user";
import { logAudit } from "@/lib/audit-log";

const DEFAULT_VENDOR_NOTES = "- Estadías\n- Reparto";

const VENDOR_SEARCH_FIELDS = ["name", "position", "email"] as const;
const VENDOR_SORTABLE_FIELDS = new Set(["name", "position", "email", "createdAt"]);

export function GET(request: Request) {
  return adminHandler(async (_session) => {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
    const q = (searchParams.get("q") ?? "").trim();
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Prisma.UserWhereInput = { role: "vendor" };
    if (q) {
      where.OR = VENDOR_SEARCH_FIELDS.map((field) => ({
        [field]: { contains: q, mode: "insensitive" as Prisma.QueryMode },
      })) as Prisma.UserWhereInput[];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = VENDOR_SORTABLE_FIELDS.has(sortBy)
      ? ({ [sortBy]: sortDir } as Prisma.UserOrderByWithRelationInput)
      : { createdAt: "desc" };

    const [total, vendors] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        ...(all ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
      }),
    ]);

    return Response.json({
      data: vendors.map((u) => ({
        id: u.id,
        name: u.name,
        position: u.position,
        email: u.email,
        image: u.image,
        birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json();
    const { name, position, email, password, birthDate } = body as {
      name: string;
      position?: string;
      email: string;
      password: string;
      birthDate?: string | null;
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
        role: "vendor",
        position: position?.trim() || null,
        vendorNotes: DEFAULT_VENDOR_NOTES,
        ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
      },
    });

    void logAudit({
      resource: "vendor",
      resourceId: userId,
      resourceLabel: name,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: userId }, { status: 201 });
  });
}
