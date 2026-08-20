import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

/** Lazily instantiate the client so a missing key doesn't crash module import (e.g. at build time). */
export function getAnthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  filename: string;
  page: number | null;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export type AnswerLang = "fr" | "en";

export function getSystemPrompt(lang: AnswerLang): string {
  const answerLanguage = lang === "en" ? "English" : "French";
  return `You are a document-retrieval assistant. Answer the user's question based ONLY on the provided document extracts.

Rules:
- Always answer in ${answerLanguage}, regardless of the language of the question or of the documents.
- Base every claim on the provided extracts; the API attaches citations automatically.
- If the extracts do not contain the answer, say so clearly instead of inventing one.
- Be concise and direct.
- Format with light Markdown: short paragraphs, simple bullet lists, and **bold** for key terms. Avoid large "#" headings.`;
}

/**
 * Builds the Messages API params. Each retrieved chunk becomes its own plain-text
 * "document", so citations come back as `char_location` — the exact sentences the
 * answer relies on, not the whole chunk (which is what a single document made of
 * custom content blocks would give). A citation's `document_index` maps 1:1 back
 * to `chunks[index]` for source attribution.
 */
export function buildMessages(
  question: string,
  chunks: RetrievedChunk[],
  refine?: { directive: string; previousAnswer: string },
): Anthropic.MessageParam[] {
  const prompt = refine
    ? `Question: ${question}\n\nYour previous answer:\n${refine.previousAnswer}\n\n${refine.directive} Base it only on the extracts above and keep citing them.`
    : `Question: ${question}`;

  return [
    {
      role: "user",
      content: [
        ...chunks.map((c) => ({
          type: "document" as const,
          source: {
            type: "text" as const,
            media_type: "text/plain" as const,
            data: c.content,
          },
          title: c.page ? `${c.filename} — p. ${c.page}` : c.filename,
          citations: { enabled: true },
        })),
        {
          type: "text",
          text: prompt,
        },
      ],
    },
  ];
}
