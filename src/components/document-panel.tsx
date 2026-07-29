"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { DocumentRow } from "@/lib/types";

interface Props {
  documents: DocumentRow[];
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  uploading: boolean;
  /** Demo mode: no upload/delete, sample corpus shown as-is. */
  readOnly?: boolean;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

type DropLikeEvent = {
  dataTransfer?: DataTransfer | null;
  target?: (EventTarget & { files?: FileList | null }) | null;
};

/**
 * Extract files from a drop or input event using the classic DataTransfer API
 * (getAsFile) — avoids `getAsFileSystemHandle().getFile()`, which throws
 * NotAllowedError in some browser/platform contexts.
 */
async function filesFromEvent(event: DropLikeEvent): Promise<File[]> {
  const dt = event.dataTransfer;
  if (dt) {
    if (dt.items && dt.items.length > 0) {
      const out: File[] = [];
      for (const item of Array.from(dt.items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) out.push(file);
        }
      }
      if (out.length > 0) return out;
    }
    return dt.files ? Array.from(dt.files) : [];
  }
  const files = event.target?.files;
  return files ? Array.from(files) : [];
}

export function DocumentPanel({ documents, onUpload, onDelete, uploading, readOnly }: Props) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      try {
        await onUpload(accepted);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("toast.uploadFail"));
      }
    },
    [onUpload, t],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    useFsAccessApi: false,
    getFilesFromEvent: (e) => filesFromEvent(e as DropLikeEvent),
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md", ".markdown"],
    },
  });

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await onDelete(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.deleteFail"));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {readOnly ? (
        <div className="rounded-xl border border-brand/30 bg-[var(--brand-soft)] p-4">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
            <p className="text-[13px] leading-relaxed text-foreground/80">{t("demo.panel")}</p>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "group relative cursor-pointer rounded-xl border-2 border-dashed border-border bg-card/60 p-6 text-center transition-colors",
            isDragActive && "border-brand bg-[var(--brand-soft)]",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 className="size-7 animate-spin text-brand" />
            ) : (
              <UploadCloud className="size-7 text-muted-foreground transition-colors group-hover:text-brand" />
            )}
            <p className="text-[15px] font-medium">
              {uploading ? t("dropzone.indexing") : t("dropzone.drop")}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("dropzone.formats")}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("docs.title")}
        </h2>
        <span className="font-mono text-[11px] text-muted-foreground">{documents.length}</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {documents.length === 0 && !uploading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-1 py-6 text-center text-sm italic text-muted-foreground"
            >
              {t("docs.empty")}
            </motion.p>
          )}
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <StatusBadge status={doc.status} chunks={doc.num_chunks} />
                  {doc.byte_size ? <span>· {formatSize(doc.byte_size)}</span> : null}
                </p>
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting === doc.id}
                >
                  {deleting === doc.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusBadge({ status, chunks }: { status: DocumentRow["status"]; chunks: number }) {
  const { t } = useI18n();
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--success)]">
        <CheckCircle2 className="size-3" /> {t("docs.extracts", { n: chunks })}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <AlertCircle className="size-3" /> {t("docs.status.error")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[var(--warning)]">
      <Loader2 className="size-3 animate-spin" /> {t("docs.status.indexing")}
    </span>
  );
}
