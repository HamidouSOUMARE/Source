"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { listDocuments, uploadDocument, deleteDocument } from "@/lib/client";
import { DEMO_MODE, DEMO_DOCUMENTS } from "@/lib/demo";
import type { DocumentRow } from "@/lib/types";
import { DocumentPanel } from "@/components/document-panel";
import { ChatPanel } from "@/components/chat-panel";
import { TurnstileGate } from "@/components/turnstile-gate";
import { HeaderControls } from "@/components/header-controls";

export default function Home() {
  const { ready, token, needsCaptcha, completeSignIn } = useSession();
  const { t } = useI18n();
  const [documents, setDocuments] = useState<DocumentRow[]>(DEMO_MODE ? DEMO_DOCUMENTS : []);
  const [uploading, setUploading] = useState(false);

  // Load the user's documents once the anonymous session is established.
  useEffect(() => {
    if (!ready || !token) return;
    let active = true;
    listDocuments(token)
      .then((docs) => {
        if (active) setDocuments(docs);
      })
      .catch(() => {
        /* silent — surfaced elsewhere */
      });
    return () => {
      active = false;
    };
  }, [ready, token]);

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!token) return;
      setUploading(true);
      try {
        for (const file of files) {
          const doc = await uploadDocument(token, file);
          setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
          toast.success(t("toast.indexed", { file: file.name, n: doc.num_chunks }));
        }
      } finally {
        setUploading(false);
      }
    },
    [token, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!token) return;
      await deleteDocument(token, id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    },
    [token],
  );

  const readyCount = documents.filter((d) => d.status === "ready").length;

  return (
    <div className="flex h-dvh flex-col bg-background">
      {!DEMO_MODE && needsCaptcha && !token && <TurnstileGate onToken={completeSignIn} />}

      <header className="flex items-center justify-between border-b border-border bg-card/40 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <ScanSearch className="size-5" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 font-display text-lg font-semibold leading-none tracking-tight">
              Sourcé
              {DEMO_MODE && (
                <span className="rounded-full border border-brand/40 bg-[var(--brand-soft)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-brand">
                  {t("demo.badge")}
                </span>
              )}
            </h1>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("app.tagline")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            {DEMO_MODE ? (
              t("demo.notice")
            ) : !ready ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" /> {t("header.connecting")}
              </span>
            ) : (
              t("header.session")
            )}
          </span>
          <HeaderControls />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 overflow-hidden p-4 md:grid-cols-[320px_1fr] md:p-6">
        <aside className="hidden min-h-0 md:block">
          <DocumentPanel
            documents={documents}
            onUpload={handleUpload}
            onDelete={handleDelete}
            uploading={uploading}
            readOnly={DEMO_MODE}
          />
        </aside>

        {/* Mobile: documents collapse above the chat */}
        <div className="min-h-0 md:hidden">
          <DocumentPanel
            documents={documents}
            onUpload={handleUpload}
            onDelete={handleDelete}
            uploading={uploading}
            readOnly={DEMO_MODE}
          />
        </div>

        <section className="min-h-0">
          <ChatPanel token={token} hasDocs={readyCount > 0} />
        </section>
      </main>
    </div>
  );
}
