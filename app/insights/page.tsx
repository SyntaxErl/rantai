// app/insights/page.tsx
"use client";

// Token-free insights — everything here is computed from rants you've already
// saved in Supabase (no Gemini calls). Stats + a "Rogues Gallery" of the
// villains you've ranted about most.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Vibe, Mood } from "@/lib/types";

const display = "var(--font-space-grotesk), sans-serif";

const VIBES: { key: Vibe; emoji: string; label: string }[] = [
  { key: "hype", emoji: "🔥", label: "Hype" },
  { key: "roast", emoji: "😂", label: "Roast" },
  { key: "supportive", emoji: "🫂", label: "Listen" },
  { key: "reframe", emoji: "🧠", label: "Reframe" },
];
const MOODS: { key: Mood; emoji: string; label: string }[] = [
  { key: "angry", emoji: "😡", label: "Angry" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "frustrated", emoji: "😤", label: "Frustrated" },
  { key: "overwhelmed", emoji: "😵", label: "Overwhelmed" },
];

type Row = {
  villain: string | null;
  intensity: number | null;
  vibe: Vibe;
  mood: Mood;
  created_at: string;
};

function computeStreak(dates: string[]): number {
  const days = new Set(dates.map((d) => new Date(d).toDateString()));
  const cur = new Date();
  if (!days.has(cur.toDateString())) {
    cur.setDate(cur.getDate() - 1);
    if (!days.has(cur.toDateString())) return 0; // nothing today or yesterday
  }
  let streak = 0;
  while (days.has(cur.toDateString())) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export default function InsightsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const configured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!configured) {
      setNote("Supabase isn't configured.");
      setRows([]);
      return;
    }
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("rants")
          .select("villain,intensity,vibe,mood,created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setRows((data ?? []) as Row[]);
      } catch (e) {
        setNote(e instanceof Error ? e.message : "Couldn't load your stats.");
        setRows([]);
      }
    })();
  }, []);

  // --- Derived stats ---
  const total = rows?.length ?? 0;
  const avgIntensity =
    rows && rows.length
      ? (rows.reduce((s, r) => s + (Number(r.intensity) || 0), 0) / rows.length).toFixed(1)
      : "0";
  const streak = rows ? computeStreak(rows.map((r) => r.created_at)) : 0;

  const villains = (() => {
    const counts = new Map<string, number>();
    (rows ?? []).forEach((r) => {
      const v = (r.villain || "").trim();
      if (!v || v.toLowerCase() === "unknown") return;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const topVillainCount = villains[0]?.[1] ?? 1;

  const moodCounts = MOODS.map((m) => ({
    ...m,
    count: (rows ?? []).filter((r) => r.mood === m.key).length,
  }));
  const vibeCounts = VIBES.map((v) => ({
    ...v,
    count: (rows ?? []).filter((r) => r.vibe === v.key).length,
  }));

  const loading = rows === null;

  return (
    <main
      className="h-screen overflow-y-auto rant-scroll px-6 py-10 rant-fade-in"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -8%, #2c1656 0%, #150d2b 42%, #0a0712 100%)",
      }}
    >
      <div className="max-w-[760px] mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex-none w-10 h-10 rounded-full flex items-center justify-center text-[#cbbef0] bg-[#1d1535] border border-[#2a2046] hover:border-[#3a2c63] cursor-pointer transition-colors text-[18px]"
          >
            ←
          </button>
          <h1 className="m-0 font-bold text-[34px] tracking-[-0.02em]" style={{ fontFamily: display }}>
            Your Stats
          </h1>
        </div>

        {loading ? (
          <p className="text-[#9b8fc4]">Crunching your rants…</p>
        ) : total === 0 ? (
          <div className="p-8 rounded-[20px] text-center" style={{ background: "#1a1232", border: "1px solid #2a2046" }}>
            <p className="m-0 text-[#cbbef0] text-[16px]">No rants yet — go let one out first.</p>
            <button
              type="button"
              onClick={() => router.push("/setup")}
              className="mt-4 px-6 py-3 rounded-[14px] text-white font-bold border-none cursor-pointer"
              style={{ background: "linear-gradient(135deg,#ff2e88,#ff7a3c)", fontFamily: display }}
            >
              Start a rant
            </button>
            {note && <p className="mt-3 text-[13px] text-[#ff8a8a]">{note}</p>}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total rants", value: String(total) },
                { label: "Day streak", value: `${streak}🔥` },
                { label: "Avg intensity", value: `${avgIntensity}/10` },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-4 rounded-[18px] flex flex-col gap-1"
                  style={{ background: "#1a1232", border: "1px solid #2a2046" }}
                >
                  <span className="font-bold text-[26px] tracking-[-0.02em]" style={{ fontFamily: display }}>
                    {s.value}
                  </span>
                  <span className="text-[12px] text-[#9b8fc4] uppercase tracking-[0.05em]">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Rogues Gallery */}
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="m-0 font-bold text-[22px] tracking-[-0.02em]" style={{ fontFamily: display }}>
                  🦹 Rogues Gallery
                </h2>
                <p className="mt-1 mb-0 text-[13px] text-[#9b8fc4]">The villains you keep coming back to.</p>
              </div>

              {villains.length === 0 ? (
                <p className="text-[#6f6396] text-[14px]">No named villains yet.</p>
              ) : (
                <>
                  {/* Nemesis highlight */}
                  <div
                    className="p-5 rounded-[20px] flex items-center gap-4"
                    style={{ background: "linear-gradient(135deg,rgba(255,46,136,0.16),rgba(255,122,60,0.10))", border: "1px solid #3a2c63" }}
                  >
                    <span className="text-[34px] leading-none">😈</span>
                    <div className="min-w-0">
                      <span className="text-[12px] uppercase tracking-[0.06em] text-[#ffb38a] font-semibold">
                        Your nemesis
                      </span>
                      <p className="m-0 font-bold text-[20px] truncate" style={{ fontFamily: display }}>
                        {villains[0][0]}
                      </p>
                      <span className="text-[13px] text-[#9b8fc4]">
                        {villains[0][1]} {villains[0][1] === 1 ? "rant" : "rants"}
                      </span>
                    </div>
                  </div>

                  {/* The rest */}
                  <div className="flex flex-col gap-2.5">
                    {villains.slice(1, 8).map(([name, count]) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="flex-1 min-w-0 truncate text-[15px] text-[#cbbef0]">{name}</span>
                        <div className="flex-none w-[120px] h-[8px] rounded-full overflow-hidden" style={{ background: "#241a40" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(12, (count / topVillainCount) * 100)}%`,
                              background: "linear-gradient(90deg,#ff2e88,#ff7a3c)",
                            }}
                          />
                        </div>
                        <span className="flex-none w-6 text-right text-[13px] text-[#9b8fc4]">{count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* Mood + Vibe breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Breakdown title="Moods" items={moodCounts} total={total} />
              <Breakdown title="Vibes" items={vibeCounts} total={total} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Breakdown({
  title,
  items,
  total,
}: {
  title: string;
  items: { emoji: string; label: string; count: number }[];
  total: number;
}) {
  return (
    <div className="p-5 rounded-[20px] flex flex-col gap-3" style={{ background: "#1a1232", border: "1px solid #2a2046" }}>
      <h3 className="m-0 font-semibold text-[15px] text-[#cbbef0]" style={{ fontFamily: display }}>
        {title}
      </h3>
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <span className="flex-none w-[120px] text-[14px] text-[#b7abdb]">
            {it.emoji} {it.label}
          </span>
          <div className="flex-1 h-[8px] rounded-full overflow-hidden" style={{ background: "#241a40" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: total ? `${(it.count / total) * 100}%` : "0%",
                background: "linear-gradient(90deg,#ff2e88,#ff7a3c)",
              }}
            />
          </div>
          <span className="flex-none w-6 text-right text-[13px] text-[#9b8fc4]">{it.count}</span>
        </div>
      ))}
    </div>
  );
}