import { describe, expect, it } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InstructionLetterPdf } from "@/components/dashboard/resources/instruction-letter-pdf";
import path from "path";

describe("InstructionLetterPdf", () => {
  it("genera el documento con el diseño exacto", async () => {
    const logoPath = path.resolve(process.cwd(), "public/images/logo/jtp-instruction-logo.jpg");
    const doc = React.createElement(InstructionLetterPdf, {
      data: {
        eco: "J - 16353",
        client: "MARIBEL RAMIREZ",
        product: "MISCELANEOS",
        pickupDate: "2026-10-01",
        deliveryDate: "2026-10-03",
        pickupTime: "12:00 PM",
        deliveryTime: "08:00 AM",
        legalName: "TRANSPORTES PRUEBA",
        operatorName: "",
        phone: "",
        truck: "",
        trailer: "",
        unit: 'CAJA SECA DE 53"',
        origin: "CHIHUAHUA, CHIH",
        destination: "AZCAPOTZALCO, CDMX",
        originAddress: "BODEGA JOI\nJUAN PABLO II 5174, ROBINSON,\nCHIHUAHUA, CHIH.\n31074\n33 3243 1035",
        destinationAddress: "INDUSTRIAL VALLEJO\nAZCAPOTZALCO, CIUDAD DE MEXICO\n02300\n33 3243 1035",
        originContact: "MARIBEL RAMIREZ",
        destinationContact: "MARIBEL RAMIREZ",
        originPhone: "33 3243 1035",
        destinationPhone: "33 3243 1035",
        comments: "",
      },
      logoUrl: logoPath,
    });

    // renderToBuffer pide un <Document>; el componente lo regresa, pero su tipo no lo dice.
    const buffer = await renderToBuffer(doc as unknown as Parameters<typeof renderToBuffer>[0]);
    const fs = await import("fs");
    fs.writeFileSync("/tmp/generated_instruction_letter.pdf", buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
