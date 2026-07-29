import { NextResponse } from "next/server";
import { getUserId, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;
  const db = supabaseAdmin();

  // Ensure the document belongs to the user before deleting.
  const { data: doc } = await db
    .from("documents")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  if (doc.storage_path) {
    await db.storage.from("documents").remove([doc.storage_path]);
  }
  // chunks cascade-delete via the FK.
  await db.from("documents").delete().eq("id", id).eq("user_id", userId);

  return NextResponse.json({ ok: true });
}
