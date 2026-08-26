import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { notifyRole } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { brandedEmail, escapeHtml, appUrl } from "@/lib/email-layout";
import { IT_SUPPORT, EQUIPMENT_KIND_LABELS } from "@/lib/support";
import type { EquipmentKind } from "@prisma/client";

/** Quién puede reportar: el personal de JTP. Los transportistas son externos. */
const STAFF = ["admin", "collaborator", "vendor", "developer"];

const INCLUDE = {
  reporter: { select: { id: true, name: true, email: true } },
  laptop: { select: { id: true, name: true, equipmentCode: true } },
  phone: { select: { id: true, name: true, equipmentCode: true } },
};

/** GET: los reportes que hizo quien pregunta. */
export async function GET() {
  try {
    const session = await requireSession();
    const tickets = await prisma.supportTicket.findMany({
      where: { reporterId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: INCLUDE,
    });
    return Response.json(tickets);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[support/tickets] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/** POST: levantar un reporte. Avisa a soporte por dashboard y por correo. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!STAFF.includes(session.user.role)) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      equipmentKind?: string | null;
      equipmentId?: string | null;
    };

    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    if (!title) return Response.json({ error: "Escribe de qué se trata." }, { status: 400 });
    if (!description) return Response.json({ error: "Cuenta qué está pasando." }, { status: 400 });

    const kind = body.equipmentKind === "laptop" || body.equipmentKind === "phone"
      ? (body.equipmentKind as EquipmentKind)
      : null;

    const ticket = await prisma.supportTicket.create({
      data: {
        title,
        description,
        equipmentKind: kind,
        laptopId: kind === "laptop" ? body.equipmentId || null : null,
        phoneId: kind === "phone" ? body.equipmentId || null : null,
        reporterId: session.user.id,
      },
      include: INCLUDE,
    });

    const equipo = ticket.laptop?.name ?? ticket.phone?.name ?? null;

    void notifyRole("developer", {
      type: "support_ticket",
      title: `Reporte de equipo: ${title.slice(0, 60)}`,
      body: `${session.user.name}${equipo ? ` · ${equipo}` : ""}`,
      href: "/developer/dashboard/tickets",
    });

    // El correo va a soporte, no al reportante: es quien tiene que actuar.
    const base = appUrl();
    void sendEmail({
      to: IT_SUPPORT.email,
      subject: `Soporte JTP · ${title}`,
      html: brandedEmail({
        preheader: `Reporte de ${session.user.name}`,
        eyebrow: "Soporte de TI",
        heading: title,
        paragraphs: [
          `<strong>${escapeHtml(session.user.name)}</strong> levantó un reporte de equipo.`,
          ...(kind ? [`<strong>Equipo:</strong> ${EQUIPMENT_KIND_LABELS[kind]}${equipo ? ` — ${escapeHtml(equipo)}` : ""}`] : []),
          escapeHtml(description),
        ],
        ctaLabel: "Ver el reporte",
        ctaHref: base ? `${base}/developer/dashboard/tickets` : undefined,
      }),
      text: [
        `${session.user.name} levantó un reporte de equipo.`,
        "",
        title,
        ...(equipo ? [`Equipo: ${equipo}`] : []),
        "",
        description,
      ].join("\n"),
    }).catch((e) => console.error("[support/tickets] correo:", e));

    return Response.json(ticket, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[support/tickets] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
