"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, ChevronLeft } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { ChatWindow } from "@/components/dashboard/messages/chat-window";
import { ConversationList } from "@/components/dashboard/messages/conversation-list";
import { Button } from "@/components/ui/button";

type FloatingChatProps = {
  placement?: "floating" | "header";
};

export function FloatingChat({ placement = "floating" }: FloatingChatProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [selectedCarrierName, setSelectedCarrierName] = useState("");

  if (!session) return null;

  const role = (session.user as { role?: string }).role ?? "";
  const isStaff = role === "admin" || role === "collaborator";
  const isCarrier = role === "carrier";

  if (!isStaff && !isCarrier) return null;

  // Hide on messages pages since the user is already there
  if (pathname.includes("/messages")) return null;

  function handleSelect(carrierId: string, carrierName: string) {
    setSelectedCarrierId(carrierId);
    setSelectedCarrierName(carrierName);
  }

  function handleBack() {
    setSelectedCarrierId(null);
    setSelectedCarrierName("");
  }

  const isHeaderPlacement = placement === "header";

  return (
    <div
      className={
        isHeaderPlacement
          ? "relative z-50 flex flex-col items-end gap-2"
          : "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
      }
    >
      {/* Panel expandido */}
      {isOpen && (
        <div
          className={
            isHeaderPlacement
              ? "absolute right-0 top-11 w-80 rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden sm:w-96"
              : "w-80 rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden sm:w-96"
          }
          style={{ height: 480 }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-4 py-2.5 shrink-0">
            {isStaff && selectedCarrierId ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors min-w-0"
              >
                <ChevronLeft className="size-4 shrink-0" />
                <span className="truncate">{selectedCarrierName}</span>
              </button>
            ) : (
              <span className="text-sm font-semibold flex-1">Mensajes</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 ml-auto shrink-0"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-h-0">
            {isCarrier ? (
              <ChatWindow
                carrierId={session.user.id}
                currentUserId={session.user.id}
              />
            ) : selectedCarrierId ? (
              <ChatWindow
                carrierId={selectedCarrierId}
                currentUserId={session.user.id}
              />
            ) : (
              <div className="overflow-y-auto h-full">
                <ConversationList
                  selectedCarrierId={selectedCarrierId}
                  onSelect={handleSelect}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {isHeaderPlacement ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "Cerrar chat" : "Abrir chat"}
          className="relative shrink-0"
        >
          {isOpen ? <X className="size-4" /> : <MessageSquare className="size-4" />}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "Cerrar chat" : "Abrir chat"}
          className="size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        >
          {isOpen ? (
            <X className="size-5" />
          ) : (
            <MessageSquare className="size-6" />
          )}
        </button>
      )}
    </div>
  );
}
