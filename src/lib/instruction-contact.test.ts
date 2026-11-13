import { describe, expect, it } from "vitest";
import { withInstructionContact } from "./instruction-contact";

const base = { eco: "1", originContact: "CLIENTE", destinationContact: "CLIENTE", originPhone: "1", destinationPhone: "2" };

describe("contacto de la carta de instrucciones", () => {
  it("pone el contacto configurado en carga y descarga", () => {
    const r = withInstructionContact(base, { instruction_contact_name: "Maribel", instruction_contact_phone: "33-1234-5678" });
    expect(r).toEqual({ eco: "1", originContact: "Maribel", destinationContact: "Maribel", originPhone: "33-1234-5678", destinationPhone: "33-1234-5678" });
  });

  it("sin configurar, se queda el del cliente", () => {
    expect(withInstructionContact(base, {})).toEqual(base);
    expect(withInstructionContact(base, { instruction_contact_name: "  " })).toEqual(base);
  });
});
