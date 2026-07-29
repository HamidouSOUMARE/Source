"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Loader2, Quote, BookOpenText, Copy, Check, Wand2, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { streamQuery, type RefineKind } from "@/lib/client";
import {
  DEMO_MODE,
  DEMO_SCENARIOS,
  demoFallbackScenario,
  matchScenario,
  streamDemoAnswer,
} from "@/lib/demo";
import { useI18n, type I18nKey } from "@/lib/i18n";
import { Markdown } from "@/components/markdown";
import type { ChatMessage, Source, StreamEvent } from "@/lib/types";

const REFINE_OPTIONS: { kind: RefineKind; label: I18nKey }[] = [
  { kind: "shorter", label: "chat.refineShorter" },
  { kind: "longer", label: "chat.refineLonger" },
  { kind: "simpler", label: "chat.refineSimpler" },
];

interface Props {
  token: string | null;
  hasDocs: boolean;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export function ChatPanel({ token, hasDocs }: Props) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function runQuery(
    assistantId: string,
    question: string,
    refine?: { kind: RefineKind; previousAnswer: string },
  ) {
    if (!DEMO_MODE && !token) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));
    // Reset in case this is a re-run (refine).
    patch((m) => ({ ...m, content: "", sources: [], streaming: true }));

    const onEvent = (event: StreamEvent) => {
      switch (event.type) {
        case "text":
          patch((m) => ({ ...m, content: m.content + event.text }));
          break;
        case "citation":
          patch((m) =>
            m.sources.some(
              (s) =>
                s.chunkId === event.citation.chunkId && s.citedText === event.citation.citedText,
            )
              ? m
              : { ...m, sources: [...m.sources, event.citation] },
          );
          break;
        case "error":
          toast.error(event.error);
          break;
      }
    };

    try {
      if (DEMO_MODE) {
        const scenario = matchScenario(question) ?? demoFallbackScenario();
        await streamDemoAnswer(scenario, lang, onEvent, controller.signal);
      } else {
        await streamQuery(token!, question, onEvent, lang, refine, controller.signal);
      }
    } catch (err) {
      // User-initiated stop is not an error — keep the partial answer.
      if (!(err instanceof Error && err.name === "AbortError")) {
        toast.error(err instanceof Error ? err.message : t("chat.error"));
      }
    } finally {
      abortRef.current = null;
      patch((m) => ({ ...m, streaming: false }));
      setStreaming(false);
    }
  }

  async function send(preset?: string) {
    const question = (preset ?? input).trim();
    if (!question || streaming || (!DEMO_MODE && !token)) return;

    const assistantId = uid();
    if (!preset) setInput("");
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", content: question, sources: [] },
      { id: assistantId, role: "assistant", content: "", sources: [], streaming: true, question },
    ]);
    await runQuery(assistantId, question);
  }

  function refineAnswer(
    assistantId: string,
    question: string,
    previousAnswer: string,
    kind: RefineKind,
  ) {
    if (streaming || !token) return;
    runQuery(assistantId, question, { kind, previousAnswer });
  }

  function stop() {
    abortRef.current?.abort();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const canSend = !streaming && (DEMO_MODE || (hasDocs && !!token));
  const inputDisabled = !DEMO_MODE && (!hasDocs || !token);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/30">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 [mask-image:linear-gradient(to_bottom,transparent,#000_16px,#000_calc(100%-16px),transparent)] md:p-5">
        {messages.length === 0 ? (
          <EmptyState
            hasDocs={hasDocs || DEMO_MODE}
            onAsk={send}
            suggestions={DEMO_MODE ? DEMO_SCENARIOS.map((s) => s.q[lang]) : undefined}
          />
        ) : (
          <div className="space-y-8">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onSource={setActiveSource}
                onRefine={
                  m.question && !streaming && !DEMO_MODE
                    ? (kind) => refineAnswer(m.id, m.question!, m.content, kind)
                    : undefined
                }
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-card/40 p-3 md:p-4">
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-background p-2 transition-shadow focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/25">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={
              hasDocs || DEMO_MODE ? t("chat.placeholder.ready") : t("chat.placeholder.empty")
            }
            disabled={inputDisabled}
            className="max-h-40 min-h-10 resize-none border-0 bg-transparent text-[15px] shadow-none focus-visible:ring-0"
          />
          {streaming ? (
            <Button
              size="icon"
              onClick={stop}
              aria-label={t("chat.stop")}
              className="size-9 shrink-0 rounded-lg bg-brand text-brand-foreground hover:bg-[var(--brand-hover)]"
            >
              <Square className="size-3 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => send()}
              disabled={!canSend || !input.trim()}
              aria-label="Envoyer"
              className="size-9 shrink-0 rounded-lg bg-brand text-brand-foreground hover:bg-[var(--brand-hover)]"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-2 px-1 text-center font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {t("chat.hint")}
        </p>
      </div>

      <SourceDialog source={activeSource} onClose={() => setActiveSource(null)} />
    </div>
  );
}

function EmptyState({
  hasDocs,
  onAsk,
  suggestions,
}: {
  hasDocs: boolean;
  onAsk: (question: string) => void;
  /** Ready-made question strings (demo mode); falls back to i18n suggestions. */
  suggestions?: string[];
}) {
  const { t } = useI18n();
  const chips =
    suggestions ?? (["chat.suggest1", "chat.suggest2", "chat.suggest3"] as const).map((k) => t(k));
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
        <BookOpenText className="size-7 text-brand" />
      </div>
      <h3 className="font-display text-2xl font-semibold tracking-tight">
        {t("chat.empty.title")}
      </h3>
      <p className="max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        {hasDocs ? t("chat.empty.hasDocs") : t("chat.empty.noDocs")}
      </p>
      {hasDocs && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {chips.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => onAsk(label)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand/60 hover:bg-[var(--brand-soft)] hover:text-foreground"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onSource,
  onRefine,
}: {
  message: ChatMessage;
  onSource: (s: Source) => void;
  onRefine?: (kind: RefineKind) => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const isUser = message.role === "user";

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[85%] space-y-3", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-brand text-[15px] text-brand-foreground"
              : "border border-border bg-card font-serif text-[15px] leading-7 text-foreground",
          )}
        >
          {message.content ? (
            isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div>
                <Markdown content={message.content} />
                {message.streaming && (
                  <motion.span
                    className="mt-1 inline-block h-4 w-1.5 rounded-sm bg-brand align-middle"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </div>
            )
          ) : message.streaming ? (
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> {t("chat.searching")}
            </span>
          ) : null}
        </div>

        {!isUser && message.content && !message.streaming && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {copied ? (
                  <Check className="size-3 text-[var(--success)]" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copied ? t("chat.copied") : t("chat.copy")}
              </button>
              {onRefine && (
                <button
                  type="button"
                  onClick={() => setShowRefine((v) => !v)}
                  aria-expanded={showRefine}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-[11px] transition-colors hover:text-foreground",
                    showRefine ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Wand2 className="size-3" />
                  {t("chat.refine")}
                </button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {showRefine && onRefine && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1.5 overflow-hidden"
                >
                  {REFINE_OPTIONS.map((opt) => (
                    <button
                      key={opt.kind}
                      type="button"
                      onClick={() => {
                        setShowRefine(false);
                        onRefine(opt.kind);
                      }}
                      className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-brand/60 hover:bg-[var(--brand-soft)] hover:text-foreground"
                    >
                      {t(opt.label)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence initial={false}>
              {message.sources.map((s, i) => (
                <motion.button
                  key={s.chunkId + i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => onSource(s)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] transition-colors hover:border-brand/60 hover:bg-[var(--brand-soft)]"
                >
                  <Quote className="size-3 shrink-0 text-brand" />
                  <span className="truncate font-medium">{s.filename}</span>
                  {s.page != null && (
                    <span className="shrink-0 text-muted-foreground">p.{s.page}</span>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SourceDialog({ source, onClose }: { source: Source | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Quote className="size-4 text-brand" />
            {source?.filename}
            {source?.page != null && (
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {t("source.page", { n: source.page })}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{t("source.subtitle")}</DialogDescription>
        </DialogHeader>
        <blockquote className="border-l-2 border-brand bg-[var(--brand-soft)] py-3 pl-4 pr-2 font-serif text-[15px] italic leading-7">
          {source?.citedText}
        </blockquote>
      </DialogContent>
    </Dialog>
  );
}
