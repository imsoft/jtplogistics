import { describe, expect, it } from "vitest";
import { finalStars, isHalfStar, isMonthKey, monthKeyOf, monthLabel, scoreShipments, scoreToStars, shipmentMonth } from "./carrier-evaluation";

const ship = (status: string, incident: string | null = "No", deliveryOutcome: string | null = null) => ({ status, incident, deliveryOutcome });

describe("evaluación de transportistas", () => {
  it("califica con puntualidad, entregas e incidencias", () => {
    const s = scoreShipments([ship("delivered"), ship("delivered_with_delay"), ship("delivered", "Sí")])!;
    expect(s.total).toBe(3);
    expect(s.punctualityScore).toBe(83);
    expect(s.incidentFreeScore).toBe(67);
    expect(s.deliveryRateScore).toBe(100);
    expect(s.overallScore).toBe(83);
  });
  it("un cerrado cuenta con su entrega y sin resultado se deja fuera", () => {
    expect(scoreShipments([ship("returned", "No", "delivered")])!.delivered).toBe(1);
    expect(scoreShipments([ship("returned")])).toBeNull();
  });
  it("estrellas en medias, de 1 a 5", () => {
    expect(scoreToStars(100)).toBe(5);
    expect(scoreToStars(90)).toBe(4.5);
    expect(scoreToStars(83)).toBe(4);
    expect(scoreToStars(10)).toBe(1);
    expect(isHalfStar(4.5)).toBe(true);
    expect(isHalfStar(4.3)).toBe(false);
    expect(isHalfStar(0.5)).toBe(false);
  });
  it("la calificación de JTP manda sobre la automática", () => {
    expect(finalStars(4, 4.5)).toBe(4.5);
    expect(finalStars(4, null)).toBe(4);
    expect(finalStars(null, null)).toBeNull();
  });
  it("agrupa por mes en la zona de la empresa", () => {
    // 1 nov 2026 a las 03:00 UTC todavía es 31 oct en México.
    expect(monthKeyOf(new Date("2026-11-01T03:00:00Z"))).toBe("2026-10");
    expect(shipmentMonth({ pickupDate: null, deliveryDate: new Date("2026-09-15T12:00:00Z"), createdAt: new Date("2026-10-01T12:00:00Z") })).toBe("2026-09");
    expect(monthLabel("2026-10")).toBe("octubre 2026");
    expect(isMonthKey("2026-13")).toBe(false);
  });
});
