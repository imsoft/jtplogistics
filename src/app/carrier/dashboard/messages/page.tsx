"use client";

import { useSession } from "@/lib/auth-client";
import { ChatWindow } from "@/components/dashboard/messages/chat-window";

export default function CarrierMessagesPage() {
  const { data: session } = useSession();

  if (!session) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="min-w-0 flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <div className="mb-4">
        <h1 className="page-heading">Mensajes</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Chatea con el equipo de compras de JTP Logistics.
        </p>
      </div>

      <div className="flex-1 min-h-0 rounded-lg border overflow-hidden">
        <ChatWindow
          carrierId={session.user.id}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
