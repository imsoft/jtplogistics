/**
 * Facturar desde el embarque: arma el borrador de la factura al cliente (con
 * la tarifa de venta y los datos de Carta Porte) y el de la cuenta por pagar
 * al transportista (con la tarifa de compra).
 *
 * Puro y sin base de datos, para poder probarlo.
 */

import { computeTotals, type BillingKind } from "@/lib/billing";
import { normalizePlates, operatorMissing, vehicleMissing, type OperatorData, type VehicleData } from "@/lib/carrier-fleet";
import { normalizeSearch } from "@/lib/search";

/** Solo se factura un embarque que ya se entregó (o se cerró). */
export const BILLABLE_STATUSES = ["delivered", "delivered_with_delay", "returned"] as const;

export interface BillingShipment {
  eco: string | null;
  client: string | null;
  origin: string | null;
  destination: string | null;
  product: string | null;
  pickupDate: string | null;
  deliveryDate: string | null;
  legalName: string | null;
  operatorName: string | null;
  truck: string | null;
  trailer: string | null;
  sale: number | null;
  cost: number | null;
  status: string;
}

export interface BillingClient {
  id: string;
  name: string;
  legalName: string | null;
  rfc: string | null;
  taxRegime: string | null;
  fiscalZip: string | null;
  cfdiUse: string | null;
}

export interface BillingCarrier {
  id: string;
  legalName: string | null;
  commercialName: string | null;
  rfc: string | null;
  vehicles: (VehicleData & { id: string })[];
  operators: (OperatorData & { id: string })[];
}

/** Lo que el timbrado necesitará; se guarda como foto en el borrador. */
export interface CartaPorteSnapshot {
  origin: string | null;
  destination: string | null;
  product: string | null;
  pickupDate: string | null;
  deliveryDate: string | null;
  carrier: { id: string | null; name: string | null; rfc: string | null };
  vehicle: Omit<VehicleData, "active" | "kind" | "trailerSubtype"> | null;
  trailer: { plates: string; trailerSubtype: string | null } | null;
  operator: { name: string; rfc: string | null; licenseNumber: string | null } | null;
  /** Lo que falta para poder timbrar la Carta Porte. */
  missing: string[];
}

export interface DraftPlan {
  kind: BillingKind;
  partyName: string;
  partyRfc: string | null;
  clientId: string | null;
  subtotal: number;
  ivaRate: number;
  withholdingRate: number;
  iva: number;
  ivaWithheld: number;
  total: number;
  concept: string;
  reference: string | null;
}

const same = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b && normalizeSearch(a.trim()) === normalizeSearch(b.trim()));

/** Busca la unidad del embarque en el expediente: por placas o por número económico. */
function findVehicle(list: (VehicleData & { id: string })[], text: string | null, kind: VehicleData["kind"]) {
  if (!text?.trim()) return null;
  const plates = normalizePlates(text);
  return list.find((v) => v.kind === kind && (v.plates === plates || same(v.label, text))) ?? null;
}

export function cartaPorteSnapshot(s: BillingShipment, carrier: BillingCarrier | null): CartaPorteSnapshot {
  const missing: string[] = [];
  if (!s.origin || !s.destination) missing.push("origen y destino");
  if (!s.product) missing.push("producto");
  if (!carrier) missing.push("el transportista no está dado de alta en la plataforma");
  if (carrier && !carrier.rfc) missing.push("RFC del transportista");

  const vehicle = carrier ? findVehicle(carrier.vehicles, s.truck, "motriz") : null;
  const trailer = carrier ? findVehicle(carrier.vehicles, s.trailer, "remolque") : null;
  const operator = carrier?.operators.find((o) => same(o.name, s.operatorName)) ?? null;

  if (carrier) {
    if (!vehicle) missing.push(s.truck?.trim() ? `el tracto ${s.truck.trim()} no está en el expediente del transportista` : "tracto");
    else if (vehicleMissing(vehicle).length) missing.push(`del tracto: ${vehicleMissing(vehicle).join(", ")}`);
    if (s.trailer?.trim() && !trailer) missing.push(`la caja ${s.trailer.trim()} no está en el expediente del transportista`);
    if (!operator) missing.push(s.operatorName?.trim() ? `el operador ${s.operatorName.trim()} no está en el expediente del transportista` : "operador");
    else if (operatorMissing(operator).length) missing.push(`del operador: ${operatorMissing(operator).join(", ")}`);
  }

  return {
    origin: s.origin,
    destination: s.destination,
    product: s.product,
    pickupDate: s.pickupDate,
    deliveryDate: s.deliveryDate,
    carrier: {
      id: carrier?.id ?? null,
      name: carrier?.legalName ?? s.legalName,
      rfc: carrier?.rfc ?? null,
    },
    vehicle: vehicle
      ? {
          label: vehicle.label,
          plates: vehicle.plates,
          year: vehicle.year,
          vehicleConfig: vehicle.vehicleConfig,
          sctPermitType: vehicle.sctPermitType,
          sctPermitNumber: vehicle.sctPermitNumber,
          grossWeightTons: vehicle.grossWeightTons,
          insurer: vehicle.insurer,
          policyNumber: vehicle.policyNumber,
        }
      : null,
    trailer: trailer ? { plates: trailer.plates, trailerSubtype: trailer.trailerSubtype } : null,
    operator: operator ? { name: operator.name, rfc: operator.rfc, licenseNumber: operator.licenseNumber } : null,
    missing,
  };
}

function concept(s: BillingShipment) {
  const route = [s.origin, s.destination].filter(Boolean).join(" – ");
  return `Servicio de flete${route ? ` ${route}` : ""}${s.eco ? ` · ECO ${s.eco}` : ""}`;
}

/**
 * Los dos borradores que salen de un embarque. Cada lado puede no salir, con
 * el motivo: sin tarifa no hay importe, y sin cliente o transportista no hay
 * a quién facturar.
 */
export function planShipmentBilling(
  s: BillingShipment,
  client: BillingClient | null,
  carrier: BillingCarrier | null
): {
  blocked: string | null;
  receivable: { plan: DraftPlan | null; reason: string | null };
  payable: { plan: DraftPlan | null; reason: string | null };
} {
  const blocked = (BILLABLE_STATUSES as readonly string[]).includes(s.status)
    ? null
    : "Se factura cuando el embarque ya se entregó.";

  let receivable: { plan: DraftPlan | null; reason: string | null };
  if (!s.sale || s.sale <= 0) receivable = { plan: null, reason: "Falta la tarifa de venta del embarque." };
  else if (!s.client?.trim()) receivable = { plan: null, reason: "El embarque no tiene cliente." };
  else {
    const rfc = client?.rfc ?? null;
    // Autotransporte de carga: la persona moral (RFC de 12) retiene el 4 % de IVA.
    const withholdingRate = rfc && rfc.length === 13 ? 0 : 0.04;
    const totals = computeTotals({ subtotal: s.sale, ivaRate: 0.16, withholdingRate });
    receivable = {
      plan: {
        kind: "receivable",
        partyName: client?.legalName?.trim() || client?.name || s.client.trim(),
        partyRfc: rfc,
        clientId: client?.id ?? null,
        ivaRate: 0.16,
        withholdingRate,
        ...totals,
        concept: concept(s),
        reference: s.eco,
      },
      reason: null,
    };
  }

  let payable: { plan: DraftPlan | null; reason: string | null };
  if (!s.cost || s.cost <= 0) payable = { plan: null, reason: "Falta la tarifa de compra del embarque." };
  else if (!s.legalName?.trim()) payable = { plan: null, reason: "El embarque no tiene transportista." };
  else {
    const totals = computeTotals({ subtotal: s.cost, ivaRate: 0.16, withholdingRate: 0 });
    payable = {
      plan: {
        kind: "payable",
        partyName: carrier?.legalName?.trim() || s.legalName.trim(),
        partyRfc: carrier?.rfc ?? null,
        clientId: null,
        ivaRate: 0.16,
        withholdingRate: 0,
        ...totals,
        concept: concept(s),
        reference: s.eco,
      },
      reason: null,
    };
  }

  return { blocked, receivable, payable };
}

/** Si el transportista del embarque (texto libre) es este proveedor. */
export function carrierMatches(shipmentLegalName: string | null, c: { legalName: string | null; commercialName: string | null }) {
  return same(shipmentLegalName, c.legalName) || same(shipmentLegalName, c.commercialName);
}

/** Si el cliente del embarque (texto libre) es este cliente del catálogo. */
export function clientMatches(shipmentClient: string | null, c: { name: string; legalName: string | null }) {
  return same(shipmentClient, c.name) || same(shipmentClient, c.legalName);
}
