import { describe, expect, it } from "vitest";
import { SHIPMENT_STATUS_VALUES, isActiveShipmentStatus, isShipmentStatus, shipmentStatusLabel } from "./shipment-statuses";
import { outcomeAfterStatus } from "./shipment-outcome";

describe("estados del embarque", () => {
  it("incluye los estados operativos que pidió el cliente", () => {
    expect(SHIPMENT_STATUS_VALUES).toHaveLength(41);
    expect(shipmentStatusLabel("awaiting_unload")).toBe("Unidad en espera de descarga");
    expect(shipmentStatusLabel("at_ramp")).toBe("Unidad en rampa");
    expect(isShipmentStatus("meal_stop")).toBe(true);
    expect(isShipmentStatus("otro")).toBe(false);
    expect(shipmentStatusLabel("false_freight")).toBe("Flete en falso");
    expect(shipmentStatusLabel("near_safe_yard")).toBe("Unidad próxima a resguardo");
  });

  it("los operativos van en camino: no dejan resultado de entrega", () => {
    expect(isActiveShipmentStatus("traffic_delay")).toBe(true);
    expect(isActiveShipmentStatus("delivered")).toBe(false);
    expect(outcomeAfterStatus("awaiting_unload", "delivered")).toBeNull();
    expect(outcomeAfterStatus("returned", "delivered")).toBe("delivered");
  });
});
