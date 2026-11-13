/**
 * Contacto fijo de la carta de instrucciones: por decisión del cliente, en los
 * cuadros de carga y de descarga siempre sale Maribel (JTP), no el contacto
 * del cliente.
 *
 * Puro, para poder probarlo.
 */

export const INSTRUCTION_CONTACT = {
  name: "Maribel Ramírez Arellano",
  phone: "33-3058-0733",
} as const;

type LetterContacts = {
  originContact?: string;
  destinationContact?: string;
  originPhone?: string;
  destinationPhone?: string;
};

/** Pone el contacto fijo en carga y descarga. */
export function withInstructionContact<T extends LetterContacts>(data: T): T {
  return {
    ...data,
    originContact: INSTRUCTION_CONTACT.name,
    destinationContact: INSTRUCTION_CONTACT.name,
    originPhone: INSTRUCTION_CONTACT.phone,
    destinationPhone: INSTRUCTION_CONTACT.phone,
  };
}
