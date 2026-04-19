"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

type ApiResponse = {
  conversation_id: string;
  message: string;
  action: string;
  temperature: string;
  score: number;
};

const OPEN_SIZE = { w: 400, h: 620 };
const CLOSED_SIZE = { w: 96, h: 96 };

type Tracking = {
  source_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

type WidgetClientProps = {
  botId: string;
  botName: string;
  visitorId: string;
  color: string;
  greeting: string | null;
  position: "left" | "right";
  tracking: Tracking;
};

export function WidgetClient({
  botId,
  botName,
  visitorId,
  color,
  greeting,
  position,
  tracking,
}: WidgetClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    postParent({ type: "configure", position });
  }, [position]);

  useEffect(() => {
    postParent({
      type: "resize",
      width: isOpen ? OPEN_SIZE.w : CLOSED_SIZE.w,
      height: isOpen ? OPEN_SIZE.h : CLOSED_SIZE.h,
    });
  }, [isOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: botId,
          conversation_id: conversationId,
          visitor_id: visitorId || "anonymous",
          message: trimmed,
          ...(conversationId ? {} : cleanTracking(tracking)),
        }),
      });
      if (!res.ok) throw new Error("chat request failed");
      const data = (await res.json()) as ApiResponse;
      setConversationId(data.conversation_id);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.message },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Tive um problema de conexão. Pode tentar de novo?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const cssVars = { ["--widget-primary" as string]: color } as React.CSSProperties;
  const alignSide = position === "left" ? "left-4" : "right-4";
  const cardAlign = position === "left" ? "left-2" : "right-2";

  if (!isOpen) {
    return (
      <button
        type="button"
        aria-label="Abrir chat"
        onClick={() => setIsOpen(true)}
        style={cssVars}
        className={cn(
          "fixed bottom-4 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
          alignSide,
          "bg-[var(--widget-primary)]"
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      style={cssVars}
      className={cn(
        "fixed bottom-2 flex h-[604px] w-[384px] flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/40",
        cardAlign
      )}
    >
      <header className="flex items-center justify-between border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-accent" />
          <span className="font-medium">{botName}</span>
        </div>
        <button
          type="button"
          aria-label="Fechar chat"
          onClick={() => setIsOpen(false)}
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-background/40 px-4 py-4"
      >
        {messages.length === 0 && !loading && (
          <Greeting text={greeting ?? `Oi! Eu sou a ${botName}. Em que posso te ajudar?`} />
        )}
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.content}
          </Bubble>
        ))}
        {loading && <TypingIndicator />}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border/60 bg-card/80 px-3 py-3 backdrop-blur"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva sua mensagem..."
          disabled={loading}
          className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={loading || input.trim().length === 0}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--widget-primary)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      <p className="bg-card/80 px-4 pb-2 text-[10px] text-muted-foreground">
        Powered by Nerva<span style={{ color }}>.</span>
      </p>
    </div>
  );
}

function Greeting({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
          role === "user"
            ? "rounded-br-sm bg-[var(--widget-primary)] text-white"
            : "rounded-bl-sm bg-secondary text-foreground"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-secondary px-3 py-2.5 text-foreground">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-muted-foreground"
      style={{ animationDelay: delay }}
    />
  );
}

function cleanTracking(t: Tracking): Partial<Tracking> {
  const out: Partial<Tracking> = {};
  (Object.keys(t) as (keyof Tracking)[]).forEach((k) => {
    const v = t[k];
    if (v && v.length > 0) out[k] = v;
  });
  return out;
}

type ParentMessage =
  | { type: "resize"; width: number; height: number }
  | { type: "configure"; position: "left" | "right" };

function postParent(msg: ParentMessage) {
  if (typeof window === "undefined") return;
  try {
    window.parent.postMessage({ source: "nerva", ...msg }, "*");
  } catch (_) {
    // ignore — standalone page
  }
}
