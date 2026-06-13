// app/api/chat/route.ts
//
// POST /api/chat
// Streams Claude-style chat replies back to the browser token-by-token.
// Backed by Google Gemini (free tier) via the @google/genai SDK.
//
// Flow:
//   1. Read { messages, vibe, mood } from the request body.
//   2. Validate them (never trust the client).
//   3. Build the silent system prompt from the chosen vibe + mood.
//   4. Open a streaming call to Gemini.
//   5. Peek the first chunk so auth/setup errors come back as a clean error,
//      then pipe the rest into a Web ReadableStream as plain text.

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { buildSystemPrompt } from "@/lib/prompts";
import type { Message, Vibe, Mood } from "@/lib/types";

// Lazily construct the client so a missing GEMINI_API_KEY doesn't throw at
// import time (which would break `next build`).
let _ai: GoogleGenAI | null = null;
function getAI() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _ai;
}

// Gemini's free, fast model. One place to change it later.
const MODEL = "gemini-2.5-flash-lite";

// Venting is angry/emotional by design — don't let the model refuse it.
const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Allow-lists so a malformed request can't pick a prompt we didn't define.
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
    return Response.json(
      { error: "messages must be a non-empty array" },
      { status: 400 },
    );
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
      {
        error:
          "Server is missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  // --- 4. Map our messages to Gemini's format --------------------------
  // Gemini uses role "model" for the assistant (not "assistant"), and wraps
  // text in a parts array.
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Lets us stop generating if the browser disconnects.
  const ac = new AbortController();

  // --- 5. Open the stream, peeking the first chunk for clean errors ----
  let iterator: AsyncIterator<{ text?: string }>;
  let first: IteratorResult<{ text?: string }>;
  try {
    const stream = await getAI().models.generateContentStream({
      model: MODEL,
      contents,
      config: { systemInstruction: system, safetySettings: SAFETY, abortSignal: ac.signal },
    });
    iterator = stream[Symbol.asyncIterator]();
    first = await iterator.next();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly = /api[_ ]?key|permission|401|403|400/i.test(msg)
      ? "Invalid Gemini API key. Check GEMINI_API_KEY in .env.local (and restart the dev server)."
      : msg || "Failed to reach the AI service.";
    console.error("[/api/chat] upstream error:", err);
    return Response.json({ error: friendly }, { status: 502 });
  }

  // --- 6. Bridge Gemini's chunks into a plain-text ReadableStream ------
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let result = first;
        while (!result.done) {
          const text = result.value.text;
          if (text) controller.enqueue(encoder.encode(text));
          result = await iterator.next();
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