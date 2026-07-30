import { muralHandler } from "@/lib/mural-auth";
import { getCelebrations } from "@/lib/mural-celebrations-query";
import { startOfUtcDay } from "@/lib/mural-celebrations";
import { parseMuralDate } from "@/lib/mural";

/**
 * Cumpleaños y aniversarios derivados del perfil de cada colaborador.
 * Por defecto devuelve los de los próximos 60 días.
 */
export function GET(request: Request) {
  return muralHandler("canViewMural", async () => {
    const { searchParams } = new URL(request.url);
    const from = parseMuralDate(searchParams.get("from")) ?? startOfUtcDay(new Date());
    const to =
      parseMuralDate(searchParams.get("to")) ??
      new Date(from.getTime() + 60 * 86_400_000);

    return Response.json(await getCelebrations(from, to));
  });
}
