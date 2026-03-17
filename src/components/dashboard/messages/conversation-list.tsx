"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare } from "lucide-react";

export interface Conversation {
  carrierId: string;
  carrierName: string;
  carrierImage: string | null;
  lastMessage: {
    body: string;
    senderRole: string;
    senderName: string;
    createdAt: string;
  } | null;
}

interface ConversationListProps {
  selectedCarrierId: string | null;
  onSelect: (carrierId: string, carrierName: string) => void;
  initialCarrierId?: string | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  return `${Math.floor(hrs / 24)} d`;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ConversationList({ selectedCarrierId, onSelect, initialCarrierId }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/messages/conversations");
    if (res.ok) {
      const data: Conversation[] = await res.json();
      setConversations(data);
      setIsLoaded(true);
    }
  }, []);

  // Auto-seleccionar cuando carga si viene de notificación
  useEffect(() => {
    if (!isLoaded || autoSelected || !initialCarrierId || selectedCarrierId) return;
    const conv = conversations.find((c) => c.carrierId === initialCarrierId);
    if (conv) {
      onSelect(conv.carrierId, conv.carrierName);
      setAutoSelected(true);
    }
  }, [isLoaded, autoSelected, initialCarrierId, selectedCarrierId, conversations, onSelect]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  if (!isLoaded) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Cargando…</div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <MessageSquare className="size-8 opacity-30" />
        <p>No hay transportistas registrados.</p>
      </div>
    );
  }

  // Ordenar: primero los que tienen mensajes (más reciente primero), luego los que no
  const sorted = [...conversations].sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return a.carrierName.localeCompare(b.carrierName);
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
  });

  return (
    <div className="divide-y">
      {sorted.map((conv) => {
        const isSelected = conv.carrierId === selectedCarrierId;
        return (
          <button
            key={conv.carrierId}
            type="button"
            onClick={() => onSelect(conv.carrierId, conv.carrierName)}
            className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/60 ${
              isSelected ? "bg-muted" : ""
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar */}
              <div className="size-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {initials(conv.carrierName)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium truncate">{conv.carrierName}</span>
                  {conv.lastMessage && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {conv.lastMessage ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage.senderRole === "carrier"
                      ? conv.lastMessage.body
                      : `Tú: ${conv.lastMessage.body}`}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin mensajes</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
