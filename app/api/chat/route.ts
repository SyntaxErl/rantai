// app/api/chat/route.ts
//
// POST /api/chat
// Streams chat replies back to the browser token-by-token, backed by Google
// Gemini (free tier) via @google/genai.
//
// Free tier gives ~20 requests/day *per model*, so we walk a fallback chain:
// if the first model is out of daily quota, we transparently try the next.

import { buildSystemPrompt } from "@/lib/prompts";
import { getAI, MODELS, SAFETY, isRateLimit, rateLimitMessage } from "@/lib/gemini";
import { createClient as createServerSupabase } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/ratelimit";
import type { Message, Vibe, Mood } from "@/lib/types";

const VIBES: Vibe[] = ["hype", "roast", "supportive", "reframe"];
const MOODS: Mood[] = ["angry", "sad", "frustrated", "overwhelmed"];

export async function POST(request: Request) {
  // --- 1. Parse the body -----------------------------------------------
  let body: { messages?: Message[]; vibe?: Vibe; mood?: Mood };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, vibe, mood } = body;

  // --- 2. Validate -----------------------------------------------------
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages must be a non-empty array" }, { status: 400 });
  }
  if (!vibe || !VIBES.includes(vibe)) {
    return Response.json({ error: "invalid vibe" }, { status: 400 });
  }
  if (!mood || !MOODS.includes(mood)) {
    return Response.json({ error: "invalid mood" }, { status: 400 });
  }

  // --- 3. System prompt + key check ------------------------------------
  const system = buildSystemPrompt(vibe, mood);

  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "Server is missing GEMINI_API_KEY. Add it to .env.local and restart the dev server." },
      { status: 500 },
    );
  }

  // --- Require a signed-in user (protects your Gemini quota from abuse) -
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Please sign in to start a rant." }, { status: 401 });
    }
    if (!rateLimit(`chat:${user.id}`, 20, 60_000)) {
      return Response.json(
        { error: "You're going a bit fast — wait a few seconds and try again." },
        { status: 429 },
      );
    }
  }

  // --- 4. Map our messages to Gemini's format --------------------------
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const ac = new AbortController();

  // --- 5. Try each model until one streams; peek the first chunk so
  //        auth/quota errors surface as clean JSON before we stream. -----
  let iterator: AsyncIterator<{ text?: string }> | null = null;
  let first: IteratorResult<{ text?: string }> | null = null;
  let lastErr: unknown = null;

  for (const model of MODELS) {
    try {
      const stream = await getAI().models.generateContentStream({
        model,
        contents,
        config: { systemInstruction: system, safetySettings: SAFETY, abortSignal: ac.signal },
      });
      const it = stream[Symbol.asyncIterator]();
      const f = await it.next();
      iterator = it;
      first = f;
      break; // this model worked
    } catch (err) {
      lastErr = err;
      if (isRateLimit(err)) continue; // this model's quota is spent — try the next
      // A non-quota error (bad key, bad request) would repeat on every model.
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = /api[_ ]?key|permission|401|403|400/i.test(msg)
        ? "Invalid Gemini API key. Check GEMINI_API_KEY in .env.local (and restart the dev server)."
        : msg || "Failed to reach the AI service.";
      console.error("[/api/chat] upstream error:", err);
      return Response.json({ error: friendly }, { status: 502 });
    }
  }

  if (!iterator || !first) {
    console.error("[/api/chat] all free models exhausted:", lastErr);
    return Response.json({ error: rateLimitMessage(lastErr) }, { status: 429 });
  }

  // --- 6. Bridge Gemini's chunks into a plain-text ReadableStream ------
  const iter = iterator;
  const firstResult = first;
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let result = firstResult;
        while (!result.done) {
          const text = result.value.text;
          if (text) controller.enqueue(encoder.encode(text));
          result = await iter.next();
        }
        controller.close();
      } catch (err) {
        console.error("[/api/chat] stream error:", err);
        controller.error(err);
      }
    },
    cancel() {
      ac.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}