import type { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Una cotización aceptada (terrestre o marítima) queda bloqueada: solo el
 * admin, o un colaborador al que el admin le dio canEditAcceptedQuotes, puede
 * editarla o eliminarla. Lanza Response 403 si no tiene permiso.
 */
export async function assertCanModifyAccepted(session: { user: { id: string; role?: string | null } }, status: QuoteStatus) {
  if (status !== "aceptada" || session.user.role !== "collaborator") return;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { canEditAcceptedQuotes: true },
  });
  if (!me?.canEditAcceptedQuotes) {
    throw Response.json(
      { error: "Esta cotización ya fue aceptada. Solicita al administrador permiso para modificarla." },
      { status: 403 }
    );
  }
}
