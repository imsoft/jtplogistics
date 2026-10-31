import { describe, expect, it } from "vitest";
import { missingShipmentFields, missingShipmentMessage } from "./shipment-required";

describe("missingShipmentFields", () => {
  it("no falta nada con los cuatro básicos", () => {
    expect(missingShipmentFields({ client: "Aceros", origin: "Guadalajara", destination: "Monterrey", unit: "caja_seca" })).toEqual([]);
  });
  it("cuenta como vacío lo que solo trae espacios o no viene", () => {
    expect(missingShipmentFields({ client: "  ", origin: "Guadalajara" })).toEqual(["cliente", "destino", "tipo de unidad"]);
  });
});

describe("missingShipmentMessage", () => {
  it("arma la frase en singular y en plural", () => {
    expect(missingShipmentMessage([])).toBe("");
    expect(missingShipmentMessage(["cliente"])).toBe("Falta el cliente.");
    expect(missingShipmentMessage(["origen", "destino", "tipo de unidad"])).toBe("Faltan origen, destino y tipo de unidad.");
  });
});
