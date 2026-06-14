// app/history/page.tsx
"use client";

// Screen 4: Rant History — lists past rants saved to Supabase.
// Client component: reads directly from Supabase with the public key.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import HistoryCard from "@/components/HistoryCard";
import type { RantSession } from "@/lib/types";

const display = "var(--font-space-grotesk), sans-serif";

export default function HistoryPage() {
  const router = useRouter();
  const [rants, setRants] = useState<RantSession[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Which rant to auto-expand (set when arriving from a sidebar history click).
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get("open");
      if (id) setOpenId(id);
    } catch {
      /* ignore */
    }
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setNote("Supabase isn't configured yet — add your keys to .env.local to save and see rants.");
      setRants([]);
      return;
    }
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("rants")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setRants((data ?? []) as RantSession[]);
      } catch (e) {
        setNote(e instanceof Error ? e.message : "Couldn't load your rants.");
        setRants([]);
      }
    })();
  }, []);

  async function handleDelete(id: string) {
    const prev = rants;
    // Optimistically remove from the list.
    setRants((cur) => (cur ? cur.filter((r) => r.id !== id) : cur));
    try {
      const supabase = createClient();
      const { error } = await supabase.from("rants").delete().eq("id", id);
      if (error) throw error;
    } catch (e) {
      setRants(prev ?? null); // revert on failure
      setNote(e instanceof Error ? e.message : "Couldn't delete that rant.");
    }
  }

  return (
    <main
      className="min-h-screen overflow-y-auto px-6 py-14 flex justify-center rant-fade-in"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -8%, #2c1656 0%, #150d2b 42%, #0a0712 100%)",
      }}
    >
      <div className="w-full max-w-[720px] flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex-none w-10 h-10 rounded-full flex items-center justify-center text-[#cbbef0] bg-[#1d1535] border border-[#2a2046] hover:border-[#3a2c63] cursor-pointer transition-colors text-[18px]"
            >
              ←
            </button>
            <h1
              className="m-0 font-bold text-[34px] tracking-[-0.02em]"
              style={{ fontFamily: display }}
            >
              Your Rants
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/setup")}
            className="flex-none px-5 py-2.5 rounded-full text-white font-semibold text-[14px] cursor-pointer transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg,#ff2e88,#ff7a3c)",
              fontFamily: display,
            }}
          >
            + New Rant
          </button>
        </div>

        {/* States */}
        {rants === null && (
          <p className="text-[#9b8fc4] text-[15px]">Loading your rants…</p>
        )}

        {rants !== null && rants.length === 0 && (
          <div
            className="rant-msg-in p-6 rounded-[18px] text-center text-[#9b8fc4]"
            style={{ background: "#1a1232", border: "1px solid #2a2046" }}
          >
            {note ?? "No rants yet — go let something out, then end the rant to save it here."}
          </div>
        )}

        {rants && rants.length > 0 && (
          <div className="flex flex-col gap-3">
            {rants.map((r) => (
              <HistoryCard key={r.id} rant={r} onDelete={handleDelete} defaultOpen={r.id === openId} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}