import { prisma } from "@/lib/db";
import { requireCarrierAccount } from "@/lib/carrier-account";

/**
 * GET /api/carrier/account
 *
 * Qué puede hacer quien está dentro y de qué empresa es. El menú y las
 * pantallas lo usan para no enseñar lo que igual les rebotaría la API.
 */
export async function GET() {
  try {
    const { carrierId, isPrincipal, can } = await requireCarrierAccount();
    const company = isPrincipal
      ? null
      : await prisma.user.findUnique({ where: { id: carrierId }, select: { name: true } });
    return Response.json({
      carrierId,
      isPrincipal,
      companyName: company?.name ?? null,
      can,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[carrier/account]", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
