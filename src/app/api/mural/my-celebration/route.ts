import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { celebrationsInRange, startOfUtcDay } from "@/lib/mural-celebrations";

/**
 * ¿Hoy es el cumpleaños o el aniversario de quien está en sesión?
 * Devuelve `null` cuando no es su día, para que la felicitación ni se monte.
 */
export async function GET() {
  try {
    const session = await requireSession();

    if (session.user.role !== "admin" && session.user.role !== "collaborator") {
      return Response.json(null);
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        image: true,
        position: true,
        birthDate: true,
        employeeProfile: { select: { hireDate: true, position: true } },
      },
    });

    if (!me) return Response.json(null);

    const today = startOfUtcDay(new Date());
    const celebrations = celebrationsInRange(
      [
        {
          id: me.id,
          name: me.name,
          image: me.image,
          position: me.position ?? me.employeeProfile?.position ?? null,
          birthDate: me.birthDate,
          hireDate: me.employeeProfile?.hireDate ?? null,
        },
      ],
      today,
      today
    );

    if (celebrations.length === 0) return Response.json(null);

    // Si coinciden cumpleaños y aniversario el mismo día, manda el cumpleaños.
    const birthday = celebrations.find((c) => c.kind === "birthday");
    return Response.json(birthday ?? celebrations[0]);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[mural/my-celebration]", e);
    return Response.json(null);
  }
}
