import { prisma } from "@/lib/db";
import { getCelebrations } from "@/lib/mural-celebrations-query";
import { startOfUtcDay } from "@/lib/mural-celebrations";
import { broadcastMural } from "@/lib/mural-notify";
import { sendCelebrationGreetings } from "@/lib/celebration-notify";
import { formatDateRange, entryKindLabel, parseMuralDate } from "@/lib/mural";

export const dynamic = "force-dynamic";

/**
 * Resumen diario del mural: cumpleaños y aniversarios del día, más los eventos,
 * capacitaciones y vacaciones que arrancan hoy. Pensado para dispararse con el
 * cron de Vercel (ver vercel.json). Se protege con CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    // `date` permite probar el resumen de un día específico.
    const today = parseMuralDate(searchParams.get("date")) ?? startOfUtcDay(new Date());
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const [celebrations, entries] = await Promise.all([
      getCelebrations(today, today),
      prisma.muralEntry.findMany({
        where: { startDate: { gte: today, lt: tomorrow } },
        orderBy: { title: "asc" },
      }),
    ]);

    // Felicitación personal a quien cumple años o aniversario hoy. Va aparte
    // del resumen: ese lo recibe el equipo, este solo la persona festejada.
    const greeted = await sendCelebrationGreetings(celebrations);

    if (celebrations.length === 0 && entries.length === 0) {
      return Response.json({ sent: false, reason: "sin novedades" });
    }

    const lines: string[] = [];

    for (const c of celebrations) {
      if (c.kind === "birthday") {
        lines.push(
          `🎂 <strong>${c.name}</strong> cumple años hoy${c.years ? ` (${c.years})` : ""}.`
        );
      } else {
        lines.push(
          `🎉 <strong>${c.name}</strong> cumple ${c.years ?? 1} ${
            (c.years ?? 1) === 1 ? "año" : "años"
          } en JTP Logistics.`
        );
      }
    }

    for (const entry of entries) {
      const range = formatDateRange(entry.startDate, entry.endDate);
      lines.push(
        `📌 <strong>${entry.title}</strong> — ${entryKindLabel(entry.type).toLowerCase()} (${range})${
          entry.location ? ` · ${entry.location}` : ""
        }`
      );
    }

    const summaryParts = [
      celebrations.length > 0 ? `${celebrations.length} celebración(es)` : null,
      entries.length > 0 ? `${entries.length} evento(s)` : null,
    ].filter(Boolean);

    await broadcastMural({
      type: "mural_digest",
      title: "Novedades del mural de hoy",
      body: summaryParts.join(" · "),
      path: "/dashboard/mural",
      sendEmail: true,
      emailSubject: "Mural JTP · Novedades de hoy",
      emailHeading: "Novedades del mural de hoy",
      emailParagraphs: lines,
      excludeUserId: undefined,
    });

    return Response.json({
      sent: true,
      celebrations: celebrations.length,
      entries: entries.length,
      greeted,
    });
  } catch (e) {
    console.error("[cron/mural-digest]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
