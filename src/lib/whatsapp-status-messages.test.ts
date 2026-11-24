import { describe, expect, it } from "vitest";
import { statusMessageFor } from "@/lib/whatsapp-status-messages";

const base = { eco: "J-16353", origin: "Chihuahua", destination: "Ciudad de México", deliveryDate: "2026-10-03T00:00:00.000Z", status: "on_route" };

describe("statusMessageFor", () => {
  it("un cambio normal usa la plantilla de estado", () => {
    expect(statusMessageFor(base, "Ana")).toEqual({
      template: "jtp_estado_embarque",
      params: ["J-16353", "Chihuahua - Ciudad de México", "Unidad en ruta", "03/10/2026"],
    });
  });
  it("entregado usa la de entregado", () => {
    expect(statusMessageFor({ ...base, status: "delivered_with_delay" }, "Ana")?.template).toBe("jtp_embarque_entregado");
  });
  it("tráfico e incidencias usan la de retraso", () => {
    expect(statusMessageFor({ ...base, status: "traffic_delay" }, "Ana")?.template).toBe("jtp_embarque_retraso");
    expect(statusMessageFor({ ...base, status: "stopped_breakdown" }, "Ana")?.params[2]).toBe("Unidad detenida por falla mecánica");
  });
  it("pendiente y cerrado no se avisan", () => {
    expect(statusMessageFor({ ...base, status: "pending" }, "Ana")).toBeNull();
    expect(statusMessageFor({ ...base, status: "returned" }, "Ana")).toBeNull();
  });
  it("nunca manda variables vacías", () => {
    const m = statusMessageFor({ eco: null, origin: null, destination: null, deliveryDate: null, status: "on_route" }, "");
    expect(m?.params.every((p) => p.length > 0)).toBe(true);
    expect(m?.params[3]).toBe("POR CONFIRMAR");
  });
});
