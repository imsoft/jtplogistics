import { describe, expect, it } from "vitest";
import { outcomeAfterStatus, outcomeFromHistory, ratingStatus } from "./shipment-outcome";

describe("shipment-outcome", () => {
  it("guarda el resultado al entregar y lo conserva al cerrar", () => {
    expect(outcomeAfterStatus("delivered_with_delay", null)).toBe("delivered_with_delay");
    expect(outcomeAfterStatus("returned", "delivered_with_delay")).toBe("delivered_with_delay");
  });

  it("si vuelve a estar en camino, ya no hay resultado", () => {
    expect(outcomeAfterStatus("pending", "delivered")).toBeNull();
    expect(outcomeAfterStatus("at_risk", "delivered")).toBeNull();
  });

  it("un cerrado se califica con su resultado", () => {
    expect(ratingStatus("returned", "delivered")).toBe("delivered");
    expect(ratingStatus("returned", null)).toBe("returned");
    expect(ratingStatus("not_delivered", null)).toBe("not_delivered");
  });

  it("toma el último resultado del historial", () => {
    expect(outcomeFromHistory(["pending", "delivered", "returned"])).toBe("delivered");
    expect(outcomeFromHistory(["delivered", "pending", "returned"])).toBeNull();
    expect(outcomeFromHistory(["at_risk", "not_delivered", "delivered_with_delay", "returned"])).toBe("delivered_with_delay");
  });
});

describe("en tránsito", () => {
  it("no deja resultado de entrega, como pendiente", () => {
    expect(outcomeAfterStatus("in_transit", "delivered")).toBeNull();
    expect(outcomeFromHistory(["delivered", "in_transit"])).toBeNull();
  });
});
