"use client";

import { createClient } from "@supabase/supabase-js";

// Browser client (anon key). Auth session is persisted in localStorage so the
// anonymous user stays stable across reloads.
// Fallbacks keep `createClient` from throwing during build/SSR when the project
// hasn't been configured yet. Real requests need the real values in .env.local.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
