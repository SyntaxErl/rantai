// app/page.tsx
"use client";

// Marketing landing page — the first thing visitors see.
// If the user is already signed in, we skip straight to /setup so returning
// users never have to see the marketing page again.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Logo from "@/components/Logo";

const display = "var(--font-space-grotesk), sans-serif";

const VIBES = [
  { emoji: "🔥", label: "Hype Me Up", desc: "Big energy, zero chill" },
  { emoji: "😂", label: "Roast Me", desc: "No mercy, all love" },
  { emoji: "🫂", label: "Just Listen", desc: "I'll hold space" },
  { emoji: "🧠", label: "Give Perspective", desc: "Zoom out with me" },
];

const STEPS = [
  { n: "1", title: "Pick your vibe", desc: "Hype, roast, listen, or reframe." },
  { n: "2", title: "Let it all out", desc: "Rant freely — no judgment, ever." },
  { n: "3", title: "Get the recap", desc: "A title, a summary, and your villain." },
];

export default function Landing() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "guest">("checking");

  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Returning, signed-in users skip the landing entirely.
  useEffect(() => {
    if (!configured) {
      setStatus("guest");
      return;
    }
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          router.replace("/setup");
          return;
        }
      } catch {
        /* not signed in */
      }
      setStatus("guest");
    })();
  }, [configured, router]);

  // Minimal holding screen while we check the session (avoids a flash of the
  // marketing page for logged-in users).
  if (status === "checking") {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "radial-gradient(120% 70% at 50% -8%, #2c1656 0%, #150d2b 42%, #0a0712 100%)",
        }}
      >
        <span className="animate-pulse inline-flex"><Logo size={40} /></span>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-y-auto px-6 py-16 flex flex-col items-center"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -8%, #2c1656 0%, #150d2b 42%, #0a0712 100%)",
      }}
    >
      {/* Hero */}
      <section className="w-full max-w-[760px] flex flex-col items-center text-center gap-6 mt-6">
        <div className="rant-fade-up flex items-center gap-2" style={{ animationDelay: "0ms" }}>
          <Logo size={40} />
          <span className="font-bold text-[40px] leading-none tracking-[-0.03em]" style={{ fontFamily: display }}>
            RantAI
          </span>
        </div>

        <h1
          className="rant-fade-up m-0 font-bold text-[44px] md:text-[60px] leading-[1.05] tracking-[-0.03em] text-balance"
          style={{ fontFamily: display, animationDelay: "100ms" }}
        >
          Say it. All of it.
        </h1>

        <p
          className="rant-fade-up m-0 text-[18px] md:text-[20px] leading-[1.6] text-[#b7abdb] max-w-[560px]"
          style={{ animationDelay: "180ms" }}
        >
          A no-judgment space to vent, rant, and feel lighter — with an AI that hypes you up,
          roasts the situation, just listens, or helps you see it differently.
        </p>

        <div
          className="rant-fade-up flex flex-col sm:flex-row gap-3 mt-2 w-full sm:w-auto"
          style={{ animationDelay: "260ms" }}
        >
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="px-9 py-[16px] rounded-[16px] border-none text-white font-bold text-[17px] cursor-pointer transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg,#ff2e88,#ff7a3c)",
              boxShadow: "0 0 30px rgba(255,46,136,.4)",
              fontFamily: display,
            }}
          >
            Get started — it&apos;s free
          </button>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="px-9 py-[16px] rounded-[16px] font-semibold text-[17px] text-[#cbbef0] bg-transparent cursor-pointer transition-colors hover:text-white"
            style={{ border: "1.5px solid #3a2c63", fontFamily: display }}
          >
            Log in
          </button>
        </div>
      </section>

      {/* Vibes */}
      <section
        className="rant-fade-up w-full max-w-[920px] mt-20 flex flex-col items-center gap-6"
        style={{ animationDelay: "320ms" }}
      >
        <span
          className="text-[13px] tracking-[0.07em] uppercase text-[#8a7cb8] font-semibold"
          style={{ fontFamily: display }}
        >
          Four ways to rant
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {VIBES.map((v) => (
            <div
              key={v.label}
              className="flex flex-col items-start gap-2.5 text-left p-[22px] rounded-[22px]"
              style={{ background: "#1a1232", border: "1px solid #2a2046" }}
            >
              <span className="text-[34px] leading-none">{v.emoji}</span>
              <span className="font-semibold text-[18px]" style={{ fontFamily: display }}>
                {v.label}
              </span>
              <span className="text-[13px] text-[#9b8fc4]">{v.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        className="rant-fade-up w-full max-w-[920px] mt-16 grid grid-cols-1 md:grid-cols-3 gap-4"
        style={{ animationDelay: "380ms" }}
      >
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="p-6 rounded-[20px] flex flex-col gap-2"
            style={{ background: "#1a1232", border: "1px solid #2a2046" }}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-[15px]"
              style={{ background: "linear-gradient(135deg,#ff2e88,#ff7a3c)", fontFamily: display }}
            >
              {s.n}
            </span>
            <span className="font-semibold text-[17px] mt-1" style={{ fontFamily: display }}>
              {s.title}
            </span>
            <span className="text-[14px] text-[#9b8fc4] leading-[1.55]">{s.desc}</span>
          </div>
        ))}
      </section>

      {/* Bottom CTA */}
      <section
        className="rant-fade-up w-full max-w-[760px] mt-16 mb-8 flex flex-col items-center gap-4 text-center"
        style={{ animationDelay: "440ms" }}
      >
        <h2 className="m-0 font-bold text-[28px] tracking-[-0.02em]" style={{ fontFamily: display }}>
          Got something to get off your chest?
        </h2>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="px-10 py-[16px] rounded-[16px] border-none text-white font-bold text-[17px] cursor-pointer transition-transform hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg,#ff2e88,#ff7a3c)",
            boxShadow: "0 0 30px rgba(255,46,136,.4)",
            fontFamily: display,
          }}
        >
          Start ranting 🔥
        </button>
      </section>

      <footer
        className="rant-fade-up mt-6 mb-2 text-[13px] text-[#6f6396] text-center"
        style={{ animationDelay: "500ms" }}
      >
        © 2026 Erl Yves Tagaro. All rights reserved.
      </footer>
    </main>
  );
}