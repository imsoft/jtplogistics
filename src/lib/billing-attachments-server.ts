/**
 * PDF y XML de las facturas. Los archivos se suben a Cloudinary como privados
 * (no hay URL pública) y solo se descargan a través de la plataforma, con
 * permiso de Administración.
 *
 * El XML además llena la factura: folio, folio fiscal, RFC e importes salen
 * del CFDI y no se capturan a mano.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cloudinary } from "@/lib/cloudinary";
import { toDate } from "@/lib/billing-server";
import { cfdiDocumentFields, cfdiKindError, parseCfdi, type CfdiData } from "@/lib/cfdi";
import type { BillingKind } from "@/lib/billing";

/** Vercel no acepta cuerpos de más de 4.5 MB en una función. */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

const FOLDER = "billing";

export type AttachmentKind = "xml" | "pdf";

/** Revisa el archivo por su contenido, no por el nombre que trae. */
export function readUpload(name: string, bytes: Buffer):
  | { ok: true; kind: "pdf" }
  | { ok: true; kind: "xml"; cfdi: CfdiData }
  | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "El archivo está vacío." };
  if (bytes.length > MAX_ATTACHMENT_BYTES) return { ok: false, error: "El archivo pesa más de 4 MB." };
  if (bytes.subarray(0, 5).toString("ascii") === "%PDF-") return { ok: true, kind: "pdf" };
  if (/\.xml$/i.test(name) || bytes.subarray(0, 64).toString("utf8").trimStart().startsWith("<")) {
    const parsed = parseCfdi(bytes.toString("utf8"));
    if (!parsed.ok) return parsed;
    const kindError = cfdiKindError(parsed.data);
    if (kindError) return { ok: false, error: kindError };
    return { ok: true, kind: "xml", cfdi: parsed.data };
  }
  return { ok: false, error: "Solo se aceptan el PDF o el XML de la factura." };
}

export async function storeFile(bytes: Buffer, kind: AttachmentKind): Promise<string> {
  const dataUri = `data:${kind === "pdf" ? "application/pdf" : "application/xml"};base64,${bytes.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    resource_type: "raw",
    type: "private",
    folder: FOLDER,
    // En los archivos "raw" la extensión es parte del id.
    public_id: `${crypto.randomUUID()}.${kind}`,
  });
  return result.public_id;
}

/** Baja el archivo de Cloudinary con un enlace firmado que caduca en un minuto. */
export async function fetchFile(storageId: string): Promise<Response> {
  const url = cloudinary.utils.private_download_url(storageId, "", {
    resource_type: "raw",
    type: "private",
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
  return fetch(url);
}

export async function removeFile(storageId: string) {
  try {
    await cloudinary.uploader.destroy(storageId, { resource_type: "raw", type: "private" });
  } catch (e) {
    console.error("[billing] no se pudo borrar el archivo", storageId, e);
  }
}

export function attachmentToJson(a: { id: string; kind: string; fileName: string; size: number; createdAt: Date; cfdi: Prisma.JsonValue }) {
  return {
    id: a.id,
    kind: a.kind as AttachmentKind,
    fileName: a.fileName,
    size: a.size,
    createdAt: a.createdAt.toISOString(),
    hasCfdi: a.cfdi !== null,
  };
}

/**
 * Lo que el XML fija en la factura. El nombre de la contraparte se respeta si
 * ya se eligió del catálogo (para que el estado de cuenta junte sus
 * facturas); el RFC, el folio y los importes siempre son los del XML.
 */
export function cfdiOverrides(cfdi: CfdiData, kind: BillingKind) {
  const f = cfdiDocumentFields(cfdi, kind);
  return {
    partyRfc: f.partyRfc,
    series: f.series,
    folio: f.folio,
    uuid: f.uuid,
    issueDate: toDate(cfdi.issueDate),
    currency: f.currency,
    exchangeRate: f.exchangeRate,
    subtotal: f.subtotal,
    ivaRate: f.ivaRate,
    iva: f.iva,
    ivaWithheld: f.ivaWithheld,
    isrWithheld: f.isrWithheld,
    total: f.total,
    paymentMethod: f.paymentMethod,
  } satisfies Partial<Prisma.BillingDocumentUncheckedCreateInput>;
}

/**
 * Antes de validar el cuerpo: lo que trae el XML cuenta como capturado (folio,
 * fecha, subtotal), para que no se pida teclear lo que ya viene en el archivo.
 */
export function withCfdiBody(body: Record<string, unknown>, cfdi: CfdiData | null) {
  if (!cfdi) return body;
  const due = typeof body.dueDate === "string" && body.dueDate >= cfdi.issueDate ? body.dueDate : cfdi.issueDate;
  return {
    ...body,
    series: cfdi.series ?? "",
    folio: cfdi.folio ?? cfdi.uuid?.slice(-8) ?? "",
    issueDate: cfdi.issueDate,
    dueDate: due,
    currency: cfdi.currency,
    exchangeRate: cfdi.exchangeRate,
    subtotal: cfdi.subtotal,
    draft: false,
  };
}

/** El CFDI del XML adjunto a una factura, si tiene. */
export async function documentCfdi(documentId: string): Promise<CfdiData | null> {
  const rows = await prisma.billingAttachment.findMany({
    where: { documentId, kind: "xml" },
    orderBy: { createdAt: "desc" },
    select: { cfdi: true },
  });
  return (rows.find((r) => r.cfdi)?.cfdi as CfdiData | undefined) ?? null;
}

/**
 * Los adjuntos que se subieron mientras se capturaba la factura (todavía sin
 * factura) y que son de quien la guarda. Devuelve el CFDI si entre ellos va un XML.
 */
export async function pendingAttachments(ids: unknown, userId: string) {
  const list = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  if (list.length === 0) return { ids: [] as string[], cfdi: null as CfdiData | null };
  const rows = await prisma.billingAttachment.findMany({
    where: { id: { in: list }, documentId: null, createdById: userId },
    select: { id: true, kind: true, cfdi: true },
  });
  const xml = rows.find((r) => r.kind === "xml" && r.cfdi);
  return { ids: rows.map((r) => r.id), cfdi: (xml?.cfdi as CfdiData | undefined) ?? null };
}

/** Otra factura (no cancelada) con el mismo folio fiscal. */
export async function uuidTaken(kind: BillingKind, uuid: string | null, exceptId?: string) {
  if (!uuid) return null;
  return prisma.billingDocument.findFirst({
    where: { kind, uuid, cancelledAt: null, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true },
  });
}

/**
 * Archivos que se subieron mientras se capturaba una factura que nunca se
 * guardó. Se limpian de paso en cada subida: no hace falta un proceso aparte.
 */
export async function sweepAbandoned() {
  const stale = await prisma.billingAttachment.findMany({
    where: { documentId: null, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    select: { id: true, storageId: true },
    take: 20,
  });
  if (stale.length === 0) return;
  await prisma.billingAttachment.deleteMany({ where: { id: { in: stale.map((a) => a.id) }, documentId: null } });
  await Promise.all(stale.map((a) => removeFile(a.storageId)));
}
