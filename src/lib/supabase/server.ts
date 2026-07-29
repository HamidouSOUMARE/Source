import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service-role client — bypasses RLS. Only ever used server-side, and every
// query is explicitly scoped to a verified user id.
export function supabaseAdmin(): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Verifies the `Authorization: Bearer <jwt>` header and returns the user id,
 * or null if missing/invalid. The JWT is minted by Supabase Auth on the client
 * (anonymous sign-in), so this is a real, verifiable identity.
 */
export async function getUserId(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
