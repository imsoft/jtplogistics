"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

export default function NewUnitTypePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/unit-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al crear.");
      }
      toast.success("Tipo de unidad creado.");
      router.push("/admin/dashboard/unit-types");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="-ml-1">
          <Link href="/admin/dashboard/unit-types" aria-label="Volver">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Nuevo tipo de unidad</h1>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            El identificador interno se genera automáticamente a partir del nombre.
          </p>
        </div>
      </div>
      <Separator />
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg">Datos del tipo</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Ingresa el nombre. El valor (slug) se asignará de forma automática.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Caja seca 53'"
                required
                disabled={isCreating}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" asChild disabled={isCreating}>
                <Link href="/admin/dashboard/unit-types">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={isCreating} className="gap-2">
                <Plus className="size-4" />
                {isCreating ? "Creando…" : "Crear tipo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
