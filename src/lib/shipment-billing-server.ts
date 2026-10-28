/**
 * Facturar desde el embarque, lado servidor: junta el embarque con su cliente
 * y su transportista del catálogo, y lo que ya se facturó de él.
 */

import { prisma } from "@/lib/db";
import { shipmentTotals } from "@/lib/shipment-tariffs";
import { readExtraCosts } from "@/lib/shipment-extras";
import type { OperatorData, VehicleData } from "@/lib/carrier-fleet";
import {
  carrierMatches,
  clientMatches,
  type BillingCarrier,
  type BillingClient,
  type BillingShipment,
} from "@/lib/shipment-billing";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function addDays(key: string, days: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** El embarque con su cliente y transportista del catálogo (si se encuentran) y lo ya facturado. */
export async function loadShipmentBillingContext(id: string) {
  const row = await prisma.shipment.findUnique({ where: { id } });
  if (!row) return null;
  const shipment: BillingShipment = {
    eco: row.eco,
    client: row.client,
    origin: row.origin,
    destination: row.destination,
    product: row.product,
    pickupDate: day(row.pickupDate),
    deliveryDate: day(row.deliveryDate),
    legalName: row.legalName,
    operatorName: row.operatorName,
    truck: row.truck,
    trailer: row.trailer,
    // Total con costos extra: es lo que se factura y lo que se paga.
    sale: shipmentTotals(row).sale,
    cost: shipmentTotals(row).cost,
    extraConcepts: readExtraCosts(row.extraCosts).map((x) => x.concept),
    status: row.status,
  };

  // Cliente y transportista vienen como texto en el embarque: se buscan sin
  // importar mayúsculas ni acentos.
  const [clients, carriers, documents] = await Promise.all([
    row.client
      ? prisma.client.findMany({ select: { id: true, name: true, legalName: true, rfc: true, taxRegime: true, fiscalZip: true, cfdiUse: true, creditDays: true } })
      : [],
    row.legalName
      ? prisma.user.findMany({
          where: { role: "carrier", parentCarrierId: null, profile: { isNot: null } },
          select: { id: true, carrierPaymentDays: true, profile: { select: { legalName: true, commercialName: true, rfc: true } } },
        })
      : [],
    prisma.billingDocument.findMany({
      where: { shipmentId: id, cancelledAt: null },
      select: { id: true, kind: true, draft: true, series: true, folio: true, total: true, currency: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const client: BillingClient | null = clients.find((c) => clientMatches(row.client, c)) ?? null;
  const carrierRow = carriers.find((c) => c.profile && carrierMatches(row.legalName, c.profile));
  let carrier: BillingCarrier | null = null;
  if (carrierRow?.profile) {
    const [vehicles, operators] = await Promise.all([
      prisma.carrierVehicle.findMany({ where: { carrierId: carrierRow.id, active: true } }),
      prisma.carrierOperator.findMany({ where: { carrierId: carrierRow.id, active: true } }),
    ]);
    carrier = {
      id: carrierRow.id,
      legalName: carrierRow.profile.legalName,
      commercialName: carrierRow.profile.commercialName,
      rfc: carrierRow.profile.rfc,
      paymentDays: carrierRow.carrierPaymentDays,
      vehicles: vehicles as (VehicleData & { id: string })[],
      operators: operators as (OperatorData & { id: string })[],
    };
  }
  return { shipment, client, carrier, documents };
}
