import { describe, expect, it } from "vitest";
import { cfdiDocumentFields, cfdiKindError, parseCfdi } from "./cfdi";

/** Factura de un transportista en RESICO: retiene IVA 4 % y ISR 1.25 %, con Carta Porte. */
const CARRIER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
  xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31"
  Version="4.0" Serie="f" Folio="1234" Fecha="2026-10-20T10:15:00" SubTotal="10000.00" Descuento="0.00" Moneda="MXN"
  Total="11035.00" TipoDeComprobante="I" MetodoPago="PPD" FormaPago="99" Exportacion="01" LugarExpedicion="44100">
  <cfdi:Emisor Rfc="PEJJ800101AB1" Nombre="JUAN PEREZ JIMENEZ" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="JTP010101AB1" Nombre="JTP LOGISTICS" DomicilioFiscalReceptor="44100" RegimenFiscalReceptor="601" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="78101802" Cantidad="1" ClaveUnidad="E48" Descripcion="Flete Guadalajara - Monterrey" ValorUnitario="10000.00" Importe="10000.00" ObjetoImp="02"/>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosRetenidos="525.00" TotalImpuestosTrasladados="1600.00">
    <cfdi:Retenciones>
      <cfdi:Retencion Impuesto="002" Importe="400.00"/>
      <cfdi:Retencion Impuesto="001" Importe="125.00"/>
    </cfdi:Retenciones>
    <cfdi:Traslados>
      <cfdi:Traslado Base="10000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="1600.00"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <cartaporte31:CartaPorte Version="3.1" TranspInternac="No"/>
    <tfd:TimbreFiscalDigital Version="1.1" UUID="a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d" FechaTimbrado="2026-10-20T10:16:00"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

describe("parseCfdi", () => {
  it("lee emisor, receptor, folio, UUID e importes con retenciones", () => {
    const r = parseCfdi(CARRIER_XML);
    if (!r.ok) throw new Error(r.error);
    expect(r.data).toMatchObject({
      version: "4.0",
      type: "I",
      uuid: "A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D",
      series: "F",
      folio: "1234",
      issueDate: "2026-10-20",
      currency: "MXN",
      subtotal: 10000,
      iva: 1600,
      ivaRate: 0.16,
      ivaWithheld: 400,
      isrWithheld: 125,
      total: 11035,
      paymentMethod: "PPD",
      issuer: { rfc: "PEJJ800101AB1", name: "JUAN PEREZ JIMENEZ" },
      receiver: { rfc: "JTP010101AB1", name: "JTP LOGISTICS" },
      concept: "Flete Guadalajara - Monterrey",
      hasCartaPorte: true,
    });
    expect(cfdiKindError(r.data)).toBeNull();
  });

  it("la contraparte depende de la lista: proveedor = emisor, cliente = receptor", () => {
    const r = parseCfdi(CARRIER_XML);
    if (!r.ok) throw new Error(r.error);
    expect(cfdiDocumentFields(r.data, "payable").partyRfc).toBe("PEJJ800101AB1");
    expect(cfdiDocumentFields(r.data, "receivable").partyName).toBe("JTP LOGISTICS");
  });

  it("descuento, dólares y varios conceptos", () => {
    const xml = CARRIER_XML.replace('SubTotal="10000.00" Descuento="0.00" Moneda="MXN"', 'SubTotal="1000.00" Descuento="100.00" Moneda="USD" TipoCambio="18.50"');
    const r = parseCfdi(xml);
    expect(r.ok && [r.data.subtotal, r.data.currency, r.data.exchangeRate]).toEqual([900, "USD", 18.5]);
  });

  it("nota de crédito: tipo E con la factura relacionada", () => {
    const xml = CARRIER_XML.replace('TipoDeComprobante="I"', 'TipoDeComprobante="E"').replace(
      "<cfdi:Emisor",
      '<cfdi:CfdiRelacionados TipoRelacion="01"><cfdi:CfdiRelacionado UUID="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"/></cfdi:CfdiRelacionados><cfdi:Emisor'
    );
    const r = parseCfdi(xml);
    if (!r.ok) throw new Error(r.error);
    expect(r.data.related).toEqual(["AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE"]);
    expect(cfdiKindError(r.data, "E")).toBeNull();
    expect(cfdiKindError(r.data)).toMatch(/nota de crédito/);
    const factura = parseCfdi(CARRIER_XML);
    expect(factura.ok && cfdiKindError(factura.data, "E")).toMatch(/no es una nota de crédito/);
  });

  it("rechaza lo que no es factura de ingreso", () => {
    expect(parseCfdi("no es xml <<")).toMatchObject({ ok: false });
    expect(parseCfdi("<root/>")).toEqual({ ok: false, error: "El XML no es una factura (CFDI)." });
    const pago = parseCfdi(CARRIER_XML.replace('Moneda="MXN"', 'Moneda="XXX"'));
    expect(pago).toEqual({ ok: false, error: "Es un complemento de pago, no una factura." });
    const nc = parseCfdi(CARRIER_XML.replace('TipoDeComprobante="I"', 'TipoDeComprobante="E"'));
    expect(nc.ok && cfdiKindError(nc.data)).toMatch(/nota de crédito/);
  });

  it("rechaza XML con entidades externas", () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]>${CARRIER_XML.replace(/^<\?xml[^>]*>/, "").replace('Nombre="JUAN PEREZ JIMENEZ"', 'Nombre="&e;"')}`;
    expect(parseCfdi(xxe)).toEqual({ ok: false, error: "El archivo no es un XML válido." });
  });
});
