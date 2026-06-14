// components/ChatSidebar.tsx
"use client";

// Responsive sidebar for the chat screen.
//   Desktop (md+): inline, collapsible to an icon rail via « / ».
//   Mobile (<md): hidden off-canvas; opened as a drawer via the header burger,
//                 with a tap-to-close backdrop.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Logo from "@/components/Logo";

const display = "var(--font-space-grotesk), sans-serif";

type RantLite = { id: string; title: string };

export default function ChatSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false); // desktop only
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

  const expanded = !collapsed; // collapse only happens on desktop
  const initials = username ? username.slice(0, 2).toUpperCase() : "?";

  // Navigate, and on mobile also close the drawer.
  function go(path: string) {
    router.push(path);
    onClose();
  }

  return (
    <>
      {/* Mobile backdrop (fades with the drawer) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`flex flex-col h-screen border-r border-[#221940] overflow-hidden
          fixed top-0 left-0 z-50 transition-all duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:z-auto`}
        style={{ width: expanded ? 248 : 64, background: "#140d28" }}
      >
        {/* Top: toggle + wordmark */}
        <div
          className={`flex items-center px-3 h-[64px] flex-none border-b border-[#221940] ${
            expanded ? "justify-between" : "justify-center"
          }`}
        >
          {expanded && (
            <span
              className="flex items-center gap-1.5 font-bold text-[18px] pl-1"
              style={{ fontFamily: display }}
            >
              <Logo size={24} /> RantAI
            </span>
          )}
          {/* Desktop collapse */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:flex w-9 h-9 flex-none rounded-lg items-center justify-center text-[#9b8fc4] hover:text-white hover:bg-[#221940] cursor-pointer transition-colors"
          >
            {collapsed ? "»" : "«"}
          </button>
          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="md:hidden w-9 h-9 flex-none rounded-lg flex items-center justify-center text-[#9b8fc4] hover:text-white hover:bg-[#221940] cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* New rant */}
        <div className="p-3 flex-none">
          <button
            type="button"
            onClick={() => go("/setup")}
            title="New rant"
            className="w-full flex items-center gap-2 rounded-[12px] text-white font-semibold text-[15px] cursor-pointer transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg,#ff2e88,#ff7a3c)",
              fontFamily: display,
              padding: expanded ? "12px 14px" : "12px 0",
              justifyContent: expanded ? "flex-start" : "center",
            }}
          >
            <span className="text-[18px] leading-none">＋</span>
            {expanded && <span>New Rant</span>}
          </button>

          <button
            type="button"
            onClick={() => go("/insights")}
            title="Stats"
            className="w-full mt-2 flex items-center gap-2 rounded-[12px] text-[#cbbef0] font-medium text-[14px] cursor-pointer transition-colors hover:bg-[#221940]"
            style={{
              padding: expanded ? "10px 14px" : "10px 0",
              justifyContent: expanded ? "flex-start" : "center",
            }}
          >
            <span className="text-[16px] leading-none">📊</span>
            {expanded && <span>Stats</span>}
          </button>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto rant-scroll px-3">
          {expanded ? (
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
                      onClick={() => go(`/history?open=${r.id}`)}
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
              onClick={() => go("/history")}
              title="History"
              className="w-full mt-1 h-10 rounded-[10px] flex items-center justify-center text-[#9b8fc4] hover:text-white hover:bg-[#221940] cursor-pointer transition-colors text-[18px]"
            >
              🕘
            </button>
          )}
        </div>

        {/* Profile — height matched to the chat composer so the bottom border lines up */}
        <div className="flex-none h-[96px] px-3 flex items-center border-t border-[#221940]">
          <button
            type="button"
            onClick={() => go("/login")}
            title={username || "Account"}
            className="w-full flex items-center gap-2.5 rounded-[12px] p-1.5 hover:bg-[#221940] cursor-pointer transition-colors"
            style={{ justifyContent: expanded ? "flex-start" : "center" }}
          >
            <span
              className="flex-none w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[13px]"
              style={{ background: "linear-gradient(135deg,#ff2e88,#ff7a3c)", fontFamily: display }}
            >
              {initials}
            </span>
            {expanded && (
              <span className="text-[14px] text-[#cbbef0] font-medium truncate">
                {username || "Account"}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}