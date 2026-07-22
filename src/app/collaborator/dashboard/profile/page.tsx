"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { DataTableSkeleton } from "@/components/ui/skeletons";

export default function CollaboratorProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [position, setPosition] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (!res.ok) return;
    const data = await res.json();
    setName(data.name ?? "");
    setEmail(data.email ?? "");
    setBirthDate(data.birthDate ?? "");
    setPosition(data.position ?? null);
    setDepartment(data.department ?? null);
    setImage(data.image ?? null);
    setIsLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), birthDate: birthDate || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar");
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
      <div className="min-w-0 space-y-4 sm:space-y-6">
        <div>
          <h1 className="page-heading">Mi perfil</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Información de tu cuenta.
          </p>
        </div>
        <Separator />
        <DataTableSkeleton />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-heading">Mi perfil</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Actualiza tu nombre, fecha de nacimiento y foto de perfil.
        </p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <AvatarUpload
              currentImage={image}
              name={name}
              endpoint="/api/profile/avatar"
              size={80}
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide">{name}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Haz clic en la foto para cambiarla
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" disabled value={email} className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  disabled={isLoading}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Área</Label>
                <Input id="department" disabled value={department ?? ""} className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Puesto</Label>
                <Input id="position" disabled value={position ?? ""} className="bg-muted" />
              </div>
            </div>

            {error && (
              <p className="text-xs font-semibold uppercase tracking-wide text-destructive">{error}</p>
            )}
            {success && (
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                Perfil actualizado correctamente.
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
