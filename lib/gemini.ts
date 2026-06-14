// lib/gemini.ts
// Shared Gemini setup for the API routes.

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// Free-tier fallback chain. The free quota is ~20 requests/day *per model*, so
// when one model is exhausted we drop to the next — roughly tripling the daily
// budget at no cost. Order: cheapest/fastest first.
export const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

// Venting is angry/emotional by design — don't let the model refuse it.
export const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Lazily construct the client so a missing GEMINI_API_KEY doesn't throw at
// import time (which would break `next build`).
let _ai: GoogleGenAI | null = null;
export function getAI() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _ai;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// A 429 / quota error of any kind.
export function isRateLimit(err: unknown): boolean {
  if (typeof err === "object" && err !== null && (err as { status?: number }).status === 429) {
    return true;
  }
  return /quota|resource.?exhausted|429|too many requests/i.test(errMessage(err));
}

// Specifically the per-DAY quota (vs the per-minute burst limit).
export function isDailyLimit(err: unknown): boolean {
  return /PerDay/i.test(errMessage(err));
}

// A user-facing message that says the right thing depending on which limit hit.
export function rateLimitMessage(err: unknown): string {
  if (isDailyLimit(err)) {
    return "Daily free-tier limit reached on all free models. Google resets it at midnight Pacific (~3 PM in Davao) — try again after that.";
  }
  const m = errMessage(err).match(/retry in ([\d.]+)s|retryDelay"?:\s*"?(\d+)/i);
  const secs = m ? Math.ceil(Number(m[1] ?? m[2])) : null;
  return secs
    ? `Hit Gemini's per-minute limit. Wait about ${secs}s, then try again.`
    : "Hit Gemini's per-minute limit. Wait about a minute, then try again.";
}