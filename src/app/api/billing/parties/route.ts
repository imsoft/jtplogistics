import { prisma } from "@/lib/db";
import { failure, requireBilling } from "@/lib/billing-server";

/**
 * GET /api/billing/parties?kind=receivable|payable — nombres para autocompletar:
 * clientes del catálogo o transportistas, más los que ya se usaron en facturas.
 */
export async function GET(request: Request) {
  try {
    await requireBilling("view");
    const kind = new URL(request.url).searchParams.get("kind") === "payable" ? "payable" : "receivable";
    const used = await prisma.billingDocument.findMany({
      where: { kind },
      distinct: ["partyName"],
      select: { partyName: true, partyRfc: true, clientId: true },
    });
    const list: { name: string; rfc: string | null; clientId: string | null; creditDays?: number | null }[] = [];
    const creditDays = new Map<string, number | null>();
    if (kind === "receivable") {
      const clients = await prisma.client.findMany({ select: { id: true, name: true, legalName: true, rfc: true, creditDays: true }, orderBy: { name: "asc" } });
      for (const c of clients) {
        creditDays.set(c.id, c.creditDays);
        list.push({ name: c.legalName?.trim() || c.name, rfc: c.rfc, clientId: c.id, creditDays: c.creditDays });
      }
    } else {
      // Solo la cuenta principal de cada transportista (no sus usuarios).
      const carriers = await prisma.user.findMany({
        where: { role: "carrier", offboardedOn: null, parentCarrierId: null },
        select: { name: true, profile: { select: { legalName: true, commercialName: true, rfc: true } } },
      });
      for (const c of carriers) {
        const name = c.profile?.legalName?.trim() || c.profile?.commercialName?.trim() || c.name.trim();
        list.push({ name, rfc: c.profile?.rfc ?? null, clientId: null });
      }
    }
    for (const u of used) list.push({ name: u.partyName, rfc: u.partyRfc, clientId: u.clientId });
    const seen = new Map<string, (typeof list)[number]>();
    for (const p of list) {
      const key = p.name.trim().toLowerCase();
      if (!key) continue;
      const prev = seen.get(key);
      const clientId = prev?.clientId ?? p.clientId;
      seen.set(key, { name: prev?.name ?? p.name.trim(), rfc: prev?.rfc ?? p.rfc, clientId, creditDays: clientId ? (creditDays.get(clientId) ?? null) : null });
    }
    return Response.json([...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "es")));
  } catch (e) {
    return failure(e, "parties GET");
  }
}
