import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

function toJson(c: {
  id: string;
  name: string;
  legalName: string | null;
  rfc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    legalName: c.legalName,
    rfc: c.rfc,
    email: c.email,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}

export function GET() {
  return adminHandler(async () => {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(clients.map(toJson));
  });
}

export function POST(request: Request) {
  return adminHandler(async () => {
    const body = await request.json();
    const { name, legalName, rfc, email, phone, address, notes } = body as {
      name: string;
      legalName?: string;
      rfc?: string;
      email?: string;
      phone?: string;
      address?: string;
      notes?: string;
    };

    if (!name || !String(name).trim()) {
      return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name: String(name).trim(),
        legalName: legalName?.trim() || null,
        rfc: rfc?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return Response.json({ id: client.id }, { status: 201 });
  });
}
