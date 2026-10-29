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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { INCIDENT_COLORS, incidentBadgeClass } from "@/lib/constants/incident-colors";
import { toast } from "sonner";
import type { IncidentTypeDef } from "@/types/incident-type.types";
import { SortableUnitTypeRow } from "@/components/dashboard/unit-types/sortable-unit-type-row";
import { CardListSkeleton } from "@/components/ui/skeletons";

export default function IncidentTypesPage() {
  const [incidentTypes, setIncidentTypes] = useState<IncidentTypeDef[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<IncidentTypeDef | null>(null);

  async function setColor(id: string, color: string) {
    const prev = incidentTypes;
    setIncidentTypes((list) => list.map((t) => (t.id === id ? { ...t, color } : t)));
    const res = await fetch(`/api/admin/incident-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    if (!res.ok) {
      setIncidentTypes(prev);
      toast.error("No se pudo cambiar el color.");
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(
    () =>
      fetch("/api/admin/incident-types").then(async (res) => {
        if (res.ok) setIncidentTypes(await res.json());
        setIsLoaded(true);
      }),
    []
  );

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
          <h1 className="page-heading">Tipos de incidencia</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
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
            <CardListSkeleton cards={4} lines={1} />
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
                          <span className="text-muted-foreground hidden shrink-0 font-mono text-xs sm:inline">{t.value}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-green-600 hover:text-green-700"
                            onClick={() => handleSaveEdit(t.id)}
                            disabled={isSaving}
                            aria-label="Guardar"
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditId(null)} disabled={isSaving} aria-label="Cancelar">
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {/* El color de la insignia de este tipo en tablas y fichas. */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${incidentBadgeClass(t.color)}`}
                              aria-label={`Color de ${t.name}`}
                              title="Cambiar color"
                            >
                              {INCIDENT_COLORS.find((c) => c.key === t.color)?.label ?? "Sin color"}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {INCIDENT_COLORS.map((c) => (
                                <DropdownMenuItem key={c.key} onClick={() => setColor(t.id, c.key)}>
                                  <span className={`size-3 rounded-full ${c.dot}`} />
                                  {c.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <span className="flex-1 font-medium">{t.name}</span>
                          <span className="text-muted-foreground hidden shrink-0 font-mono text-xs sm:inline">{t.value}</span>
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
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
