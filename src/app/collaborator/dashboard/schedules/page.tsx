"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ScheduleEditor } from "@/components/dashboard/time-clock/schedule-editor";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

/** Capturar horarios lo lleva RH; el resto de los colaboradores no entra. */
export default function CollaboratorSchedulesPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canManageSchedules && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/collaborator/dashboard");
    }
  }, [isLoaded, permissions, router]);

  if (!permissions?.canManageSchedules) return null;

  return <ScheduleEditor />;
}
