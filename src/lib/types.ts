export interface DocumentRow {
  id: string;
  filename: string;
  status: "processing" | "ready" | "error";
  num_chunks: number;
  byte_size: number | null;
  error: string | null;
  created_at: string;
}

export interface Source {
  chunkId: string;
  documentId: string;
  filename: string;
  page: number | null;
  citedText: string;
}

export interface Candidate {
  id: string;
  filename: string;
  page: number | null;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  streaming?: boolean;
  /** The question that produced this assistant message (for "reformulate"). */
  question?: string;
}

// NDJSON events emitted by /api/query
export type StreamEvent =
  | { type: "chunks"; chunks: Candidate[] }
  | { type: "text"; text: string }
  | { type: "citation"; citation: Source }
  | { type: "done" }
  | { type: "error"; error: string };
