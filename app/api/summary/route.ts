// app/api/summary/route.ts
//
// POST /api/summary
// Called once when the user taps "End Rant". Sends the whole conversation to
// Gemini and asks for a structured summary: { title, summary, intensity, villain }.
//
// Not streamed — we want the complete JSON object back in one piece. Uses
// Gemini's structured-output mode (responseSchema) so the reply is valid JSON.
// Safety settings are loosened because rants are angry/emotional by design and
// we don't want the model to refuse to summarize them.

import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SUMMARY_PROMPT } from "@/lib/prompts";
import type { Message, RantSummary } from "@/lib/types";

let _ai: GoogleGenAI | null = null;
function getAI() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _ai;
}

const MODEL = "gemini-2.5-flash-lite";

// Venting involves anger, frustration, sometimes dark talk — allow it through.
const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

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
      {
        error:
          "Server is missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n");

  try {
    const response = await getAI().models.generateContent({
      model: MODEL,
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

    // If the model returned nothing, figure out why so we can say something useful.
    if (!raw) {
      const reason = response.candidates?.[0]?.finishReason;
      if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT") {
        throw new Error("blocked by content filter");
      }
      throw new Error("empty response from model");
    }

    const data = JSON.parse(raw) as RantSummary;
    const intensity = Math.max(1, Math.min(10, Math.round(Number(data.intensity) || 1)));

    const result: RantSummary = {
      title: data.title || "Untitled Rant",
      summary: data.summary || "",
      intensity,
      villain: data.villain || "Unknown",
    };

    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/summary] error:", err);

    let friendly = "Couldn't generate the summary. Please try again.";
    let status = 502;
    if (/api[_ ]?key|unauthor|permission|401|403/i.test(msg)) {
      friendly =
        "Invalid Gemini API key. Check GEMINI_API_KEY in .env.local (and restart the dev server).";
    } else if (/quota|rate|resource.exhausted|429/i.test(msg)) {
      friendly =
        "Hit the Gemini free-tier rate limit. Wait a minute, then try ending the rant again.";
      status = 429;
    } else if (/blocked|safety|content filter/i.test(msg)) {
      friendly =
        "The model wouldn't summarize this one (content filter). Try ranting a bit more, then end again.";
    }
    return Response.json({ error: friendly }, { status });
  }
}