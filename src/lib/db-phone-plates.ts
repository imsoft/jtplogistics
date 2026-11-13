/**
 * Teléfonos y placas con guiones al guardar, en cualquier pantalla o API:
 * el cliente de Prisma (src/lib/db.ts) pasa por aquí todo create/update.
 *
 * Puro, para poder probarlo.
 */
import { formatPhone, formatPlates } from "@/lib/phone-plates";

type Kind = "phone" | "plates";

/** Modelo → campo → qué formato lleva. */
export const PHONE_PLATE_FIELDS: Record<string, Record<string, Kind>> = {
  User: { whatsappPhone: "phone" },
  Client: { phone: "phone" },
  EmployeeProfile: { phone: "phone" },
  Phone: { phoneNumber: "phone" },
  Shipment: { phone: "phone", truck: "plates", trailer: "plates" },
  Finance: { phone: "phone", truck: "plates", trailer: "plates" },
  GeneratedQuote: { phone: "phone" },
  ProviderProspect: { phone: "phone" },
  ClientLead: { phone: "phone" },
  CarrierOperator: { phone: "phone" },
  CarrierVehicle: { plates: "plates" },
};

const fmt = (kind: Kind, v: string) => (kind === "phone" ? formatPhone(v) : formatPlates(v));

/** Un valor de Prisma: texto directo o `{ set: "..." }`. */
function fixValue(kind: Kind, v: unknown): unknown {
  if (typeof v === "string") return v.trim() ? fmt(kind, v) : v;
  if (v && typeof v === "object" && "set" in v && typeof (v as { set: unknown }).set === "string") {
    const s = (v as { set: string }).set;
    return { ...v, set: s.trim() ? fmt(kind, s) : s };
  }
  return v;
}

function fixContact(data: Record<string, unknown>): Record<string, unknown> {
  return data.type === "phone" && typeof data.value === "string" ? { ...data, value: formatPhone(data.value) } : data;
}

/** Los contactos (teléfono o correo) se crean anidados desde el perfil. */
function fixNestedContacts(contacts: unknown): unknown {
  if (!contacts || typeof contacts !== "object") return contacts;
  const c = { ...(contacts as Record<string, unknown>) };
  const each = (v: unknown) => (Array.isArray(v) ? v.map((x) => fixContact(x as Record<string, unknown>)) : v && typeof v === "object" ? fixContact(v as Record<string, unknown>) : v);
  if (c.create) c.create = each(c.create);
  if (c.createMany && typeof c.createMany === "object") {
    const cm = c.createMany as { data?: unknown };
    c.createMany = { ...cm, data: each(cm.data) };
  }
  return c;
}

/** Arregla los datos de un create/update del modelo dado. */
export function fixWriteData(model: string, data: unknown): unknown {
  if (Array.isArray(data)) return data.map((d) => fixWriteData(model, d));
  if (!data || typeof data !== "object") return data;
  let out = data as Record<string, unknown>;
  const fields = PHONE_PLATE_FIELDS[model];
  if (fields) {
    out = { ...out };
    for (const [k, kind] of Object.entries(fields)) if (k in out) out[k] = fixValue(kind, out[k]);
  }
  if (model === "Contact") out = fixContact(out);
  if ("contacts" in out) out = { ...out, contacts: fixNestedContacts(out.contacts) };
  if ("profile" in out && out.profile && typeof out.profile === "object") {
    const p = out.profile as Record<string, unknown>;
    if (p.create && typeof p.create === "object") out = { ...out, profile: { ...p, create: fixWriteData("Profile", p.create) } };
  }
  return out;
}

const WRITE_OPS = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert"]);

/** Los `args` de una operación de Prisma con los teléfonos y placas ya con guiones. */
export function fixWriteArgs(model: string, operation: string, args: Record<string, unknown>): Record<string, unknown> {
  if (!WRITE_OPS.has(operation)) return args;
  if (operation === "upsert") {
    return { ...args, create: fixWriteData(model, args.create), update: fixWriteData(model, args.update) };
  }
  return "data" in args ? { ...args, data: fixWriteData(model, args.data) } : args;
}
