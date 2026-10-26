import { describe, expect, it } from "vitest";
import { clientReadyToInvoice, missingFiscalData, readClientFiscal } from "./sat-catalogs";

describe("readClientFiscal", () => {
  it("normaliza RFC y uso del CFDI aunque lleguen en minúsculas", () => {
    expect(readClientFiscal({ rfc: "gbi 890101-aaa", cfdiUse: "g03", taxRegime: "601", fiscalZip: "44100" })).toEqual({
      ok: true,
      data: { rfc: "GBI890101AAA", cfdiUse: "G03", taxRegime: "601", fiscalZip: "44100" },
    });
  });
  it("acepta RFC de persona física", () => {
    expect(readClientFiscal({ rfc: "GARB900101AB1" }).ok).toBe(true);
  });
  it("rechaza datos inválidos", () => {
    expect(readClientFiscal({ rfc: "XXX" }).ok).toBe(false);
    expect(readClientFiscal({ fiscalZip: "441" }).ok).toBe(false);
    expect(readClientFiscal({ taxRegime: "999" }).ok).toBe(false);
    expect(readClientFiscal({ cfdiUse: "Z99" }).ok).toBe(false);
  });
  it("vacío limpia el campo y ausente no lo toca", () => {
    expect(readClientFiscal({ rfc: "" })).toEqual({ ok: true, data: { rfc: null } });
    expect(readClientFiscal({})).toEqual({ ok: true, data: {} });
  });
});

describe("listo para facturar", () => {
  it("pide RFC, régimen y CP", () => {
    const c = { name: "Grupo", rfc: "GBI890101AAA", taxRegime: "601", fiscalZip: "44100" };
    expect(clientReadyToInvoice(c)).toBe(true);
    expect(missingFiscalData({ ...c, taxRegime: null, fiscalZip: null })).toEqual(["régimen fiscal", "código postal fiscal"]);
  });
});

describe("días de crédito del cliente", () => {
  it("entero de 0 a 365; vacío = sin definir", () => {
    expect(readClientFiscal({ creditDays: "45" })).toEqual({ ok: true, data: { creditDays: 45 } });
    expect(readClientFiscal({ creditDays: "" })).toEqual({ ok: true, data: { creditDays: null } });
    expect(readClientFiscal({ creditDays: "0" })).toEqual({ ok: true, data: { creditDays: 0 } });
    expect(readClientFiscal({}).ok && "creditDays" in (readClientFiscal({}) as { data: object }).data).toBe(false);
    expect(readClientFiscal({ creditDays: "400" }).ok).toBe(false);
    expect(readClientFiscal({ creditDays: "1.5" }).ok).toBe(false);
  });
});
