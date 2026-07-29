import { VoyageAIClient } from "voyageai";

const MODEL = process.env.VOYAGE_MODEL || "voyage-3";

// Voyage accepts at most 128 inputs per request.
const BATCH = 128;

let _client: VoyageAIClient | null = null;
function client(): VoyageAIClient {
  if (!_client) {
    _client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });
  }
  return _client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimit(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { statusCode?: number }).statusCode === 429
  );
}

const RATE_LIMIT_MESSAGE =
  "Limite de débit Voyage atteinte (offre gratuite : 3 req/min, 10K tokens/min). " +
  "Ajoutez un moyen de paiement sur dashboard.voyageai.com pour débloquer les limites " +
  "standard — les 200M tokens gratuits de voyage-3 restent applicables.";

type EmbedInput = string | string[];

/** One embed call with exponential backoff on 429 rate limits. */
async function embedOnce(input: EmbedInput, inputType: "document" | "query") {
  const maxRetries = 4;
  for (let attempt = 0; ; attempt++) {
    try {
      return await client().embed({ input, model: MODEL, inputType });
    } catch (err) {
      if (isRateLimit(err) && attempt < maxRetries) {
        await sleep(Math.min(8000 * (attempt + 1), 30000));
        continue;
      }
      if (isRateLimit(err)) throw new Error(RATE_LIMIT_MESSAGE);
      throw err;
    }
  }
}

/** Embed document chunks (uses the "document" input type for better retrieval). */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await embedOnce(batch, "document");
    for (const item of res.data ?? []) {
      if (item.embedding) out.push(item.embedding);
    }
    if (i + BATCH < texts.length) await sleep(500); // gentle pacing between batches
  }
  return out;
}

/** Embed a single search query (uses the "query" input type). */
export async function embedQuery(text: string): Promise<number[]> {
  const res = await embedOnce(text, "query");
  return res.data?.[0]?.embedding ?? [];
}
