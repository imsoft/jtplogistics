import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { routeToJson, type PrismaRoute } from "@/lib/api/route-utils";
import { EditRouteForm } from "@/components/dashboard/routes/edit-route-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const route = await prisma.route.findUnique({
    where: { id },
    select: { origin: true, destination: true },
  });
  return {
    title: route
      ? `Editar ${route.origin} → ${route.destination} | JTP Logistics`
      : "Editar ruta | JTP Logistics",
  };
}

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const route = await prisma.route.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      unitTargets: true,
    },
  });

  if (!route) notFound();

  const routeJson = routeToJson(route as unknown as PrismaRoute);

  return <EditRouteForm route={routeJson} />;
}
