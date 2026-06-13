// components/ChatSidebar.tsx
"use client";

// Collapsible sidebar for the chat screen:
//   - toggle to collapse/expand
//   - New Rant button
//   - list of past rants (reads the logged-in user's rants from Supabase)
//   - profile avatar (username initials) at the bottom

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const display = "var(--font-space-grotesk), sans-serif";

type RantLite = { id: string; title: string };

export default function ChatSidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [rants, setRants] = useState<RantLite[]>([]);
  const [username, setUsername] = useState("");

  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!configured) return;
    (async () => {
      try {
        const supabase = createClient();
        const { data: u } = await supabase.auth.getUser();
        const name =
          (u.user?.user_metadata?.username as string) ||
          u.user?.email?.split("@")[0] ||
          "";
        setUsername(name);
        const { data } = await supabase
          .from("rants")
          .select("id,title")
          .order("created_at", { ascending: false })
          .limit(20);
        setRants((data ?? []) as RantLite[]);
      } catch {
        /* not signed in / not configured */
      }
    })();
  }, [configured]);

  const initials = username ? username.slice(0, 2).toUpperCase() : "?";

  return (
    <aside
      className="flex-none h-screen flex flex-col border-r border-[#221940] overflow-hidden transition-[width] duration-300 ease-out"
      style={{ width: open ? 248 : 64, background: "#140d28" }}
    >
      {/* Top: toggle + wordmark */}
      <div className="flex items-center justify-between px-3 h-[64px] flex-none border-b border-[#221940]">
        {open && (
          <span
            className="flex items-center gap-1.5 font-bold text-[18px] pl-1"
            style={{ fontFamily: display }}
          >
            <span>⚡</span> RantAI
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          className="w-9 h-9 flex-none rounded-lg flex items-center justify-center text-[#9b8fc4] hover:text-white hover:bg-[#221940] cursor-pointer transition-colors"
        >
          {open ? "«" : "»"}
        </button>
      </div>

      {/* New rant */}
      <div className="p-3 flex-none">
        <button
          type="button"
          onClick={() => router.push("/setup")}
          title="New rant"
          className="w-full flex items-center gap-2 rounded-[12px] text-white font-semibold text-[15px] cursor-pointer transition-transform hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg,#ff2e88,#ff7a3c)",
            fontFamily: display,
            padding: open ? "12px 14px" : "12px 0",
            justifyContent: open ? "flex-start" : "center",
          }}
        >
          <span className="text-[18px] leading-none">＋</span>
          {open && <span>New Rant</span>}
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto rant-scroll px-3">
        {open ? (
          <>
            <p className="px-1 mt-1 mb-2 text-[12px] uppercase tracking-[0.06em] text-[#6f6396] font-semibold">
              History
            </p>
            {rants.length === 0 ? (
              <p className="px-1 text-[13px] text-[#6f6396]">No rants yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {rants.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => router.push("/history")}
                    className="text-left px-2.5 py-2 rounded-[10px] text-[14px] text-[#cbbef0] hover:bg-[#221940] cursor-pointer truncate transition-colors"
                    title={r.title}
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/history")}
            title="History"
            className="w-full mt-1 h-10 rounded-[10px] flex items-center justify-center text-[#9b8fc4] hover:text-white hover:bg-[#221940] cursor-pointer transition-colors text-[18px]"
          >
            🕘
          </button>
        )}
      </div>

      {/* Profile */}
      <div className="flex-none p-3 border-t border-[#221940]">
        <button
          type="button"
          onClick={() => router.push("/login")}
          title={username || "Account"}
          className="w-full flex items-center gap-2.5 rounded-[12px] p-1.5 hover:bg-[#221940] cursor-pointer transition-colors"
          style={{ justifyContent: open ? "flex-start" : "center" }}
        >
          <span
            className="flex-none w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[13px]"
            style={{ background: "linear-gradient(135deg,#ff2e88,#ff7a3c)", fontFamily: display }}
          >
            {initials}
          </span>
          {open && (
            <span className="text-[14px] text-[#cbbef0] font-medium truncate">
              {username || "Account"}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}