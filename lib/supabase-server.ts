// lib/supabase-server.ts
// Server-side Supabase client for use inside API route handlers (and server
// components). It reads the auth session from the request cookies — the browser
// client stores the session in cookies via @supabase/ssr — so the server can
// verify *who* is calling a route (used by /api/chat and /api/summary to require
// a signed-in user).

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies(); // async in Next.js 16

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies can't be set — safe
            // to ignore here (the callback route CAN set them).
          }
        },
      },
    },
  );
}