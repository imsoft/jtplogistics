/**
 * Datos de la empresa de un proveedor (razón social, RFC, domicilio,
 * contactos y notas de servicio). Los guarda el proveedor una sola vez, al
 * registrarse; después solo los cambia JTP desde su panel (decisión del
 * cliente). Leer y guardar se comparte entre /api/profile y la API de JTP.
 */
import { prisma } from "@/lib/db";
import { validateCarrierProfilePayload } from "@/lib/validators/registration-abuse";

export type CompanyContact = { type: "phone" | "email"; value: string; label?: string; position?: string; personName?: string };

export interface CompanyInput {
  commercialName?: string | null;
  legalName?: string | null;
  rfc?: string | null;
  address?: string | null;
  /** Solo si vienen se reemplazan: un guardado parcial no deja sin contactos. */
  contacts?: CompanyContact[];
}

/** Lo que ve el proveedor cuando intenta cambiar algo que administra JTP. */
export const JTP_MANAGES_COMPANY =
  "Los datos de tu empresa, sus contactos y notas los administra JTP. Si necesitas un cambio, escríbenos por Mensajes.";

export const DEFAULT_CARRIER_NOTES = "- Estadías\n- Reparto";

const CONTACT_SELECT = { id: true, type: true, value: true, label: true, position: true, personName: true } as const;

/** Lee los campos de la empresa de un body sin confiar en él. Error en español o los datos. */
export function readCompanyBody(body: Record<string, unknown>): { ok: true; data: CompanyInput } | { ok: false; error: string } {
  const str = (v: unknown) => (v != null ? String(v).trim() || null : undefined);
  const data: CompanyInput = {
    commercialName: str(body.commercialName),
    legalName: str(body.legalName),
    rfc: body.rfc != null ? String(body.rfc).trim().toUpperCase() || null : undefined,
    address: str(body.address),
  };
  if (Array.isArray(body.contacts)) {
    if (body.contacts.length > 50) return { ok: false, error: "Demasiados contactos." };
    const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const contacts: CompanyContact[] = [];
    for (const raw of body.contacts) {
      const c = (raw ?? {}) as Record<string, unknown>;
      if (c.type !== "phone" && c.type !== "email") return { ok: false, error: "Tipo de contacto no válido." };
      const value = text(c.value, 200);
      if (!value) continue;
      contacts.push({ type: c.type, value, label: text(c.label, 60), position: text(c.position, 100), personName: text(c.personName, 120) });
    }
    data.contacts = contacts;
  }
  const abuse = validateCarrierProfilePayload({ commercialName: data.commercialName, legalName: data.legalName, contacts: data.contacts ?? [] });
  if (!abuse.ok) return { ok: false, error: abuse.message };
  return { ok: true, data };
}

/** Si la empresa ya tiene sus datos (con eso el proveedor ya no los cambia). */
export async function companyAlreadySet(ownerId: string): Promise<boolean> {
  const p = await prisma.profile.findUnique({ where: { userId: ownerId }, select: { legalName: true, rfc: true } });
  return Boolean(p?.legalName?.trim() || p?.rfc?.trim());
}

/** Guarda los datos de la empresa del principal `ownerId` y devuelve cómo quedaron. */
export async function saveCompany(ownerId: string, data: CompanyInput) {
  const profile = await prisma.profile.upsert({
    where: { userId: ownerId },
    create: {
      userId: ownerId,
      commercialName: data.commercialName ?? undefined,
      legalName: data.legalName ?? undefined,
      rfc: data.rfc ?? undefined,
      address: data.address ?? undefined,
    },
    update: {
      ...(data.commercialName !== undefined && { commercialName: data.commercialName }),
      ...(data.legalName !== undefined && { legalName: data.legalName }),
      ...(data.rfc !== undefined && { rfc: data.rfc }),
      ...(data.address !== undefined && { address: data.address }),
    },
  });
  // Se reemplazan juntos: si algo falla, no se quedan borrados.
  if (data.contacts) {
    await prisma.$transaction([
      prisma.contact.deleteMany({ where: { profileId: profile.id } }),
      prisma.contact.createMany({
        data: data.contacts.map((c) => ({
          profileId: profile.id,
          type: c.type,
          value: c.value,
          label: c.label || null,
          position: c.position || null,
          personName: c.personName || null,
        })),
      }),
    ]);
  }
  const contacts = await prisma.contact.findMany({ where: { profileId: profile.id }, select: CONTACT_SELECT, orderBy: { createdAt: "asc" } });
  return {
    commercialName: profile.commercialName ?? "",
    legalName: profile.legalName ?? "",
    rfc: profile.rfc ?? "",
    address: profile.address ?? "",
    contacts,
  };
}

/** Los datos actuales de la empresa del principal. */
export async function loadCompany(ownerId: string) {
  const p = await prisma.profile.findUnique({
    where: { userId: ownerId },
    select: { commercialName: true, legalName: true, rfc: true, address: true, contacts: { select: CONTACT_SELECT, orderBy: { createdAt: "asc" } } },
  });
  return {
    commercialName: p?.commercialName ?? "",
    legalName: p?.legalName ?? "",
    rfc: p?.rfc ?? "",
    address: p?.address ?? "",
    contacts: p?.contacts ?? [],
  };
}

/** Las notas de servicios de la empresa (las cambia JTP). Devuelve si cambiaron. */
export async function saveCarrierNotes(carrierId: string, notes: string | null): Promise<{ changed: boolean; before: string | null }> {
  const prev = await prisma.user.findUnique({ where: { id: carrierId }, select: { carrierNotes: true } });
  await prisma.user.update({ where: { id: carrierId }, data: { carrierNotes: notes } });
  return { changed: (prev?.carrierNotes ?? "") !== (notes ?? ""), before: prev?.carrierNotes ?? null };
}

export async function loadCarrierNotes(carrierId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: carrierId }, select: { carrierNotes: true } });
  return u?.carrierNotes ?? DEFAULT_CARRIER_NOTES;
}
