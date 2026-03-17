"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { useProfile } from "@/hooks/use-profile";
import { EditJtpWhatsapp } from "@/components/dashboard/admin/edit-jtp-whatsapp";

export default function AdminProfilePage() {
  const { data, isFetching, fetchError } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");

  useEffect(() => {
    if (data) {
      setName(data.name);
      setBirthDate(data.birthDate ?? "");
    }
  }, [data]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthDate: birthDate || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar.");
      }
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  if (fetchError) {
    return <p className="text-sm text-destructive">{fetchError}</p>;
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Mi perfil</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Información de tu cuenta de administrador.</p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <AvatarUpload
              currentImage={data?.image ?? null}
              name={data?.name ?? ""}
              endpoint="/api/profile/avatar"
              size={80}
            />
            <div>
              <p className="text-sm font-medium">{data?.name}</p>
              <p className="text-muted-foreground text-xs">Haz clic en la foto para cambiarla</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" value={data?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
            {success && <p className="text-sm text-green-600">Perfil actualizado correctamente.</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <EditJtpWhatsapp />
    </div>
  );
}
