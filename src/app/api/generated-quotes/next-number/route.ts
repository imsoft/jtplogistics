import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    // Collaborators need canViewQuotes; admins bypass
    if (session.user.role === "collaborator") {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canViewQuotes: true },
      });
      if (!me?.canViewQuotes) {
        return Response.json({ error: "Sin permiso" }, { status: 403 });
      }
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dd = pad(now.getDate());
    const mm = pad(now.getMonth() + 1);
    const aaaa = now.getFullYear();

    const startOfDay = new Date(`${aaaa}-${mm}-${dd}T00:00:00.000Z`);
    const endOfDay   = new Date(`${aaaa}-${mm}-${dd}T23:59:59.999Z`);

    const count = await prisma.generatedQuote.count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    });

    const next = String(count + 1).padStart(3, "0");
    return Response.json({ quoteNumber: `JTP-${dd}${mm}${aaaa}-${next}` });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
