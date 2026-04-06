"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
import type { IncidentTypeDef } from "@/types/incident-type.types";
import { SortableUnitTypeRow } from "@/components/dashboard/unit-types/sortable-unit-type-row";

export default function IncidentTypesPage() {
  const [incidentTypes, setIncidentTypes] = useState<IncidentTypeDef[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<IncidentTypeDef | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/incident-types");
    if (res.ok) setIncidentTypes(await res.json());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveEdit(id: string) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/incident-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar.");
      }
      const updated: IncidentTypeDef = await res.json();
      setIncidentTypes((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setEditId(null);
      toast.success("Tipo de incidencia actualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  const persistOrder = useCallback(async (orderedIds: string[]) => {
    const res = await fetch("/api/admin/incident-types/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al guardar el orden.");
    }
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = incidentTypes.findIndex((t) => t.id === active.id);
    const newIndex = incidentTypes.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(incidentTypes, oldIndex, newIndex);
    setIncidentTypes(next);
    void persistOrder(next.map((t) => t.id))
      .then(() => toast.success("Orden actualizado."))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar el orden.");
        void load();
      });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/incident-types/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al eliminar.");
      }
      setIncidentTypes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success("Tipo de incidencia eliminado.");
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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Tipos de incidencia</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Gestiona los tipos de incidencia disponibles al registrar embarques y finanzas.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-fit" size="sm">
          <Link href="/admin/dashboard/incident-types/new">
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
            Arrastra el ícono de la izquierda para definir el orden en listas y formularios. Haz clic en el lápiz
            para editar el nombre. El valor (identificador) no se puede cambiar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!isLoaded ? (
            <p className="text-muted-foreground p-4 text-sm">Cargando…</p>
          ) : incidentTypes.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">No hay tipos de incidencia registrados.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={incidentTypes.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y">
                  {incidentTypes.map((t) => (
                    <SortableUnitTypeRow key={t.id} id={t.id} disabled={editId !== null}>
                      {editId === t.id ? (
                        <>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 flex-1"
                            disabled={isSaving}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(t.id);
                              if (e.key === "Escape") setEditId(null);
                            }}
                          />
                          <span className="text-muted-foreground shrink-0 font-mono text-xs">{t.value}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-green-600 hover:text-green-700"
                            onClick={() => handleSaveEdit(t.id)}
                            disabled={isSaving}
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditId(null)} disabled={isSaving}>
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">{t.name}</span>
                          <span className="text-muted-foreground shrink-0 font-mono text-xs">{t.value}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Editar"
                            onClick={() => {
                              setEditId(t.id);
                              setEditName(t.name);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Eliminar"
                            onClick={() => setDeleteTarget(t)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </SortableUnitTypeRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de incidencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteTarget?.name}</strong> ({deleteTarget?.value}). Solo se puede eliminar si
              ningún embarque ni registro de finanzas lo usa.
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
