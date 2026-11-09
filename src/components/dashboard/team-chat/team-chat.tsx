"use client";

/**
 * Chat entre colaboradores (admin y colaboradores): conversaciones directas y
 * grupos. Se usa en el panel del ícono de mensajes (compacto: lista o chat) y
 * en la página de Mensajes (lista y chat lado a lado). Consulta cada pocos
 * segundos solo con la pestaña a la vista, para no gastar la base de datos.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2, LogOut, MessageSquarePlus, MoreVertical, Pencil, Send, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CardListSkeleton, ChatSkeleton } from "@/components/ui/skeletons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import { cn } from "@/lib/utils";
import { normalizeSearch } from "@/lib/search";
import { initials } from "@/lib/team-chat";

interface Person {
  id: string;
  name: string;
  image: string | null;
}

interface Chat {
  id: string;
  kind: "direct" | "group";
  title: string;
  members: Person[];
  lastMessage: { body: string; createdAt: string; senderName: string | null; mine: boolean } | null;
  unread: number;
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  senderId: string | null;
  senderName: string;
}

async function send<T = unknown>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
  return data;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  return `${Math.floor(hrs / 24)} d`;
}

function Avatar({ chat, size = "md" }: { chat: Pick<Chat, "kind" | "title">; size?: "md" | "sm" }) {
  return (
    <span
      className={cn(
        "bg-primary/10 text-primary flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "md" ? "size-9 text-xs" : "size-7 text-[10px]"
      )}
      aria-hidden
    >
      {chat.kind === "group" ? <Users className={size === "md" ? "size-4" : "size-3.5"} /> : initials(chat.title)}
    </span>
  );
}

/** Total de no leídos del chat de equipo, para el contador del ícono. */
export function useTeamUnread(enabled: boolean) {
  const [total, setTotal] = useState(0);
  const fetchTotal = useCallback(() => {
    if (!enabled) return;
    return fetch("/api/team-chat/unread")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { total: number } | null) => d && setTotal(d.total))
      .catch(() => {});
  }, [enabled]);
  useVisiblePolling(fetchTotal, 15000);
  return total;
}

// ── Lista de conversaciones ────────────────────────────────────────────

function ChatList({
  chats,
  selectedId,
  onSelect,
  onNew,
}: {
  chats: Chat[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: (mode: "direct" | "group") => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-2 border-b p-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onNew("direct")}>
          <MessageSquarePlus className="size-4" />
          Nuevo
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onNew("group")}>
          <Users className="size-4" />
          Grupo
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {chats === null ? (
          <CardListSkeleton cards={4} lines={1} withAvatar className="p-3" />
        ) : chats.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 p-8 text-center text-sm">
            <Users className="size-8 opacity-30" />
            <p>Todavía no tienes conversaciones. Escríbele a un compañero o crea un grupo.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {chats.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={cn("hover:bg-muted/60 w-full px-3 py-2.5 text-left transition-colors", c.id === selectedId && "bg-muted")}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar chat={c} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm", c.unread > 0 ? "font-bold" : "font-medium")}>{c.title}</span>
                        {c.lastMessage && <span className="text-muted-foreground shrink-0 text-[10px]">{timeAgo(c.lastMessage.createdAt)}</span>}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("truncate text-xs", c.unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                          {c.lastMessage
                            ? `${c.lastMessage.mine ? "Tú" : c.kind === "group" ? (c.lastMessage.senderName ?? "") : ""}${c.lastMessage.mine || c.kind === "group" ? ": " : ""}${c.lastMessage.body}`
                            : c.kind === "group"
                              ? `${c.members.length} personas`
                              : "Sin mensajes"}
                        </p>
                        {c.unread > 0 && (
                          <span className="bg-primary text-primary-foreground flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
                            {c.unread > 99 ? "99+" : c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Ventana de una conversación ────────────────────────────────────────

function ChatWindow({
  chat,
  currentUserId,
  onBack,
  onChanged,
  onLeft,
  onManage,
}: {
  chat: Chat;
  currentUserId: string;
  onBack?: () => void;
  onChanged: () => void;
  onLeft: () => void;
  onManage: (mode: "rename" | "add") => void;
}) {
  const confirm = useConfirm();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastCount = useRef(0);

  const fetchMessages = useCallback(
    () =>
      fetch(`/api/team-chat/chats/${chat.id}/messages`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Message[] | null) => {
          if (d) setMessages(d);
        })
        .catch(() => {}),
    [chat.id]
  );
  useVisiblePolling(fetchMessages, 4000);

  // Baja al último solo cuando llega algo nuevo.
  useEffect(() => {
    if (messages && messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  async function handleSend() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await send(`/api/team-chat/chats/${chat.id}/messages`, "POST", { body });
      setText("");
      await fetchMessages();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  async function leave() {
    const ok = await confirm({
      title: `¿Salir de ${chat.title}?`,
      description: "Dejas de ver sus mensajes. Alguien del grupo puede volver a agregarte.",
      confirmLabel: "Salir del grupo",
      destructive: true,
    });
    if (!ok) return;
    try {
      await send(`/api/team-chat/chats/${chat.id}`, "PATCH", { leave: true });
      toast.success("Saliste del grupo.");
      onLeft();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo salir.");
    }
  }

  const grouped = useMemo(() => {
    const out: { date: string; items: Message[] }[] = [];
    for (const m of messages ?? []) {
      const date = new Date(m.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
      const last = out[out.length - 1];
      if (last && last.date === date) last.items.push(m);
      else out.push({ date, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-2 py-2">
        {onBack && (
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onBack} aria-label="Volver a las conversaciones">
            <ChevronLeft className="size-4" />
          </Button>
        )}
        <Avatar chat={chat} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{chat.title}</p>
          {chat.kind === "group" && (
            <p className="text-muted-foreground truncate text-[11px]" title={chat.members.map((m) => m.name).join(", ")}>
              {chat.members.length} personas · {chat.members.map((m) => m.name.split(" ")[0]).join(", ")}
            </p>
          )}
        </div>
        {chat.kind === "group" && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Opciones de ${chat.title}`}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onManage("add")}>
                <UserPlus className="size-4" />
                Agregar personas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManage("rename")}>
                <Pencil className="size-4" />
                Cambiar nombre
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={leave}>
                <LogOut className="size-4" />
                Salir del grupo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {messages === null ? (
          <ChatSkeleton messages={4} />
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground pt-8 text-center text-sm">No hay mensajes aún. ¡Escribe el primero!</p>
        ) : (
          grouped.map(({ date, items }) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="bg-border h-px flex-1" />
                <span className="text-muted-foreground shrink-0 text-xs">{date}</span>
                <div className="bg-border h-px flex-1" />
              </div>
              {items.map((m, i) => {
                const mine = m.senderId === currentUserId;
                const showName = !mine && chat.kind === "group" && items[i - 1]?.senderId !== m.senderId;
                return (
                  <div key={m.id} className={cn("flex flex-col gap-0.5", mine ? "items-end" : "items-start")}>
                    {showName && <span className="text-muted-foreground px-1 text-xs">{m.senderName}</span>}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
                        mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                      )}
                    >
                      {m.body}
                    </div>
                    <span className="text-muted-foreground px-1 text-[10px]">
                      {new Date(m.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t p-2">
        <Textarea
          ref={textareaRef}
          aria-label="Escribe un mensaje"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          rows={1}
          className="max-h-32 min-h-9 flex-1 resize-none"
          disabled={sending}
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()} aria-label="Enviar mensaje" className="shrink-0">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

// ── Diálogos: nueva conversación, grupo, renombrar, agregar ─────────────

type DialogMode = { kind: "direct" } | { kind: "group" } | { kind: "rename"; chat: Chat } | { kind: "add"; chat: Chat };

function PeoplePicker({
  people,
  exclude,
  selected,
  onToggle,
  single,
}: {
  people: Person[] | null;
  exclude?: string[];
  selected: string[];
  onToggle: (id: string) => void;
  single?: boolean;
}) {
  const [q, setQ] = useState("");
  const list = (people ?? []).filter((p) => !exclude?.includes(p.id) && normalizeSearch(p.name).includes(normalizeSearch(q)));
  return (
    <div className="space-y-2">
      <Input aria-label="Buscar compañero" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="text-muted-foreground text-xs">Busca por nombre.</p>
      <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
        {people === null ? (
          <CardListSkeleton cards={3} lines={1} withAvatar className="p-2" />
        ) : list.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">Nadie coincide.</p>
        ) : (
          list.map((p) =>
            single ? (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggle(p.id)}
                className="hover:bg-muted/60 flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
              >
                <Avatar chat={{ kind: "direct", title: p.name }} size="sm" />
                {p.name}
              </button>
            ) : (
              <label key={p.id} className="hover:bg-muted/60 flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => onToggle(p.id)} />
                <Avatar chat={{ kind: "direct", title: p.name }} size="sm" />
                {p.name}
              </label>
            )
          )
        )}
      </div>
    </div>
  );
}

function ChatDialog({
  mode,
  onClose,
  onDone,
}: {
  mode: DialogMode | null;
  onClose: () => void;
  /** Id del chat creado o modificado, para abrirlo. */
  onDone: (chatId: string) => void;
}) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<DialogMode | null>(null);

  // Al abrir con otro modo se reinicia el formulario (sin efecto: durante el render).
  if (mode !== openedFor) {
    setOpenedFor(mode);
    setSelected([]);
    setName(mode?.kind === "rename" ? mode.chat.title : "");
  }

  useEffect(() => {
    if (!mode || mode.kind === "rename" || people) return;
    fetch("/api/team-chat/people")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Person[]) => setPeople(d))
      .catch(() => setPeople([]));
  }, [mode, people]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    try {
      onDone(await fn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  const startDirect = (userId: string) =>
    run(async () => (await send<{ id: string }>("/api/team-chat/chats", "POST", { kind: "direct", userId })).id);

  const submit = () => {
    if (!mode) return;
    if (mode.kind === "group") {
      return run(async () => {
        const r = await send<{ id: string }>("/api/team-chat/chats", "POST", { kind: "group", name, memberIds: selected });
        toast.success("Grupo creado.");
        return r.id;
      });
    }
    if (mode.kind === "rename") {
      return run(async () => {
        await send(`/api/team-chat/chats/${mode.chat.id}`, "PATCH", { name });
        toast.success("Nombre actualizado.");
        return mode.chat.id;
      });
    }
    if (mode.kind === "add") {
      return run(async () => {
        await send(`/api/team-chat/chats/${mode.chat.id}`, "PATCH", { addMemberIds: selected });
        toast.success(selected.length === 1 ? "Persona agregada." : "Personas agregadas.");
        return mode.chat.id;
      });
    }
  };

  const titles: Record<DialogMode["kind"], [string, string]> = {
    direct: ["Nuevo mensaje", "Elige con quién quieres hablar."],
    group: ["Nuevo grupo", "Ponle nombre y elige quiénes estarán. Tú quedas dentro."],
    rename: ["Cambiar nombre del grupo", "Todos los del grupo verán el nombre nuevo."],
    add: ["Agregar personas", "Verán los mensajes anteriores del grupo."],
  };
  const [title, description] = mode ? titles[mode.kind] : ["", ""];
  const canSubmit =
    mode?.kind === "group" ? name.trim().length >= 2 && selected.length > 0 : mode?.kind === "rename" ? name.trim().length >= 2 : selected.length > 0;

  return (
    <Dialog open={mode !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {(mode?.kind === "group" || mode?.kind === "rename") && (
          <div className="space-y-2">
            <Label htmlFor="team-chat-name">Nombre del grupo</Label>
            <Input id="team-chat-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            <p className="text-muted-foreground text-xs">Finanzas, Operaciones, Embarques de Indorama…</p>
          </div>
        )}

        {mode?.kind === "direct" && <PeoplePicker people={people} selected={[]} onToggle={startDirect} single />}
        {(mode?.kind === "group" || mode?.kind === "add") && (
          <PeoplePicker
            people={people}
            exclude={mode.kind === "add" ? mode.chat.members.map((m) => m.id) : undefined}
            selected={selected}
            onToggle={toggle}
          />
        )}

        {mode?.kind !== "direct" && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={busy || !canSubmit}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode?.kind === "group" ? "Crear grupo" : mode?.kind === "rename" ? "Guardar nombre" : "Agregar"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ───────────────────────────────────────────────

/**
 * `compact`: una cosa a la vez (lista o chat), para el panel del ícono.
 * Si no, lista y chat lado a lado (página de Mensajes).
 */
export function TeamChat({ currentUserId, compact = false }: { currentUserId: string; compact?: boolean }) {
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode | null>(null);

  const fetchChats = useCallback(
    () =>
      fetch("/api/team-chat/chats")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Chat[] | null) => {
          if (d) setChats(d);
        })
        .catch(() => {}),
    []
  );
  useVisiblePolling(fetchChats, 5000);

  const selected = chats?.find((c) => c.id === selectedId) ?? null;

  const open = (id: string) => {
    setSelectedId(id);
    // El contador se limpia al leer: se refresca la lista enseguida.
    setChats((list) => list?.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) ?? list);
  };

  const list = <ChatList chats={chats} selectedId={selectedId} onSelect={open} onNew={(kind) => setDialog({ kind })} />;
  const chatPane =
    selected &&
    (
      <ChatWindow
        key={selected.id}
        chat={selected}
        currentUserId={currentUserId}
        onBack={compact ? () => setSelectedId(null) : undefined}
        onChanged={fetchChats}
        onLeft={() => {
          setSelectedId(null);
          void fetchChats();
        }}
        onManage={(kind) => setDialog({ kind, chat: selected })}
      />
    );

  return (
    <>
      {compact ? (
        <div className="h-full">{chatPane ?? list}</div>
      ) : (
        <div className="flex h-full min-h-0">
          <div className={cn("w-full shrink-0 border-r sm:w-72", selected ? "hidden sm:block" : "block")}>{list}</div>
          <div className={cn("min-w-0 flex-1", selected ? "block" : "hidden sm:flex")}>
            {chatPane ?? (
              <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <Users className="size-10 opacity-20" />
                <p className="text-sm">Elige una conversación o empieza una nueva.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ChatDialog
        mode={dialog}
        onClose={() => setDialog(null)}
        onDone={(id) => {
          setDialog(null);
          void fetchChats().then(() => open(id));
        }}
      />
    </>
  );
}
