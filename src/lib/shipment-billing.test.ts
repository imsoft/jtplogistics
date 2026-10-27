import { describe, expect, it } from "vitest";
import { documentStatus } from "./billing";
import { readOperatorBody, readVehicleBody } from "./carrier-fleet";
import { carrierMatches, cartaPorteSnapshot, clientMatches, planShipmentBilling, type BillingCarrier, type BillingShipment } from "./shipment-billing";

const shipment: BillingShipment = {
  eco: "ECO-77",
  client: "Aceros del Bajío",
  origin: "Guadalajara",
  destination: "Monterrey",
  product: "Varilla",
  pickupDate: "2026-10-20",
  deliveryDate: "2026-10-22",
  legalName: "Transportes Pérez SA de CV",
  operatorName: "Juan Pérez",
  truck: "AB-123-CD",
  trailer: "ECO 9",
  sale: 50000,
  cost: 40000,
  status: "delivered",
};

function carrier(): BillingCarrier {
  const t = readVehicleBody({ kind: "motriz", plates: "AB123CD", year: "2021", vehicleConfig: "T3S2", sctPermitType: "TPAF01", sctPermitNumber: "X1", grossWeightTons: "36", insurer: "Qualitas", policyNumber: "P1" }, 2026);
  const r = readVehicleBody({ kind: "remolque", plates: "99XY88", label: "ECO 9", trailerSubtype: "CTR007" }, 2026);
  const o = readOperatorBody({ name: "Juan Perez", rfc: "PEJJ800101AB1", licenseNumber: "L1" });
  if (!t.ok || !r.ok || !o.ok) throw new Error("datos de prueba");
  return {
    id: "c1",
    legalName: "Transportes Pérez SA de CV",
    commercialName: "TP",
    rfc: "TPE010101AB1",
    vehicles: [{ ...t.data, id: "v1" }, { ...r.data, id: "v2" }],
    operators: [{ ...o.data, id: "o1" }],
  };
}

describe("planShipmentBilling", () => {
  it("arma la factura al cliente y la cuenta por pagar con las tarifas", () => {
    const client = { id: "k1", name: "Aceros del Bajío", legalName: "Aceros del Bajío SA de CV", rfc: "ABA010101AB1", taxRegime: "601", fiscalZip: "44100", cfdiUse: "G03" };
    const p = planShipmentBilling(shipment, client, carrier());
    expect(p.blocked).toBeNull();
    expect(p.receivable.plan).toMatchObject({ partyName: "Aceros del Bajío SA de CV", clientId: "k1", subtotal: 50000, iva: 8000, ivaWithheld: 2000, total: 56000, reference: "ECO-77" });
    expect(p.receivable.plan?.concept).toBe("Servicio de flete Guadalajara – Monterrey · ECO ECO-77");
    expect(p.payable.plan).toMatchObject({ partyName: "Transportes Pérez SA de CV", partyRfc: "TPE010101AB1", subtotal: 40000, total: 46400 });
  });
  it("persona física: sin retención", () => {
    const client = { id: "k1", name: "Aceros del Bajío", legalName: null, rfc: "PEJJ800101AB1", taxRegime: "612", fiscalZip: "44100", cfdiUse: "G03" };
    expect(planShipmentBilling(shipment, client, null).receivable.plan?.ivaWithheld).toBe(0);
  });
  it("explica por qué no sale cada lado", () => {
    const p = planShipmentBilling({ ...shipment, sale: null, cost: 0, status: "pending" }, null, null);
    expect(p.blocked).toMatch(/entregó/);
    expect(p.receivable.reason).toMatch(/tarifa de venta/);
    expect(p.payable.reason).toMatch(/tarifa de compra/);
  });
});

describe("cartaPorteSnapshot", () => {
  it("encuentra tracto por placas, caja por número económico y operador sin acentos", () => {
    const s = cartaPorteSnapshot(shipment, carrier());
    expect(s.vehicle?.plates).toBe("AB123CD");
    expect(s.trailer).toEqual({ plates: "99XY88", trailerSubtype: "CTR007" });
    expect(s.operator?.rfc).toBe("PEJJ800101AB1");
    expect(s.missing).toEqual([]);
  });
  it("dice qué falta", () => {
    expect(cartaPorteSnapshot(shipment, null).missing).toContain("el transportista no está dado de alta en la plataforma");
    const s = cartaPorteSnapshot({ ...shipment, truck: "ZZZ999", operatorName: "Otro" }, carrier());
    expect(s.missing).toEqual([
      "el tracto ZZZ999 no está en el expediente del transportista",
      "el operador Otro no está en el expediente del transportista",
    ]);
  });
});

describe("coincidencias y borradores", () => {
  it("compara nombres sin mayúsculas ni acentos", () => {
    expect(clientMatches("ACEROS DEL BAJIO", { name: "Aceros del Bajío", legalName: null })).toBe(true);
    expect(carrierMatches("tp", { legalName: "Otra", commercialName: "TP" })).toBe(true);
    expect(carrierMatches(null, { legalName: null, commercialName: null })).toBe(false);
  });
  it("un borrador no tiene saldo", () => {
    expect(documentStatus({ total: 100, paid: 0, dueDate: "2020-01-01", cancelled: false, draft: true, todayKey: "2026-10-26" })).toEqual({ status: "borrador", balance: 0 });
  });
});

describe("transportista con correo para desambiguar", () => {
  it("'Nombre (correo)' empata con el nombre", () => {
    expect(carrierMatches("Transportes Pérez (pedro@x.com)", { legalName: "Transportes Perez", commercialName: null })).toBe(true);
  });
});
