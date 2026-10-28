import { describe, it, expect } from "vitest";
import { shipmentDeleteBlock, shipmentLockReason } from "@/lib/shipment-lock";

describe("shipmentLockReason", () => {
  it("cerrado manda", () => {
    expect(shipmentLockReason({ status: "returned", incident: "si" })).toBe("closed");
  });
  // Lo pidió el cliente: sin incidencias, la ficha es de solo lectura.
  it("sin incidencias queda de solo lectura", () => {
    expect(shipmentLockReason({ status: "delivered", incident: "no" })).toBe("no_incident");
    expect(shipmentLockReason({ status: "pending", incident: "NO" })).toBe("no_incident");
  });
  it("con incidencia o sin capturar sigue editable", () => {
    expect(shipmentLockReason({ status: "delivered", incident: "si" })).toBeNull();
    expect(shipmentLockReason({ status: "pending", incident: "" })).toBeNull();
    expect(shipmentLockReason({ status: "pending", incident: null })).toBeNull();
  });
});

describe("shipmentDeleteBlock", () => {
  const closed = { status: "returned", incident: null };
  it("abierto: se elimina sin más", () => {
    expect(shipmentDeleteBlock({ status: "pending", incident: null }, { isAdmin: false, emailConfirmed: false })).toBeNull();
  });
  it("cerrado: el colaborador no puede", () => {
    expect(shipmentDeleteBlock(closed, { isAdmin: false, emailConfirmed: true })).toMatch(/solo dirección/);
  });
  it("cerrado: dirección solo confirmando su correo", () => {
    expect(shipmentDeleteBlock(closed, { isAdmin: true, emailConfirmed: false })).toMatch(/confirma tu correo/);
    expect(shipmentDeleteBlock(closed, { isAdmin: true, emailConfirmed: true })).toBeNull();
  });
});
