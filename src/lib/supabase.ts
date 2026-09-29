"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Browser Supabase client — used only for auth (login/signup) and KYC file uploads to private Storage. */
let client: SupabaseClient | null = null;
export function supabaseBrowser(): SupabaseClient {
  if (!client) client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return client;
}
