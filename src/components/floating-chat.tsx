"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, ChevronLeft } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { ChatWindow } from "@/components/dashboard/messages/chat-window";
import { ConversationList } from "@/components/dashboard/messages/conversation-list";
import { Button } from "@/components/ui/button";
import { TeamChat, useTeamUnread } from "@/components/dashboard/team-chat/team-chat";
import { cn } from "@/lib/utils";

type FloatingChatProps = {
  placement?: "floating" | "header";
};

export function FloatingChat({ placement = "floating" }: FloatingChatProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [selectedCarrierName, setSelectedCarrierName] = useState("");
  // Para el transportista: de qué empresa es la conversación y si puede usarla.
  // Un usuario agregado sin permiso de mensajes no ve el chat.
  const [carrierChat, setCarrierChat] = useState<{ carrierId: string; canMessage: boolean } | null>(null);
  const sessionRole = (session?.user as { role?: string } | undefined)?.role;
  const staff = sessionRole === "admin" || sessionRole === "collaborator";
  // Equipo (colaboradores) o Transportistas. El de transportistas solo con su permiso.
  const [tab, setTab] = useState<"team" | "carriers">("team");
  const [collaboratorCarrierChat, setCollaboratorCarrierChat] = useState(false);
  const canCarrierChat = sessionRole === "admin" || collaboratorCarrierChat;
  const teamUnread = useTeamUnread(staff);

  useEffect(() => {
    if (sessionRole !== "collaborator") return;
    fetch("/api/collaborator/permissions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { canViewMessages?: boolean } | null) => setCollaboratorCarrierChat(Boolean(d?.canViewMessages)))
      .catch(() => {});
  }, [sessionRole]);

  useEffect(() => {
    if (sessionRole !== "carrier") return;
    fetch("/api/carrier/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { carrierId: string; can: { message: boolean } } | null) => {
        if (d) setCarrierChat({ carrierId: d.carrierId, canMessage: d.can.message });
      })
      .catch(() => {});
  }, [sessionRole]);

  if (!session) return null;

  const role = (session.user as { role?: string }).role ?? "";
  const isStaff = role === "admin" || role === "collaborator";
  const isCarrier = role === "carrier";

  if (!isStaff && !isCarrier) return null;
  if (isCarrier && !carrierChat?.canMessage) return null;

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
            {isStaff && tab === "carriers" && selectedCarrierId ? (
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

          {isStaff && canCarrierChat && (
            <div className="flex shrink-0 gap-1 border-b p-1.5" role="tablist" aria-label="Tipo de conversación">
              {(
                [
                  ["team", `Equipo${teamUnread > 0 ? ` (${teamUnread})` : ""}`],
                  ["carriers", "Transportistas"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold tracking-wide transition-colors",
                    tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Contenido */}
          <div className="flex-1 min-h-0">
            {isStaff && (tab === "team" || !canCarrierChat) ? (
              <TeamChat compact currentUserId={session.user.id} />
            ) : isCarrier ? (
              <ChatWindow
                carrierId={carrierChat?.carrierId ?? session.user.id}
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
          {!isOpen && teamUnread > 0 && (
            <span
              className="bg-destructive absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              aria-label={`${teamUnread} mensajes sin leer`}
            >
              {teamUnread > 99 ? "99+" : teamUnread}
            </span>
          )}
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
