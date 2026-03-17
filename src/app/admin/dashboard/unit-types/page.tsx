"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import type { UnitTypeDef } from "@/types/unit-type.types";

export default function UnitTypesPage() {
  const [unitTypes, setUnitTypes] = useState<UnitTypeDef[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UnitTypeDef | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/unit-types");
    if (res.ok) setUnitTypes(await res.json());
    setIsLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSaveEdit(id: string) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/unit-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar.");
      }
      const updated: UnitTypeDef = await res.json();
      setUnitTypes((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setEditId(null);
      toast.success("Tipo de unidad actualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/unit-types/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al eliminar.");
      }
      setUnitTypes((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success("Tipo de unidad eliminado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Tipos de unidades</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Gestiona los tipos de unidades disponibles al crear rutas.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-fit" size="sm">
          <Link href="/admin/dashboard/unit-types/new">
            <Plus className="size-4" />
            Nuevo tipo
          </Link>
        </Button>
      </div>
      <Separator />
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg">Tipos registrados</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Haz clic en el lápiz para editar el nombre. El valor (identificador) no se puede cambiar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!isLoaded ? (
            <p className="text-muted-foreground p-4 text-sm">Cargando…</p>
          ) : unitTypes.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">No hay tipos de unidades registrados.</p>
          ) : (
            <div className="divide-y">
              {unitTypes.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  {editId === u.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 flex-1"
                        disabled={isSaving}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(u.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                      />
                      <span className="text-muted-foreground shrink-0 font-mono text-xs">{u.value}</span>
                      <Button size="icon" variant="ghost" className="size-8 text-green-600 hover:text-green-700" onClick={() => handleSaveEdit(u.id)} disabled={isSaving}>
                        <Check className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditId(null)} disabled={isSaving}>
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{u.name}</span>
                      <span className="text-muted-foreground shrink-0 font-mono text-xs">{u.value}</span>
                      <Button size="icon" variant="ghost" className="size-8" aria-label="Editar" onClick={() => { setEditId(u.id); setEditName(u.name); }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Eliminar" onClick={() => setDeleteTarget(u)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de unidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteTarget?.name}</strong> ({deleteTarget?.value}). Solo se puede eliminar si ninguna ruta lo usa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
