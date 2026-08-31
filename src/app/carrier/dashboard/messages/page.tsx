"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { ChatWindow } from "@/components/dashboard/messages/chat-window";
import { ChatSkeleton } from "@/components/ui/skeletons";

export default function CarrierMessagesPage() {
  const { data: session } = useSession();
  // Borrador prellenado vía ?draft= (p. ej. desde el enlace "contactar al gerente
  // de compras" en rutas pendientes/inactivas). Se lee una sola vez al montar.
  const [draft] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("draft") ?? ""
  );

  if (!session) {
    return <ChatSkeleton />;
  }

  return (
    <div className="min-w-0 flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <div className="mb-4">
        <h1 className="page-heading">Mensajes</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Chatea con el equipo de compras de JTP Logistics.
        </p>
      </div>

      <div className="flex-1 min-h-0 rounded-lg border overflow-hidden">
        <ChatWindow
          carrierId={session.user.id}
          currentUserId={session.user.id}
          initialText={draft}
        />
      </div>
    </div>
  );
}
