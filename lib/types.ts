// lib/types.ts
// Shared types for the whole app. Import from here so vibe/mood values
// stay consistent across the UI, API routes, and database.

export type Vibe = "hype" | "roast" | "supportive" | "reframe";
export type Mood = "angry" | "sad" | "frustrated" | "overwhelmed";

// A single chat message. Matches the shape the Anthropic API expects.
export interface Message {
  role: "user" | "assistant";
  content: string;
}

// What /api/summary returns at the end of a session.
export interface RantSummary {
  title: string; // funny/dramatic title, max ~8 words
  summary: string; // 2-3 sentences
  intensity: number; // 1-10
  villain: string; // who/what they were mad at (flavorful, for display)
  villainKey?: string; // short canonical tag for grouping repeats (e.g. "the mouse")
}

// A full row in the Supabase `rants` table.
export interface RantSession {
  id: string;
  user_id: string | null; // null until auth is added
  title: string;
  summary: string;
  vibe: Vibe;
  mood: Mood;
  messages: Message[];
  intensity: number;
  villain: string;
  villain_key?: string | null;
  created_at: string;
}

// Human-readable labels for the UI buttons, kept next to the types
// so the selector screen and badges stay in sync.
export const VIBE_LABELS: Record<Vibe, string> = {
  hype: "Hype Me Up",
  roast: "Roast Me",
  supportive: "Just Listen",
  reframe: "Give Me Perspective",
};

export const MOOD_LABELS: Record<Mood, string> = {
  angry: "Angry",
  sad: "Sad",
  frustrated: "Frustrated",
  overwhelmed: "Overwhelmed",
};