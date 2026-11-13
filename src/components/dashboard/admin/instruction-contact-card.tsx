"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-plates-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhone } from "@/lib/phone-plates";
import { INSTRUCTION_CONTACT_NAME, INSTRUCTION_CONTACT_PHONE } from "@/lib/instruction-contact";

/**
 * Contacto que sale siempre en la carta de instrucciones, en los cuadros de
 * carga y de descarga (en lugar del contacto del cliente).
 */
export function InstructionContactCard({ initialName, initialPhone }: { initialName: string; initialPhone: string }) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(formatPhone(initialPhone));
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [INSTRUCTION_CONTACT_NAME]: name.trim(), [INSTRUCTION_CONTACT_PHONE]: formatPhone(phone) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Contacto de la carta de instrucciones guardado.");
    } catch {
      toast.error("No se pudo guardar el contacto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base sm:text-lg">Contacto en la carta de instrucciones</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Sale siempre en los cuadros de carga y de descarga de la carta de instrucciones. Si se deja vacío, sale el contacto del cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ic-name">Nombre</Label>
            <Input id="ic-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ic-phone">Teléfono</Label>
            <PhoneInput id="ic-phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
