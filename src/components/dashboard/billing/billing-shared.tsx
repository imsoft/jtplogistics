"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, formatMxn } from "@/lib/utils";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { DOCUMENT_STATUS, type BillingKind, type Currency, type DocumentStatus } from "@/lib/billing";
import type { CartaPorteSnapshot } from "@/lib/shipment-billing";

export interface BillingPaymentRow {
  id: string;
  paidOn: string;
  amount: number;
  bankAccountId: string;
  bankAccountName: string;
  bankAccountCurrency: Currency;
  bankAmount: number;
  exchangeRate: number;
  paymentForm: string | null;
  reference: string | null;
  notes: string | null;
  batch: { count: number; bankAmount: number } | null;
  createdByName: string | null;
}

export interface BillingAttachmentRow {
  id: string;
  kind: "xml" | "pdf";
  fileName: string;
  size: number;
  createdAt: string;
  hasCfdi: boolean;
}

/** Lo que regresa la API al subir un PDF o XML. */
export interface UploadedAttachment {
  attachment: BillingAttachmentRow;
  fields: {
    partyName: string;
    partyRfc: string;
    series: string | null;
    folio: string | null;
    uuid: string | null;
    currency: Currency;
    exchangeRate: number;
    subtotal: number;
    ivaRate: number;
    iva: number;
    ivaWithheld: number;
    isrWithheld: number;
    total: number;
    paymentMethod: "PUE" | "PPD";
  } | null;
  cfdi: { issueDate: string; concept: string | null; hasCartaPorte: boolean; issuer: { rfc: string; name: string | null }; receiver: { rfc: string; name: string | null } } | null;
}

/** Sube el PDF o el XML de una factura. Con `documentId` se adjunta de una vez. */
export async function uploadAttachment(file: File, kind: BillingKind, documentId?: string): Promise<UploadedAttachment> {
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  if (documentId) body.append("documentId", documentId);
  const res = await fetch("/api/billing/attachments", { method: "POST", body });
  const d = (await res.json().catch(() => ({}))) as UploadedAttachment & { error?: string };
  if (!res.ok) throw new Error(d.error ?? "No se pudo subir el archivo.");
  return d;
}

export const attachmentHref = (id: string) => `/api/billing/attachments/${id}`;

export interface BillingDocument {
  id: string;
  kind: BillingKind;
  clientId: string | null;
  partyName: string;
  partyRfc: string | null;
  series: string | null;
  /** Vacío mientras es borrador. */
  folio: string | null;
  draft: boolean;
  shipmentId: string | null;
  shipmentEco: string | null;
  cartaPorte: CartaPorteSnapshot | null;
  uuid: string | null;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  exchangeRate: number;
  subtotal: number;
  ivaRate: number;
  iva: number;
  ivaWithheld: number;
  isrWithheld: number;
  total: number;
  paymentMethod: "PUE" | "PPD";
  attachments: BillingAttachmentRow[];
  /** Los importes salen del XML adjunto: no se editan a mano. */
  fromXml: boolean;
  concept: string | null;
  reference: string | null;
  notes: string | null;
  source: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdByName: string | null;
  createdAt: string;
  paid: number;
  balance: number;
  status: DocumentStatus;
  payments: BillingPaymentRow[];
}

export interface BankAccountRow {
  id: string;
  name: string;
  bank: string | null;
  accountNumber: string | null;
  currency: Currency;
  initialBalance: number;
  initialBalanceOn: string;
  active: boolean;
  balance: number;
  unreconciled: number;
}

/** "$25,000.00 MXN" */
export function money(n: number, currency: Currency) {
  return `${n < 0 ? "-" : ""}$${formatMxn(Math.abs(n))} ${currency}`;
}

export function folioLabel(d: { series: string | null; folio: string | null }) {
  return d.folio ? [d.series, d.folio].filter(Boolean).join("-") : "Borrador";
}

export function shortDay(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
}

export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = DOCUMENT_STATUS[status];
  return <Badge variant="outline" className={cn("border-0 whitespace-nowrap", cfg.badgeClass)}>{cfg.label}</Badge>;
}

/**
 * Qué puede hacer quien mira. Dirección y soporte de TI todo; el colaborador
 * según su permiso de Administración. La API valida de nuevo.
 */
export function useBillingPerms(panel: "admin" | "collaborator") {
  const { permissions, isLoaded } = useCollaboratorPermissions();
  if (panel === "admin") return { isLoaded: true, canView: true, canCreate: true, canUpdate: true, canDelete: true };
  return {
    isLoaded,
    canView: Boolean(permissions?.canViewBilling),
    canCreate: Boolean(permissions?.canCreateBilling),
    canUpdate: Boolean(permissions?.canUpdateBilling),
    canDelete: Boolean(permissions?.canDeleteBilling),
  };
}

/** Cuentas de banco activas, para elegir en cobros, pagos y gastos. */
export function useBankAccounts() {
  const [accounts, setAccounts] = useState<BankAccountRow[] | null>(null);
  useEffect(() => {
    fetch("/api/billing/banks")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAccounts(Array.isArray(d) ? d : []))
      .catch(() => setAccounts([]));
  }, []);
  return accounts;
}

export const KIND_SLUG: Record<BillingKind, string> = { receivable: "receivables", payable: "payables" };
