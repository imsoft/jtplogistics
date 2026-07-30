"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUpload } from "@/components/ui/avatar-upload";

export default function VendorProfilePage() {
  const DEFAULT_NOTES = "- Estadías\n- Reparto";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [image, setImage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    const [profileRes, notesRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/vendor/notes"),
    ]);
    if (!profileRes.ok) return;
    const data = await profileRes.json();
    setName(data.name ?? "");
    setEmail(data.email ?? "");
    setBirthDate(data.birthDate ?? "");
    setImage(data.image ?? null);
    if (notesRes.ok) {
      const notesData = await notesRes.json();
      setNotes(notesData.notes ?? DEFAULT_NOTES);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    try {
      const [profileRes, notesRes] = await Promise.all([
        fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), birthDate: birthDate || null }),
        }),
        fetch("/api/vendor/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        }),
      ]);
      if (!profileRes.ok) {
        const err = await profileRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar");
      }
      if (!notesRes.ok) {
        const err = await notesRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar notas");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-w-0 space-y-4">
        <h1 className="page-heading">Mi perfil</h1>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Mi perfil</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Actualiza tu información, foto de perfil y notas de servicios.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Perfil guardado correctamente.</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="flex items-center gap-4">
          <AvatarUpload
            currentImage={image}
            name={name}
            endpoint="/api/profile/avatar"
            size={72}
          />
          <p className="text-muted-foreground text-xs">Haz clic en la foto para cambiarla</p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              required
              disabled={isLoading}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" disabled value={email} className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Fecha de nacimiento</Label>
            <DatePicker
              id="birthDate"
              disabled={isLoading}
              value={birthDate}
              onChange={(value) => setBirthDate(value)}
            />
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notas de servicios</Label>
          <Textarea
            id="notes"
            rows={5}
            disabled={isLoading}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground">
            Describe los servicios que ofreces. Esta información es visible para el administrador.
          </p>
        </div>

        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
