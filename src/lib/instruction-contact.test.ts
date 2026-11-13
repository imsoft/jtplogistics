import { describe, expect, it } from "vitest";
import { INSTRUCTION_CONTACT, withInstructionContact } from "./instruction-contact";

describe("contacto de la carta de instrucciones", () => {
  it("siempre Maribel en carga y descarga", () => {
    const r = withInstructionContact({ eco: "1", originContact: "CLIENTE", destinationContact: "CLIENTE", originPhone: "1", destinationPhone: "2" });
    expect(r).toEqual({
      eco: "1",
      originContact: INSTRUCTION_CONTACT.name,
      destinationContact: INSTRUCTION_CONTACT.name,
      originPhone: "33-3058-0733",
      destinationPhone: "33-3058-0733",
    });
  });
});
