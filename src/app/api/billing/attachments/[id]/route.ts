import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { docFolio, failure, requireBilling } from "@/lib/billing-server";
import { fetchFile, removeFile } from "@/lib/billing-attachments-server";

/** GET: descarga el archivo. Pasa por aquí para que nunca haya una URL pública. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("view");
    const { id } = await params;
    const a = await prisma.billingAttachment.findUnique({ where: { id } });
    // Uno sin factura solo lo ve quien lo subió (todavía está capturando).
    if (!a || (!a.documentId && a.createdById !== session.user.id)) return Response.json({ error: "No encontrado" }, { status: 404 });
    const file = await fetchFile(a.storageId);
    if (!file.ok || !file.body) return Response.json({ error: "No se pudo descargar el archivo." }, { status: 502 });
    return new Response(file.body, {
      headers: {
        "Content-Type": a.kind === "pdf" ? "application/pdf" : "application/xml; charset=utf-8",
        "Content-Disposition": `${a.kind === "pdf" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(a.fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e, "attachment GET");
  }
}

/** DELETE: quita el archivo. Los importes que trajo el XML se quedan como estaban. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("update");
    const { id } = await params;
    const a = await prisma.billingAttachment.findUnique({ where: { id }, include: { document: true } });
    if (!a || (!a.documentId && a.createdById !== session.user.id)) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.billingAttachment.delete({ where: { id } });
    await removeFile(a.storageId);
    if (a.document) {
      void logAudit({
        resource: "billing_document",
        resourceId: a.document.id,
        resourceLabel: `${docFolio(a.document)} · ${a.document.partyName}`,
        action: "updated",
        userId: session.user.id,
        userName: session.user.name,
        changes: [{ field: "attachment", label: a.kind === "xml" ? "XML quitado" : "PDF quitado", from: a.fileName, to: null }],
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e, "attachment DELETE");
  }
}
