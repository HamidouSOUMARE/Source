import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import type { SourcePage } from "./chunk";

/**
 * Extract text from an uploaded file, one entry per page when the format
 * supports pagination (PDF). Non-paginated formats return a single page.
 */
export async function extractPages(
  buffer: Buffer,
  filename: string,
  mime?: string,
): Promise<SourcePage[]> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  // --- PDF ---
  if (mime === "application/pdf" || ext === "pdf") {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const res = await parser.getText();
      const pages: SourcePage[] = (res.pages ?? [])
        .map((p) => ({ page: p.num, text: p.text ?? "" }))
        .filter((p) => p.text.trim().length > 0);
      return pages.length ? pages : [{ page: null, text: res.text ?? "" }];
    } finally {
      await parser.destroy();
    }
  }

  // --- DOCX ---
  if (ext === "docx" || mime?.includes("wordprocessingml")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return [{ page: null, text: value }];
  }

  // --- TXT / MD / fallback ---
  return [{ page: null, text: buffer.toString("utf-8") }];
}

export const SUPPORTED_EXTENSIONS = ["pdf", "docx", "txt", "md", "markdown"];

export function isSupported(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return SUPPORTED_EXTENSIONS.includes(ext);
}
