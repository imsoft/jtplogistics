"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Separator } from "@/components/ui/separator";
import { ConversationList } from "@/components/dashboard/messages/conversation-list";
import { ChatWindow } from "@/components/dashboard/messages/chat-window";
import { Button } from "@/components/ui/button";

export function StaffMessagesView() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const initialCarrierId = searchParams.get("carrierId");
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [selectedCarrierName, setSelectedCarrierName] = useState<string>("");

  if (!session) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  function handleSelect(carrierId: string, carrierName: string) {
    setSelectedCarrierId(carrierId);
    setSelectedCarrierName(carrierName);
  }

  function handleBack() {
    setSelectedCarrierId(null);
    setSelectedCarrierName("");
  }

  return (
    <div className="min-w-0 flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <div className="mb-4">
        <h1 className="page-heading">Mensajes</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Conversaciones con transportistas.
        </p>
        <Separator className="mt-4" />
      </div>

      <div className="flex-1 min-h-0 rounded-lg border overflow-hidden flex">

        {/* Panel izquierdo: lista (siempre visible en desktop, oculto en móvil si hay chat abierto) */}
        <div
          className={`flex flex-col border-r w-full sm:w-72 shrink-0 ${
            selectedCarrierId ? "hidden sm:flex" : "flex"
          }`}
        >
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Transportistas
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              selectedCarrierId={selectedCarrierId}
              onSelect={handleSelect}
              initialCarrierId={initialCarrierId}
            />
          </div>
        </div>

        {/* Panel derecho: chat */}
        <div
          className={`flex-1 min-w-0 flex flex-col ${
            selectedCarrierId ? "flex" : "hidden sm:flex"
          }`}
        >
          {selectedCarrierId ? (
            <>
              {/* Botón volver en móvil */}
              <div className="flex items-center gap-2 border-b px-3 py-2 sm:hidden">
                <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Volver">
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-medium">{selectedCarrierName}</span>
              </div>
              <div className="flex-1 min-h-0">
                <ChatWindow
                  carrierId={selectedCarrierId}
                  currentUserId={session.user.id}
                  title={selectedCarrierName}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare className="size-10 opacity-20" />
              <p className="text-sm">Selecciona un transportista para ver su conversación</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
