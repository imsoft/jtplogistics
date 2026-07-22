"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { FormSkeleton } from "@/components/ui/skeletons";
import { EditRouteForm } from "@/components/dashboard/routes/edit-route-form";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import type { Route } from "@/types/route.types";

export default function EditCollaboratorRoutePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { permissions, isLoaded: permissionsLoaded } = useCollaboratorPermissions();
  const [route, setRoute] = useState<Route | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (permissionsLoaded && !permissions?.canUpdateRoutes && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/routes");
    }
  }, [permissionsLoaded, permissions, router]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/routes/${id}`);
    if (!res.ok) {
      setError("No se pudo cargar la ruta.");
      setIsLoaded(true);
      return;
    }
    setRoute(await res.json());
    setIsLoaded(true);
  }, [id]);

  useEffect(() => {
    if (permissionsLoaded && permissions?.canUpdateRoutes) load();
  }, [permissionsLoaded, permissions, load]);

  if (!permissionsLoaded || (permissions?.canUpdateRoutes && !isLoaded)) {
    return <FormSkeleton />;
  }
  if (!permissions?.canUpdateRoutes) return null;
  if (error || !route) {
    return <p className="text-sm text-destructive">{error ?? "No se encontró la ruta."}</p>;
  }

  return <EditRouteForm route={route} basePath="/collaborator/dashboard/routes" />;
}
