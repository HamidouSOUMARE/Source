import { getUserId, supabaseAdmin } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/voyage";
import {
  getAnthropic,
  ANTHROPIC_MODEL,
  getSystemPrompt,
  buildMessages,
  type RetrievedChunk,
} from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const MATCH_COUNT = 6;

const REFINE_DIRECTIVES: Record<string, string> = {
  shorter: "Rewrite your previous answer more concisely, keeping only what matters.",
  longer: "Expand and add more useful detail to your previous answer.",
  simpler: "Rewrite your previous answer in simpler, more accessible language.",
};

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Non authentifié." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const lang = body?.lang === "en" ? "en" : "fr";

  const rawRefine = body?.refine;
  const refine =
    rawRefine &&
    typeof rawRefine.previousAnswer === "string" &&
    typeof rawRefine.kind === "string" &&
    REFINE_DIRECTIVES[rawRefine.kind]
      ? {
          directive: REFINE_DIRECTIVES[rawRefine.kind],
          previousAnswer: rawRefine.previousAnswer.slice(0, 8000),
        }
      : undefined;
  if (!question) {
    return new Response(JSON.stringify({ error: "Question vide." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // 1. Embed the question and retrieve the closest chunks.
  const queryEmbedding = await embedQuery(question);
  const { data, error } = await supabaseAdmin().rpc("match_chunks", {
    p_user_id: userId,
    query_embedding: queryEmbedding,
    match_count: MATCH_COUNT,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const candidates: RetrievedChunk[] = (data ?? []).map(
    (r: {
      id: string;
      document_id: string;
      filename: string;
      chunk_index: number;
      page: number | null;
      content: string;
      similarity: number;
    }) => ({
      id: r.id,
      documentId: r.document_id,
      filename: r.filename,
      chunkIndex: r.chunk_index,
      page: r.page,
      content: r.content,
      similarity: r.similarity,
    }),
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        // No indexed content matched — tell the user rather than hallucinate.
        if (candidates.length === 0) {
          send({ type: "chunks", chunks: [] });
          send({
            type: "text",
            text: "Je n'ai trouvé aucun passage pertinent dans vos documents. Vérifiez qu'un document est bien indexé, ou reformulez votre question.",
          });
          send({ type: "done" });
          controller.close();
          return;
        }

        // Surface the retrieved candidates up front (for a "searching…" UI).
        send({
          type: "chunks",
          chunks: candidates.map((c) => ({
            id: c.id,
            filename: c.filename,
            page: c.page,
            similarity: c.similarity,
          })),
        });

        const messageStream = getAnthropic().messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: 2048,
          system: getSystemPrompt(lang),
          messages: buildMessages(question, candidates, refine),
        });

        for await (const event of messageStream) {
          if (event.type !== "content_block_delta") continue;
          const delta = event.delta;

          if (delta.type === "text_delta") {
            send({ type: "text", text: delta.text });
          } else if (delta.type === "citations_delta") {
            const cit = delta.citation;
            if (cit.type === "content_block_location") {
              const chunk = candidates[cit.start_block_index];
              if (chunk) {
                send({
                  type: "citation",
                  citation: {
                    chunkId: chunk.id,
                    documentId: chunk.documentId,
                    filename: chunk.filename,
                    page: chunk.page,
                    citedText: cit.cited_text,
                  },
                });
              }
            }
          }
        }

        send({ type: "done" });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur de génération.";
        send({ type: "error", error: message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}
