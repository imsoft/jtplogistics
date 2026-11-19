import { prisma } from "@/lib/db";

/** El proveedor (usuario principal) al que JTP le va a cambiar algo, o null. */
export function findCarrierCompany(id: string) {
  return prisma.user.findFirst({ where: { id, role: "carrier", parentCarrierId: null }, select: { id: true, name: true } });
}
