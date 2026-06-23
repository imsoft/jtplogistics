/**
 * Agrupación de contactos por persona. Función pura y sus tipos, en un módulo
 * sin "use client" para que pueda usarse tanto en server components como en
 * componentes cliente (Next no permite invocar una función de un módulo
 * "use client" desde el servidor).
 */

export interface ContactPersonContact {
  id: string;
  type: "phone" | "email";
  value: string;
  label: string | null;
}

export interface ContactPerson {
  name: string;
  position: string;
  contacts: ContactPersonContact[];
}

/**
 * Agrupa contactos planos en personas (por nombre de persona + puesto); los
 * contactos antiguos sin persona quedan agrupados por puesto.
 */
export function groupContactsByPerson(
  contacts: {
    id: string;
    type: "phone" | "email";
    value: string;
    label: string | null;
    position: string | null;
    personName: string | null;
  }[]
): ContactPerson[] {
  const map = new Map<string, ContactPerson>();
  for (const c of contacts) {
    const name = c.personName?.trim() ?? "";
    const position = c.position?.trim() ?? "";
    const key = `${name.toLowerCase()}||${position.toLowerCase()}`;
    let person = map.get(key);
    if (!person) {
      person = { name, position, contacts: [] };
      map.set(key, person);
    }
    person.contacts.push({ id: c.id, type: c.type, value: c.value, label: c.label });
  }
  return Array.from(map.values());
}
