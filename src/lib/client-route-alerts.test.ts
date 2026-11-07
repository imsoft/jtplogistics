import { describe, expect, it } from "vitest";
import { clientRouteAlertText } from "./client-route-alerts";

describe("clientRouteAlertText", () => {
  it("una ruta", () => {
    const t = clientRouteAlertText("Indorama", [{ origin: "Guadalajara", destination: "Monterrey", unitLabel: "Caja seca" }], "Víctor");
    expect(t.title).toBe("Ruta nueva para Indorama");
    expect(t.body).toBe("Víctor le asignó a Indorama: Guadalajara → Monterrey (Caja seca).");
  });
  it("varias rutas", () => {
    const t = clientRouteAlertText("Indorama", [
      { origin: "A", destination: "B", unitLabel: "Nissan" },
      { origin: "C", destination: "D", unitLabel: "Caja seca" },
    ], "Liz");
    expect(t.title).toBe("2 rutas nuevas para Indorama");
    expect(t.list).toEqual(["A → B (Nissan)", "C → D (Caja seca)"]);
  });
});
