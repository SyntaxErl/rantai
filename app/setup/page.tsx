// app/setup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Vibe, Mood } from "@/lib/types";

// Display labels come from the design; the `value` is the canonical key
// used everywhere in code (prompts.ts, the API, and the database).
const VIBES: { value: Vibe; emoji: string; label: string; desc: string }[] = [
  { value: "hype", emoji: "🔥", label: "Hype Me Up", desc: "Big energy, zero chill" },
  { value: "roast", emoji: "😂", label: "Roast Me", desc: "No mercy, all love" },
  { value: "supportive", emoji: "🫂", label: "Just Listen", desc: "I'll hold space" },
  { value: "reframe", emoji: "🧠", label: "Give Perspective", desc: "Zoom out with me" },
];

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: "angry", emoji: "😡", label: "Angry" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "frustrated", emoji: "😤", label: "Frustrated" },
  { value: "overwhelmed", emoji: "😵", label: "Overwhelmed" },
];

const display = "var(--font-space-grotesk), sans-serif";

export default function SetupPage() {
  const router = useRouter();
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [username, setUsername] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const configured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!configured) return;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        setUsername(
          (data.user?.user_metadata?.username as string) ||
            data.user?.email?.split("@")[0] ||
            "",
        );
      } catch {
        /* not signed in */
      }
    })();
  }, []);

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    router.push("/login");
  }

  const initials = username ? username.slice(0, 2).toUpperCase() : "?";

  const ready = vibe !== null && mood !== null;

  function startRanting() {
    if (!ready) return;
    router.push(`/rant?vibe=${vibe}&mood=${mood}`);
  }

  return (
    <main
      className="min-h-screen flex flex-col px-6 py-6"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -8%, #2c1656 0%, #150d2b 42%, #0a0712 100%)",
      }}
    >
      {/* Top bar */}
      <header className="w-full flex items-center justify-end gap-3 relative z-20">
        <button
          type="button"
          onClick={() => router.push("/history")}
          className="px-4 py-2 rounded-full text-[14px] font-semibold text-[#cbbef0] bg-[#1d1535] border border-[#2a2046] hover:border-[#3a2c63] cursor-pointer transition-colors"
          style={{ fontFamily: display }}
        >
          History
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            title={username || "Account"}
            aria-label="Account menu"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] cursor-pointer"
            style={{ background: "linear-gradient(135deg,#ff2e88,#ff7a3c)", fontFamily: display }}
          >
            {initials}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div
                className="rant-pop absolute right-0 mt-2 w-48 z-40 rounded-[14px] p-1.5"
                style={{ background: "#1a1232", border: "1px solid #2a2046" }}
              >
                <p className="px-3 py-2 text-[13px] text-[#9b8fc4] truncate">
                  {username || "Signed in"}
                </p>
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full text-left px-3 py-2 rounded-[10px] text-[14px] text-[#ff8a8a] hover:bg-[#221940] cursor-pointer transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center w-full">
      <div className="w-full max-w-[920px] flex flex-col items-center gap-9 text-center">
        {/* Header */}
        <div
          className="rant-fade-up flex flex-col items-center gap-3"
          style={{ animationDelay: "0ms" }}
        >
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden="true"
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 text-[44px] leading-none"
            >
              ⚡
            </span>
            <span
              className="font-bold text-[52px] tracking-[-0.03em]"
              style={{ fontFamily: display }}
            >
              RantAI
            </span>
          </div>
          <p className="m-0 text-[21px] text-[#b7abdb]">Say it. All of it.</p>
        </div>

        {/* Vibe picker */}
        <section
          className="rant-fade-up w-full flex flex-col gap-4"
          style={{ animationDelay: "120ms" }}
        >
          <span
            className="text-[13px] tracking-[0.07em] uppercase text-[#8a7cb8] font-semibold"
            style={{ fontFamily: display }}
          >
            Pick your vibe
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VIBES.map((v) => {
              const selected = vibe === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setVibe(v.value)}
                  className={[
                    "group flex flex-col items-start gap-2.5 text-left p-[22px] rounded-[22px] border-2 bg-[#1a1232]",
                    "transition-all duration-300 ease-out cursor-pointer outline-none",
                    "focus-visible:ring-2 focus-visible:ring-[#ff2e88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#150d2b]",
                    selected
                      ? "border-[#ff2e88] shadow-[0_0_26px_rgba(255,46,136,0.4)] -translate-y-1"
                      : "border-[#2a2046] hover:border-[#3a2c63] hover:-translate-y-1 hover:shadow-[0_0_22px_rgba(255,46,136,0.15)]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "text-[34px] leading-none transition-transform duration-300",
                      selected ? "scale-110" : "group-hover:scale-110",
                    ].join(" ")}
                  >
                    {v.emoji}
                  </span>
                  <span
                    className="font-semibold text-[18px]"
                    style={{ fontFamily: display }}
                  >
                    {v.label}
                  </span>
                  <span className="text-[13px] text-[#9b8fc4]">{v.desc}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Mood picker */}
        <section
          className="rant-fade-up w-full flex flex-col gap-4"
          style={{ animationDelay: "240ms" }}
        >
          <span
            className="text-[13px] tracking-[0.07em] uppercase text-[#8a7cb8] font-semibold"
            style={{ fontFamily: display }}
          >
            How are you feeling?
          </span>
          <div className="flex gap-3 justify-center flex-wrap">
            {MOODS.map((m) => {
              const selected = mood === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMood(m.value)}
                  className={[
                    "flex items-center gap-2.5 px-[22px] py-3 rounded-full text-[16px] font-semibold border",
                    "transition-all duration-200 ease-out cursor-pointer outline-none",
                    "focus-visible:ring-2 focus-visible:ring-[#ff2e88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#150d2b]",
                    selected
                      ? "text-white border-transparent shadow-[0_0_22px_rgba(255,46,136,0.35)] -translate-y-0.5"
                      : "bg-[#1d1535] border-[#2a2046] text-[#cbbef0] hover:border-[#3a2c63] hover:-translate-y-0.5",
                  ].join(" ")}
                  style={
                    selected
                      ? { background: "linear-gradient(135deg,#ff2e88,#ff7a3c)" }
                      : undefined
                  }
                >
                  <span>{m.emoji}</span> {m.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Start */}
        <div
          className="rant-fade-up flex flex-col items-center gap-3 mt-1"
          style={{ animationDelay: "360ms" }}
        >
          <button
            type="button"
            disabled={!ready}
            onClick={startRanting}
            className={[
              "px-14 py-[18px] rounded-[18px] border-none text-[19px] font-bold text-white outline-none",
              "transition-all duration-300 ease-out",
              "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#150d2b]",
              ready
                ? "cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] [animation:rant-glow-pulse_2.6s_ease-in-out_infinite] hover:[animation:none] hover:shadow-[0_0_46px_rgba(255,122,60,0.6)]"
                : "opacity-40 cursor-not-allowed",
            ].join(" ")}
            style={{
              background: "linear-gradient(135deg,#ff2e88,#ff7a3c)",
              fontFamily: display,
            }}
          >
            Start Ranting 🔥
          </button>
          <p className="m-0 text-[13px] text-[#6f6396] transition-colors duration-300">
            {ready
              ? "You're all set — let it out."
              : "Pick a vibe and a mood to begin"}
          </p>
        </div>
      </div>
      </div>
    </main>
  );
}