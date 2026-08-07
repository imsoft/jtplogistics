import { getCelebrations } from "@/lib/mural-celebrations-query";
import { startOfUtcDay } from "@/lib/mural-celebrations";
import { sendCelebrationGreetings } from "@/lib/celebration-notify";
import { broadcastMural } from "@/lib/mural-notify";
import { parseMuralDate } from "@/lib/mural";

export const dynamic = "force-dynamic";

/**
 * Celebraciones del día. Corre todos los días y hace dos cosas:
 *
 *  1. Felicita en persona a quien cumple años o aniversario.
 *  2. Avisa al equipo, ese mismo día, de quién celebra.
 *
 * No hay resumen diario ni semanal: los eventos, capacitaciones y vacaciones
 * ya avisan solos al darlos de alta, editarlos o cancelarlos, y los cumpleaños
 * tienen que llegar el día exacto, no en una lista de la semana.
 *
 * Se protege con CRON_SECRET.
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
    // `date` permite probar las celebraciones de un día concreto.
    const today = parseMuralDate(searchParams.get("date")) ?? startOfUtcDay(new Date());

    const celebrations = await getCelebrations(today, today);
    if (celebrations.length === 0) {
      return Response.json({ celebrations: 0, greeted: 0, announced: false });
    }

    // Primero la felicitación personal: es la que no puede fallar.
    const greeted = await sendCelebrationGreetings(celebrations);

    const lines = celebrations.map((c) =>
      c.kind === "birthday"
        ? `🎂 <strong>${c.name}</strong> cumple años hoy${c.years ? ` (${c.years})` : ""}.`
        : `🎉 <strong>${c.name}</strong> cumple ${c.years ?? 1} ${
            (c.years ?? 1) === 1 ? "año" : "años"
          } en JTP Logistics.`
    );

    const names = celebrations.map((c) => c.name).join(", ");
    const isSingle = celebrations.length === 1;

    await broadcastMural({
      type: "mural_celebrations",
      title: isSingle ? "Hoy celebramos a un compañero" : "Hoy celebramos a varios compañeros",
      body: names,
      path: "/dashboard/mural",
      sendEmail: true,
      emailSubject: isSingle
        ? `Mural JTP · Hoy celebramos a ${celebrations[0].name}`
        : "Mural JTP · Hoy celebramos en el equipo",
      emailHeading: "Hoy celebramos",
      emailParagraphs: [
        ...lines,
        isSingle
          ? "No dejes pasar el día sin felicitarle."
          : "No dejes pasar el día sin felicitarles.",
      ],
    });

    return Response.json({ celebrations: celebrations.length, greeted, announced: true });
  } catch (e) {
    console.error("[cron/mural-greetings]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
