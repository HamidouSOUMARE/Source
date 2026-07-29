// Sentence-aware text chunker with overlap, preserving page numbers.

export interface SourcePage {
  page: number | null;
  text: string;
}

export interface Chunk {
  content: string;
  page: number | null;
  index: number;
}

const TARGET = 1000; // target characters per chunk
const OVERLAP = 150; // characters of overlap between consecutive chunks
const HARD = Math.floor(TARGET * 1.6); // hard cap before force-splitting a run

function normalize(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function overlapTail(s: string): string {
  if (OVERLAP <= 0 || s.length <= OVERLAP) return s.length <= OVERLAP ? s : "";
  const tail = s.slice(s.length - OVERLAP);
  // Start the overlap at a word boundary for readability.
  const space = tail.indexOf(" ");
  return space > 0 ? tail.slice(space + 1) : tail;
}

function splitText(raw: string): string[] {
  const text = normalize(raw);
  if (!text) return [];
  if (text.length <= TARGET) return [text];

  // Split into sentence-ish units, then hard-split any unit longer than HARD.
  const units: string[] = [];
  for (const s of text.match(/[^.!?\n]+[.!?]*[\s]*/g) ?? [text]) {
    if (s.length <= HARD) {
      units.push(s);
    } else {
      for (let i = 0; i < s.length; i += TARGET) units.push(s.slice(i, i + TARGET));
    }
  }

  const chunks: string[] = [];
  let cur = "";
  for (const unit of units) {
    if (cur && cur.length + unit.length > TARGET) {
      chunks.push(cur.trim());
      cur = overlapTail(cur) + unit;
    } else {
      cur += unit;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

/** Turn extracted pages into ordered, overlapping chunks that remember their page. */
export function chunkPages(pages: SourcePage[]): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;
  for (const p of pages) {
    for (const content of splitText(p.text)) {
      chunks.push({ content, page: p.page, index: index++ });
    }
  }
  return chunks;
}
