import type { DocumentRow, StreamEvent } from "@/lib/types";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listDocuments(token: string): Promise<DocumentRow[]> {
  const res = await fetch("/api/documents", { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Impossible de charger les documents.");
  const json = await res.json();
  return json.documents ?? [];
}

export async function uploadDocument(token: string, file: File): Promise<DocumentRow> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/ingest", {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Échec de l'indexation.");
  return json.document;
}

export async function deleteDocument(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Échec de la suppression.");
}

/**
 * Streams the answer for a question. Calls `onEvent` for each NDJSON line.
 */
export type RefineKind = "shorter" | "longer" | "simpler";

export async function streamQuery(
  token: string,
  question: string,
  onEvent: (event: StreamEvent) => void,
  lang: "fr" | "en" = "fr",
  refine?: { kind: RefineKind; previousAnswer: string },
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { ...authHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({ question, lang, refine }),
    signal,
  });

  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Échec de la requête.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        try {
          onEvent(JSON.parse(line) as StreamEvent);
        } catch {
          // ignore malformed partial lines
        }
      }
    }
  }
}
