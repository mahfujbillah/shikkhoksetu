import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true once the Supabase env vars are set (in .env.local or on Vercel). Until then the site shows sample data. */
export const isConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!isConfigured) throw new Error("Supabase is not configured");
  if (!client) client = createBrowserClient(url!, key!);
  return client;
}
