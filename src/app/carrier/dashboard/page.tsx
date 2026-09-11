import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { CarrierDashboardHome } from "@/components/dashboard/carrier/carrier-dashboard-home";

export const metadata = {
  title: "Inicio | JTP Logistics",
  description: "Resumen de tus rutas y licitación en JTP Logistics.",
};

export default async function CarrierDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "carrier") redirect("/login");

  // Un usuario agregado trabaja sobre las tarifas de su empresa, no las suyas.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { parentCarrierId: true },
  });
  const carrierId = me?.parentCarrierId ?? session.user.id;

  const selectionCount = await prisma.carrierRoute.count({
    where: { carrierId },
  });
  if (selectionCount === 0) {
    redirect("/carrier/dashboard/unit-types");
  }

  return <CarrierDashboardHome />;
}
