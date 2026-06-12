// lib/supabase.ts
// Browser-side Supabase client. Use this in client components and pages
// to read/write the `rants` table and to handle auth.
//
// Note: when you get to Week 3 (auth + saving sessions), you'll likely
// also want a server client for use inside API routes. Add that then.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}