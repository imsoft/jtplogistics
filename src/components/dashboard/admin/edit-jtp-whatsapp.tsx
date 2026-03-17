"use client";

import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { formatPhone } from "@/lib/utils";

export function EditJtpWhatsapp() {
  const [phone, setPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const raw = data.jtp_whatsapp ?? "";
        const digits = raw.replace(/\D/g, "");
        setPhone(digits.startsWith("52") && digits.length === 12 ? digits.slice(2) : digits);
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, []);

  function toFullNumber(digits: string): string {
    const d = digits.replace(/\D/g, "");
    if (d.length === 10) return `52${d}`;
    if (d.length === 12 && d.startsWith("52")) return d;
    return d;
  }

  async function handleSave() {
    setIsLoading(true);
    try {
      const full = toFullNumber(phone.trim());
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jtp_whatsapp: full || phone.trim() }),
      });
      if (!res.ok) throw new Error();
      setIsEditing(false);
      toast.success("Número guardado correctamente.");
    } catch {
      toast.error("No se pudo guardar el número.");
    } finally {
      setIsLoading(false);
    }
  }

  const full = toFullNumber(phone);
  const waUrl = full ? `https://wa.me/${full.replace(/\D/g, "")}` : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contacto WhatsApp JTP</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Número que verán los transportistas para contactar a JTP.
        </p>

        {isFetching ? (
          <p className="text-muted-foreground text-sm">Cargando…</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium">
                {phone.trim() ? formatPhone(phone.trim()) : <span className="text-muted-foreground">Sin número configurado</span>}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {waUrl && !isEditing && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                      <MessageCircle className="size-3.5" />
                      Probar
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing((v) => !v)}
                >
                  {isEditing ? "Cancelar" : "Editar"}
                </Button>
              </div>
            </div>

            {isEditing && (
              <div className="flex items-center gap-2">
                <Input
                  type="tel"
                  inputMode="numeric"
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

          </>
        )}
      </CardContent>
    </Card>
  );
}
