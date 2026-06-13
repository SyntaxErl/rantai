// components/HistoryCard.tsx
"use client";

import { useState } from "react";
import type { RantSession, Vibe, Mood } from "@/lib/types";

const display = "var(--font-space-grotesk), sans-serif";

const VIBE_EMOJI: Record<Vibe, string> = {
  hype: "🔥",
  roast: "😂",
  supportive: "🫂",
  reframe: "🧠",
};
const MOOD_EMOJI: Record<Mood, string> = {
  angry: "😡",
  sad: "😢",
  frustrated: "😤",
  overwhelmed: "😵",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function HistoryCard({ rant }: { rant: RantSession }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      className="rant-msg-in w-full text-left p-5 rounded-[18px] cursor-pointer"
      style={{ background: "#1a1232", border: "1px solid #2a2046" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="font-semibold text-[17px] text-[#f4f0ff]"
          style={{ fontFamily: display }}
        >
          {rant.title}
        </span>
        <div className="flex-none flex items-center gap-3">
          <span className="text-[13px] text-[#ff7a3c] font-semibold">
            {rant.intensity}/10
          </span>
          {/* Chevron rotates as the card opens. */}
          <span
            className="text-[#8a7cb8] text-[12px] transition-transform duration-300"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </div>

      <div className="mt-1.5 text-[13px] text-[#9b8fc4]">
        {formatDate(rant.created_at)} · {VIBE_EMOJI[rant.vibe]} {MOOD_EMOJI[rant.mood]}
      </div>

      {/* Animated reveal: grid 0fr → 1fr smoothly expands to the content's
          natural height, with a fade. The inner wrapper must clip overflow. */}
      <div
        className="grid"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transition: "grid-template-rows 0.32s ease, opacity 0.32s ease",
        }}
      >
        <div className="overflow-hidden">
          <div className="mt-3 pt-3 border-t border-[#2a2046] flex flex-col gap-2">
            <p className="m-0 text-[15px] leading-[1.6] text-[#cbbef0]">
              {rant.summary}
            </p>
            {rant.villain && (
              <span className="text-[13px] text-[#8a7cb8]">
                Villain:{" "}
                <span className="text-[#ffb38a] font-semibold">{rant.villain}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}