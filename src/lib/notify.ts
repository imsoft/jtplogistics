/**
 * Server-side helper to create in-app notifications.
 * Fire-and-forget: errors are logged but never thrown.
 */
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

/** Notifica a todos los usuarios con el rol indicado. */
export async function notifyRole(
  role: string,
  data: Omit<NotifyInput, "userId">
) {
  try {
    const users = await prisma.user.findMany({
      where: { role: role as never },
      select: { id: true },
    });
    await notify(users.map((u) => ({ ...data, userId: u.id })));
  } catch (e) {
    console.error("[notifyRole] Error:", e);
  }
}
