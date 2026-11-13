/**
 * Contacto fijo de la carta de instrucciones (Configuración): sale en los
 * cuadros de carga y de descarga en lugar del contacto del cliente.
 *
 * Puro, para poder probarlo.
 */

export const INSTRUCTION_CONTACT_NAME = "instruction_contact_name";
export const INSTRUCTION_CONTACT_PHONE = "instruction_contact_phone";

type LetterContacts = {
  originContact?: string;
  destinationContact?: string;
  originPhone?: string;
  destinationPhone?: string;
};

/**
 * Pone el contacto configurado en carga y descarga. Cada dato por separado: si
 * solo hay nombre, el teléfono sigue siendo el de antes (y al revés).
 */
export function withInstructionContact<T extends LetterContacts>(data: T, settings: Record<string, string | undefined>): T {
  const name = settings[INSTRUCTION_CONTACT_NAME]?.trim();
  const phone = settings[INSTRUCTION_CONTACT_PHONE]?.trim();
  return {
    ...data,
    ...(name && { originContact: name, destinationContact: name }),
    ...(phone && { originPhone: phone, destinationPhone: phone }),
  };
}
