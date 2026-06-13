// app/rant/page.tsx
//
// Screen 2: the rant chat. The landing page sends users here with the
// chosen vibe + mood in the URL, e.g. /rant?vibe=hype&mood=angry.
//
// This is a Server Component. In Next.js 16, `searchParams` is a PROMISE
// (it used to be a plain object) — so we must await it. We validate here,
// on the server, and bounce back to the landing page if the URL is missing
// or tampered with. Then we hand the validated values to the client
// component that actually runs the chat.

import { redirect } from "next/navigation";
import ChatBox from "@/components/ChatBox";
import type { Vibe, Mood } from "@/lib/types";

const VIBES: Vibe[] = ["hype", "roast", "supportive", "reframe"];
const MOODS: Mood[] = ["angry", "sad", "frustrated", "overwhelmed"];

export default async function RantPage({
  searchParams,
}: {
  searchParams: Promise<{ vibe?: string; mood?: string }>;
}) {
  const { vibe, mood } = await searchParams;

  // If someone lands here without a valid setup, send them to pick one.
  const validVibe = !!vibe && VIBES.includes(vibe as Vibe);
  const validMood = !!mood && MOODS.includes(mood as Mood);
  if (!validVibe || !validMood) {
    redirect("/");
  }

  return <ChatBox vibe={vibe as Vibe} mood={mood as Mood} />;
}