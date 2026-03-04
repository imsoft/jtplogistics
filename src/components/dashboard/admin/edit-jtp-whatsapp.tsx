"use client";

import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function EditJtpWhatsapp() {
  const [phone, setPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.jtp_whatsapp) setPhone(data.jtp_whatsapp);
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, []);

  async function handleSave() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jtp_whatsapp: phone.trim() }),
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

  const cleaned = phone.replace(/\D/g, "");
  const waUrl = cleaned ? `https://wa.me/${cleaned}` : null;

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
                {phone.trim() ? phone.trim() : <span className="text-muted-foreground">Sin número configurado</span>}
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

          </>
        )}
      </CardContent>
    </Card>
  );
}
