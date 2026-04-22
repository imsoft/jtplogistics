"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

interface ChatWindowProps {
  /** ID del transportista cuya conversación se muestra */
  carrierId: string;
  /** ID del usuario actual (para saber qué mensajes son "propios") */
  currentUserId: string;
  /** Título visible arriba del chat (nombre del transportista o "Mi conversación") */
  title?: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ChatWindow({ carrierId, currentUserId, title }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?carrierId=${carrierId}`);
    if (res.ok) {
      const data: ChatMessage[] = await res.json();
      setMessages(data);
    }
  }, [carrierId]);

  // Carga inicial + polling cada 4 s
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrierId, body: trimmed }),
      });
      if (res.ok) {
        setText("");
        await fetchMessages();
      }
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Agrupa mensajes por fecha para mostrar separadores
  const grouped: { date: string; messages: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      grouped.push({ date, messages: [msg] });
    }
  }

  return (
    <div className="flex h-full flex-col">
      {title && (
        <div className="border-b px-4 py-3">
          <p className="font-semibold text-sm">{title}</p>
        </div>
      )}

      {/* Área de mensajes */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground pt-8">
            No hay mensajes aún. ¡Escribe el primero!
          </p>
        )}

        {grouped.map(({ date, messages: dayMsgs }) => (
          <div key={date} className="space-y-2">
            {/* Separador de fecha */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground shrink-0">{date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {dayMsgs.map((msg) => {
              const isOwn = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}
                >
                  {/* Nombre del remitente (solo si no es propio) */}
                  {!isOwn && (
                    <span className="text-xs text-muted-foreground px-1">
                      {msg.senderName}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="min-h-9 max-h-32 resize-none flex-1"
          disabled={isSending}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={isSending || !text.trim()}
          aria-label="Enviar mensaje"
          className="shrink-0"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
