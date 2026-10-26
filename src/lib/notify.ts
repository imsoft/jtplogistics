/**
 * Server-side helper to create in-app notifications.
 * Fire-and-forget: errors are logged but never thrown.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
}

export async function notify(input: NotifyInput | NotifyInput[]) {
  try {
    const items = Array.isArray(input) ? input : [input];
    if (items.length === 0) return;
    await prisma.notification.createMany({ data: items });
  } catch (e) {
    console.error("[notify] Error creating notification:", e);
  }
}

/**
 * Notifica a los usuarios activos con el rol indicado. `where` acota más,
 * p. ej. solo los colaboradores con el permiso del módulo.
 */
export async function notifyRole(
  role: string,
  data: Omit<NotifyInput, "userId">,
  where: Prisma.UserWhereInput = {}
) {
  try {
    const users = await prisma.user.findMany({
      where: { ...where, role: role as never, offboardedOn: null },
      select: { id: true },
    });
    await notify(users.map((u) => ({ ...data, userId: u.id })));
  } catch (e) {
    console.error("[notifyRole] Error:", e);
  }
}
