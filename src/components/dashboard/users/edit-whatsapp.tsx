"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EditWhatsapp({
  userId,
  initialPhone,
}: {
  userId: string;
  initialPhone: string | null;
}) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/whatsapp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappPhone: phone.trim() || null }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setIsEditing(false);
    } catch {
      setError("No se pudo guardar el número.");
    } finally {
      setIsLoading(false);
    }
  }

  const cleaned = phone.replace(/\D/g, "");
  const waUrl = cleaned ? `https://wa.me/${cleaned}` : null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">WhatsApp</p>
          <p className="text-muted-foreground text-xs">
            {phone.trim() ? phone.trim() : "Sin número registrado"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {waUrl && !isEditing && (
            <Button variant="outline" size="sm" asChild>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                <MessageCircle className="size-3.5" />
                Abrir
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing((v) => !v);
              setError(null);
            }}
          >
            {isEditing ? "Cancelar" : "Editar"}
          </Button>
        </div>
      </div>

      {isEditing && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            type="tel"
            placeholder="Ej: 5212345678900"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="button" size="sm" onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
