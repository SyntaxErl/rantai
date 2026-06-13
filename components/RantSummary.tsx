// components/RantSummary.tsx
"use client";

import { useRouter } from "next/navigation";
import type { RantSummary as RantSummaryData } from "@/lib/types";

const display = "var(--font-space-grotesk), sans-serif";

// A little flavor caption for the intensity meter.
function intensityCaption(n: number): string {
  if (n <= 2) return "😌 Barely a vent";
  if (n <= 4) return "😤 Mild heat";
  if (n <= 6) return "🔥 Properly fired up";
  if (n <= 8) return "🔥 Full meltdown";
  return "🌋 Total nuclear";
}

export default function RantSummary({
  summary,
  onRantAgain,
}: {
  summary: RantSummaryData;
  onRantAgain?: () => void;
}) {
  const router = useRouter();
  const filled = Math.max(0, Math.min(10, summary.intensity));

  return (
    <main
      className="min-h-screen overflow-y-auto flex items-center justify-center px-6 py-14 rant-fade-in"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -8%, #2c1656 0%, #150d2b 42%, #0a0712 100%)",
      }}
    >
      <div className="w-full max-w-[760px] flex flex-col gap-6">
        {/* Complete badge */}
        <span
          className="rant-msg-in self-start inline-flex items-center gap-2 px-[15px] py-[7px] rounded-full text-[13px] font-semibold uppercase tracking-[0.04em]"
          style={{
            background: "rgba(110,255,180,.1)",
            border: "1px solid rgba(110,255,180,.3)",
            color: "#7fffc4",
          }}
        >
          ✓ Rant Complete
        </span>

        {/* Title + summary */}
        <h1
          className="rant-msg-in m-0 font-bold text-[40px] md:text-[50px] leading-[1.08] tracking-[-0.03em] text-balance"
          style={{ fontFamily: display }}
        >
          {summary.title}
        </h1>
        <p className="rant-msg-in m-0 text-[18px] leading-[1.65] text-[#b7abdb] max-w-[620px]">
          {summary.summary}
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
          {/* Intensity */}
          <div
            className="rant-msg-in p-6 rounded-[24px] flex flex-col gap-4"
            style={{ background: "#1a1232", border: "1px solid #2a2046" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[12px] tracking-[0.06em] uppercase text-[#8a7cb8] font-semibold"
                style={{ fontFamily: display }}
              >
                Intensity
              </span>
              <span
                className="font-bold text-[22px] text-[#ff7a3c]"
                style={{ fontFamily: display }}
              >
                {filled}/10
              </span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className="flex-1 h-[14px] rounded-[5px]"
                  style={
                    i < filled
                      ? {
                          background: "linear-gradient(90deg,#ff2e88,#ff7a3c)",
                          boxShadow: "0 0 10px rgba(255,80,110,.5)",
                        }
                      : { background: "#2a2046" }
                  }
                />
              ))}
            </div>
            <span className="text-[16px] text-[#ffb38a] font-semibold">
              {intensityCaption(filled)}
            </span>
          </div>

          {/* Villain */}
          <div
            className="rant-msg-in p-6 rounded-[24px] flex flex-col gap-3.5 justify-center"
            style={{
              background:
                "linear-gradient(135deg,rgba(255,46,136,.12),rgba(255,122,60,.06))",
              border: "1px solid #3a2350",
            }}
          >
            <span
              className="text-[12px] tracking-[0.06em] uppercase text-[#8a7cb8] font-semibold"
              style={{ fontFamily: display }}
            >
              Villain of the Rant
            </span>
            <span
              className="w-[54px] h-[54px] rounded-[16px] flex items-center justify-center text-[28px]"
              style={{ background: "#241a40", boxShadow: "0 0 18px rgba(255,46,136,.25)" }}
            >
              👤
            </span>
            <span className="font-bold text-[22px]" style={{ fontFamily: display }}>
              {summary.villain}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="rant-msg-in flex flex-col sm:flex-row gap-3 mt-2">
          <button
            type="button"
            onClick={() => (onRantAgain ? onRantAgain() : router.push("/setup"))}
            className="flex-1 py-[17px] rounded-[18px] border-none text-white font-bold text-[17px] cursor-pointer transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg,#ff2e88,#ff7a3c)",
              boxShadow: "0 0 26px rgba(255,46,136,.4)",
              fontFamily: display,
            }}
          >
            Rant Again 🔥
          </button>
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="flex-1 py-[17px] rounded-[18px] font-semibold text-[17px] text-[#cbbef0] cursor-pointer bg-transparent transition-colors hover:text-white"
            style={{ border: "1.5px solid #3a2c63", fontFamily: display }}
          >
            View History
          </button>
        </div>
      </div>
    </main>
  );
}