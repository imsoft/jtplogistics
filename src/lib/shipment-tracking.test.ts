import { describe, expect, it } from "vitest";
import { trackingCard, trackingDate, trackingFileName, trackingTime } from "./shipment-tracking";

describe("imagen de seguimiento", () => {
  it("arma la tarjeta con los campos del Excel del cliente", () => {
    const c = trackingCard({
      eco: "J - 16353",
      client: "Omnigreen",
      origin: "Cuautitlán",
      destination: "Orizaba",
      pickupDate: new Date("2026-11-12T00:00:00Z"),
      deliveryDate: "2026-11-13T00:00:00.000Z",
      operatorName: "Abraham David Velázquez Torres",
      status: "in_transit",
      cartaPorte: { destination: { name: "Omnigreen", dateTime: "2026-11-13T08:00" } },
    });
    expect(c.pickupDate).toBe("12/11/2026");
    expect(c.deliveryDate).toBe("13/11/2026");
    expect(c.deliveryTime).toBe("8:00 a. m.");
    expect(c.finalDestination).toBe("Omnigreen");
    expect(c.status.label).toBe("Unidad en tránsito");
    expect(c.reference).toBe("N/A");
    expect(trackingCard({ eco: "1", client: "c", origin: "o", destination: "d", pickupDate: null, deliveryDate: null, operatorName: null, status: "pending", reference: " PO-4581 " }).reference).toBe("PO-4581");
  });

  it("sin datos: guion", () => {
    const c = trackingCard({ eco: null, client: "", origin: null, destination: null, pickupDate: null, deliveryDate: null, operatorName: null, status: "pending" });
    expect([c.eco, c.client, c.finalDestination, c.deliveryTime, c.pickupDate]).toEqual(["—", "—", "—", "—", "—"]);
  });

  it("hora y archivo", () => {
    expect(trackingTime("2026-11-13T14:00")).toBe("2:00 p. m.");
    expect(trackingTime("2026-11-13T00:30")).toBe("12:30 a. m.");
    expect(trackingDate(null)).toBe("—");
    // Guardado viejo con la "t" en minúscula.
    expect(trackingCard({ eco: "1", client: "c", origin: "o", destination: "d", pickupDate: null, deliveryDate: null, operatorName: null, status: "pending", cartaPorte: { destination: { dateTime: "2026-11-18t04:04" } } }).deliveryTime).toBe("4:04 a. m.");
    expect(trackingFileName("J - 16353")).toBe("seguimiento-J-16353.png");
  });
});
