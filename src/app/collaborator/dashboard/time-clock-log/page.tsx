"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TimeClockLog } from "@/components/dashboard/time-clock/time-clock-log";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

/** El registro de todos: RH lo ve, el resto de los colaboradores no. */
export default function CollaboratorTimeClockLogPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewTimeClock && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/collaborator/dashboard");
    }
  }, [isLoaded, permissions, router]);

  if (!permissions?.canViewTimeClock) return null;

  return <TimeClockLog />;
}
