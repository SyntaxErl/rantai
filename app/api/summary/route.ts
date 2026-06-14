// app/api/summary/route.ts
//
// POST /api/summary
// Called once when the user taps "End Rant". Asks Gemini for a structured
// summary: { title, summary, intensity, villain } using structured-output mode.
//
// Like the chat route, it walks the free-tier model fallback chain so a single
// model's daily quota running out doesn't block the summary.

import { Type } from "@google/genai";
import { SUMMARY_PROMPT } from "@/lib/prompts";
import { getAI, MODELS, SAFETY, isRateLimit, rateLimitMessage } from "@/lib/gemini";
import { createClient as createServerSupabase } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/ratelimit";
import type { Message, RantSummary } from "@/lib/types";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A funny or dramatic title, max 8 words" },
    summary: { type: Type.STRING, description: "2-3 sentences summarizing the rant" },
    intensity: { type: Type.INTEGER, description: "How heated the rant was, 1-10" },
    villain: { type: Type.STRING, description: "The main person or thing they were mad at" },
  },
  required: ["title", "summary", "intensity", "villain"],
};

export async function POST(request: Request) {
  let body: { messages?: Message[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages must be a non-empty array" }, { status: 400 });
  }

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
      return Response.json({ error: "Please sign in to end a rant." }, { status: 401 });
    }
    if (!rateLimit(`summary:${user.id}`, 10, 60_000)) {
      return Response.json(
        { error: "Too many summaries in a row — wait a moment and try again." },
        { status: 429 },
      );
    }
  }

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n");

  let lastErr: unknown = null;

  for (const model of MODELS) {
    try {
      const response = await getAI().models.generateContent({
        model,
        contents: transcript,
        config: {
          systemInstruction: SUMMARY_PROMPT,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          safetySettings: SAFETY,
          temperature: 0.8,
        },
      });

      const raw = (response.text ?? "").trim();
      if (!raw) {
        const reason = response.candidates?.[0]?.finishReason;
        if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT") {
          return Response.json(
            { error: "The model wouldn't summarize this one (content filter). Try ranting a bit more, then end again." },
            { status: 502 },
          );
        }
        throw new Error("empty response from model");
      }

      const data = JSON.parse(raw) as RantSummary;
      const intensity = Math.max(1, Math.min(10, Math.round(Number(data.intensity) || 1)));

      return Response.json({
        title: data.title || "Untitled Rant",
        summary: data.summary || "",
        intensity,
        villain: data.villain || "Unknown",
      } satisfies RantSummary);
    } catch (err) {
      lastErr = err;
      if (isRateLimit(err)) continue; // quota spent on this model — try the next
      break; // non-quota error (key/parse/empty) — stop and report below
    }
  }

  // Got here = all models rate-limited, or a non-quota error broke the loop.
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  console.error("[/api/summary] error:", lastErr);

  if (isRateLimit(lastErr)) {
    return Response.json({ error: rateLimitMessage(lastErr) }, { status: 429 });
  }
  if (/api[_ ]?key|unauthor|permission|401|403/i.test(msg)) {
    return Response.json(
      { error: "Invalid Gemini API key. Check GEMINI_API_KEY in .env.local (and restart the dev server)." },
      { status: 502 },
    );
  }
  return Response.json({ error: "Couldn't generate the summary. Please try again." }, { status: 502 });
}