import { NextResponse } from "next/server";
import { getUserId, supabaseAdmin } from "@/lib/supabase/server";
import { extractPages, isSupported } from "@/lib/parse";
import { chunkPages } from "@/lib/chunk";
import { embedDocuments } from "@/lib/voyage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_DOCS = 25; // per-user document cap

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  }
  if (!isSupported(file.name)) {
    return NextResponse.json(
      { error: "Format non supporté (PDF, DOCX, TXT, MD)." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 15 Mo)." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const db = supabaseAdmin();

  // Per-user cap to bound abuse / API spend on a public demo.
  const { count } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= MAX_DOCS) {
    return NextResponse.json(
      { error: `Limite de ${MAX_DOCS} documents atteinte. Supprimez-en avant d'en ajouter.` },
      { status: 400 },
    );
  }

  // 1. Create the document row up front so the UI can show it as "processing".
  const { data: doc, error: insertErr } = await db
    .from("documents")
    .insert({
      user_id: userId,
      filename: file.name,
      mime_type: file.type || null,
      byte_size: file.size,
      status: "processing",
    })
    .select()
    .single();

  if (insertErr || !doc) {
    return NextResponse.json(
      { error: "Impossible de créer le document.", detail: insertErr?.message },
      { status: 500 },
    );
  }

  try {
    // 2. Store the original file (private bucket, foldered by user id).
    const storagePath = `${userId}/${doc.id}/${file.name}`;
    await db.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    // 3. Parse → chunk → embed.
    const pages = await extractPages(buffer, file.name, file.type);
    const chunks = chunkPages(pages);
    if (chunks.length === 0) {
      throw new Error("Aucun texte exploitable trouvé dans le document.");
    }

    const embeddings = await embedDocuments(chunks.map((c) => c.content));
    if (embeddings.length !== chunks.length) {
      throw new Error("Le nombre d'embeddings ne correspond pas au nombre de chunks.");
    }

    // 4. Store the chunks with their vectors.
    const rows = chunks.map((c, i) => ({
      document_id: doc.id,
      user_id: userId,
      chunk_index: c.index,
      page: c.page,
      content: c.content,
      embedding: embeddings[i],
    }));

    const { error: chunkErr } = await db.from("chunks").insert(rows);
    if (chunkErr) throw new Error(chunkErr.message);

    // 5. Mark the document ready.
    const { data: ready } = await db
      .from("documents")
      .update({ status: "ready", num_chunks: chunks.length, storage_path: storagePath })
      .eq("id", doc.id)
      .select()
      .single();

    return NextResponse.json({ document: ready ?? doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur d'indexation.";
    await db.from("documents").update({ status: "error", error: message }).eq("id", doc.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
