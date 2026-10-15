"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import type { Client } from "@/types/client.types";

/**
 * Elegir un cliente del catálogo para llenar con sus datos lo que antes se
 * tecleaba cada vez (compañía, contacto, teléfono, correo). Lo pidió el
 * cliente: los clientes se capturan una sola vez, en Clientes.
 *
 * Los campos siguen siendo editables después de elegir: un cliente que aún no
 * está registrado se puede escribir a mano.
 */
export function ClientPicker({
  endpoint,
  onPick,
  label = "Cliente registrado",
}: {
  /** Lista de clientes del panel: admin responde { data }, colaborador un arreglo. */
  endpoint: string;
  onPick: (client: Client) => void;
  label?: string;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : []))
      .then((res: unknown) => {
        const arr = Array.isArray(res) ? res : (res as { data?: unknown })?.data;
        setClients(Array.isArray(arr) ? (arr as Client[]) : []);
      })
      .catch(() => setClients([]));
  }, [endpoint]);

  if (clients.length === 0) return null;

  return (
    <div className="space-y-2 sm:col-span-2 lg:col-span-3">
      <Label>{label}</Label>
      <AppSelect
        value={selected}
        onValueChange={(id) => {
          setSelected(id);
          const c = clients.find((x) => x.id === id);
          if (c) onPick(c);
        }}
        options={clients.map((c) => ({ value: c.id, label: c.name }))}
        className="w-full sm:max-w-md"
      />
      <p className="text-muted-foreground text-xs">
        Al elegirlo se llenan sus datos abajo; puedes corregirlos. Si no está en la lista, escríbelos a mano.
      </p>
    </div>
  );
}
