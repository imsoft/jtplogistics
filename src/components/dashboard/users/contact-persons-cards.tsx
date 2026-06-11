"use client";

import { useState } from "react";
import { Phone, Mail, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPhone } from "@/lib/utils";

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
 * Agrupa contactos planos en personas (mismo criterio que el perfil del
 * transportista): por nombre de persona + puesto; los contactos antiguos sin
 * persona quedan agrupados por puesto.
 */
export function groupContactsByPerson(
  contacts: { id: string; type: "phone" | "email"; value: string; label: string | null; position: string | null; personName: string | null }[]
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

/**
 * Tarjetas de personas de contacto: muestran el puesto como dato principal y
 * al hacer clic abren un modal con toda la información de la persona.
 */
export function ContactPersonsCards({ persons }: { persons: ContactPerson[] }) {
  const [selected, setSelected] = useState<ContactPerson | null>(null);

  if (persons.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <User className="size-3.5" /> Personas de contacto
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {persons.map((p, i) => {
            const phoneCount = p.contacts.filter((c) => c.type === "phone").length;
            const emailCount = p.contacts.filter((c) => c.type === "email").length;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(p)}
                className="rounded-lg border p-4 text-left transition-colors hover:bg-hover hover:text-hover-foreground"
              >
                <p className="text-sm font-semibold">{p.position || "Sin puesto"}</p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">{p.name || "Sin nombre"}</p>
                <p className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" /> {phoneCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="size-3" /> {emailCount}
                  </span>
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.position || "Persona de contacto"}</DialogTitle>
                <DialogDescription>{selected.name || "Sin nombre registrado"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-1">
                {selected.contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-0.5 border-b py-3 last:border-0 sm:grid sm:grid-cols-[140px_1fr] sm:gap-2"
                  >
                    <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      {c.type === "phone" ? <Phone className="size-3.5" /> : <Mail className="size-3.5" />}
                      {c.label ?? (c.type === "phone" ? "Teléfono" : "Correo")}
                    </span>
                    <span className="text-sm font-medium break-all">
                      {c.type === "phone" ? formatPhone(c.value) : c.value}
                    </span>
                  </div>
                ))}
                {selected.contacts.length === 0 && (
                  <p className="text-muted-foreground text-sm">Sin teléfonos ni correos.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
