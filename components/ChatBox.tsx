// components/ChatBox.tsx
"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import RantSummary from "@/components/RantSummary";
import ChatSidebar from "@/components/ChatSidebar";
import { createClient } from "@/lib/supabase";
import type { Vibe, Mood, Message, RantSummary as RantSummaryData } from "@/lib/types";

const display = "var(--font-space-grotesk), sans-serif";

// Badge label + emoji per vibe, and the opening line the AI greets with.
// The greeting is shown locally (typed out on load) so the screen isn't empty
// on arrival; it is NOT sent to the API (the API requires the first message to
// be a user message).
const VIBE_META: Record<Vibe, { emoji: string; label: string; greeting: string }> = {
  hype: {
    emoji: "🔥",
    label: "Hype Mode",
    greeting: "I'm all yours. No judgment here — what's got you fired up? 🔥",
  },
  roast: {
    emoji: "😂",
    label: "Roast Mode",
    greeting: "Alright, lay it on me. What ridiculous thing happened? 😏",
  },
  supportive: {
    emoji: "🫂",
    label: "Listening",
    greeting: "I'm here, and I'm listening. Take your time — what's going on?",
  },
  reframe: {
    emoji: "🧠",
    label: "Perspective",
    greeting: "I'm here with you. Tell me what happened and we'll look at it together.",
  },
};

const MOOD_EMOJI: Record<Mood, string> = {
  angry: "😡",
  sad: "😢",
  frustrated: "😤",
  overwhelmed: "😵",
};

const ACTIVE_KEY = "rantai:active";

const VIBE_KEYS: Vibe[] = ["hype", "roast", "supportive", "reframe"];

// A chat message, plus optional local-only "system" markers (e.g. a vibe-switch
// divider) that are shown in the UI but never sent to the API or saved.
type ChatMsg = Message & { system?: boolean };

// Load an in-progress rant (matched by mood, since the vibe can change mid-rant)
// so returning from History etc. restores the conversation — and the vibe it was
// last on — instead of starting over.
function loadActive(mood: Mood): { messages: ChatMsg[]; vibe: Vibe } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { vibe?: Vibe; mood?: string; messages?: ChatMsg[] };
    if (
      saved.mood === mood &&
      saved.vibe &&
      Array.isArray(saved.messages) &&
      saved.messages.length > 0
    ) {
      return { messages: saved.messages, vibe: saved.vibe };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function ChatBox({ vibe: initialVibe, mood }: { vibe: Vibe; mood: Mood }) {
  const [vibe, setVibe] = useState<Vibe>(() => loadActive(mood)?.vibe ?? initialVibe);
  const [vibeMenuOpen, setVibeMenuOpen] = useState(false);
  const meta = VIBE_META[vibe];

  const [messages, setMessages] = useState<ChatMsg[]>(() => loadActive(mood)?.messages ?? []);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinking, setThinking] = useState(false); // controls the typing dots
  const [greetingDone, setGreetingDone] = useState<boolean>(() => loadActive(mood) !== null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RantSummaryData | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // mobile sidebar drawer

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Greeting "typing" animation on mount --------------------------------
  // Show the dots for a beat, then type the greeting out character by
  // character, like the AI is composing it.
  useEffect(() => {
    if (greetingDone) return; // restored from a previous view — skip the greeting
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const full = meta.greeting;

    setThinking(true);
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        let i = 0;
        const type = () => {
          if (cancelled) return;
          i += 1;
          if (i === 1) setThinking(false); // swap dots → text on first char
          setMessages([{ role: "assistant", content: full.slice(0, i) }]);
          if (i < full.length) {
            timers.push(setTimeout(type, 20));
          } else {
            setGreetingDone(true);
          }
        };
        timers.push(setTimeout(type, 20));
      }, 700),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the latest message / dots in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  // Auto-grow the input with its content (like Messenger), up to a max height
  // after which it scrolls. Runs whenever the text changes — including when we
  // clear it after sending, which snaps it back to one line.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto"; // reset so it can shrink, not just grow
    // scrollHeight excludes the border, but with box-sizing: border-box the
    // height we set includes it — so add the border back or it over-scrolls by
    // ~2px and shows a scrollbar even when empty.
    const cs = window.getComputedStyle(el);
    const borderY =
      parseFloat(cs.borderTopWidth || "0") + parseFloat(cs.borderBottomWidth || "0");
    el.style.height = `${Math.min(el.scrollHeight + borderY, 160)}px`;
  }, [input]);

  // Keep the input focused after sending (and once the greeting finishes), so
  // you can keep typing without clicking back into the box each time.
  useEffect(() => {
    if (greetingDone && !isStreaming && !summarizing) {
      textareaRef.current?.focus();
    }
  }, [greetingDone, isStreaming, summarizing]);

  // Save the active rant so it survives leaving the page (e.g. opening History)
  // and coming back. Cleared on End Rant and when a new rant is started (/setup).
  useEffect(() => {
    if (typeof window === "undefined" || !greetingDone) return;
    try {
      sessionStorage.setItem(ACTIVE_KEY, JSON.stringify({ vibe, mood, messages }));
    } catch {
      /* ignore (storage unavailable / quota) */
    }
  }, [messages, greetingDone, vibe, mood]);

  async function send() {
    const text = input.trim();
    if (!text || isStreaming || !greetingDone) return;

    setError(null);
    const userMsg: ChatMsg = { role: "user", content: text };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setInput("");
    setIsStreaming(true);
    setThinking(true);

    // Build the API payload from the first USER message (drops the greeting) and
    // strips local-only markers (e.g. vibe-switch dividers).
    const firstUser = withUser.findIndex((m) => m.role === "user");
    const apiMessages = withUser.slice(firstUser).filter((m) => !m.system);

    // Empty assistant slot we stream into (it is not rendered while empty).
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, vibe, mood }),
      });

      if (!res.ok || !res.body) {
        let detail = "";
        try {
          const data = await res.json();
          detail = data?.error ?? "";
        } catch {
          /* non-JSON response */
        }
        throw new Error(detail || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (firstChunk) {
          setThinking(false); // dots → text as soon as the reply starts
          firstChunk = false;
        }
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content === "") return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setIsStreaming(false);
      setThinking(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // End the rant → ask the server for a summary, then show the summary screen.
  async function endRant() {
    if (summarizing || isStreaming) return;
    const firstUser = messages.findIndex((m) => m.role === "user");
    if (firstUser === -1) return; // nothing to summarize yet

    setError(null);
    setSummarizing(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.slice(firstUser).filter((m) => !m.system) }),
      });
      if (!res.ok) {
        let detail = "";
        try {
          const data = await res.json();
          detail = data?.error ?? "";
        } catch {
          /* non-JSON */
        }
        throw new Error(detail || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as RantSummaryData;
      setSummary(data);

      // The rant is finished — clear the saved draft so returning here starts fresh.
      try {
        sessionStorage.removeItem(ACTIVE_KEY);
      } catch {
        /* ignore */
      }

      // Best-effort save to Supabase. Skips silently if it isn't configured
      // yet, and never blocks showing the summary.
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        try {
          const supabase = createClient();
          await supabase.from("rants").insert({
            vibe,
            mood,
            title: data.title,
            summary: data.summary,
            intensity: data.intensity,
            villain: data.villain,
            messages: messages.slice(firstUser).filter((m) => !m.system),
          });
        } catch (saveErr) {
          console.error("[rant save] failed:", saveErr);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't end the rant.");
    } finally {
      setSummarizing(false);
    }
  }

  function switchVibe(next: Vibe) {
    setVibeMenuOpen(false);
    if (next === vibe) return;
    setVibe(next);
    // Local-only divider so the tone change is visible in the transcript
    // (filtered out of API calls and saves, so it costs no tokens).
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Switched to ${VIBE_META[next].emoji} ${VIBE_META[next].label}`,
        system: true,
      },
    ]);
  }

  const canEnd =
    greetingDone && !isStreaming && !summarizing && messages.some((m) => m.role === "user");

  const composerDisabled = isStreaming || !greetingDone || summarizing;

  // Once the rant is summarized, swap the whole screen for the summary card.
  if (summary) {
    return <RantSummary summary={summary} />;
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <ChatSidebar mobileOpen={navOpen} onClose={() => setNavOpen(false)} />
      <main
        className="flex flex-col flex-1 h-dvh overflow-hidden rant-fade-in"
        style={{
          background:
            "radial-gradient(120% 60% at 50% -8%, #2c1656 0%, #150d2b 42%, #0a0712 100%)",
        }}
      >
      {/* Header */}
      <header className="rant-enter-down relative z-30 flex-none flex items-center justify-between px-3 md:px-7 h-[64px] border-b border-[#221940]">
        <div className="flex items-center gap-2.5 md:gap-3.5">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            className="md:hidden w-9 h-9 flex-none rounded-lg flex items-center justify-center text-[#cbbef0] hover:bg-[#221940] cursor-pointer transition-colors text-[18px]"
          >
            ☰
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setVibeMenuOpen((o) => !o)}
              disabled={isStreaming || summarizing || !greetingDone}
              title="Switch vibe"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-semibold cursor-pointer transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background:
                  "linear-gradient(135deg,rgba(255,46,136,.18),rgba(255,122,60,.18))",
                border: "1px solid #4a2a4f",
                color: "#ffb38a",
              }}
            >
              {meta.emoji} {meta.label} <span className="opacity-70">· {MOOD_EMOJI[mood]}</span>
              <span className="opacity-70 text-[11px]">▾</span>
            </button>

            {vibeMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setVibeMenuOpen(false)} />
                <div
                  className="rant-pop absolute left-0 mt-2 z-40 w-52 rounded-[14px] p-1.5"
                  style={{ background: "#1a1232", border: "1px solid #2a2046" }}
                >
                  <p className="px-3 pt-1 pb-1.5 text-[11px] uppercase tracking-[0.06em] text-[#6f6396] font-semibold">
                    Switch vibe
                  </p>
                  {VIBE_KEYS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => switchVibe(v)}
                      className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-[10px] cursor-pointer transition-colors hover:bg-[#241a40]"
                      style={{ color: v === vibe ? "#ffb38a" : "#cbbef0" }}
                    >
                      <span className="text-[18px]">{VIBE_META[v].emoji}</span>
                      <span className="text-[14px] font-medium">{VIBE_META[v].label}</span>
                      {v === vibe && <span className="ml-auto text-[12px]">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* End Rant → generates the summary screen. */}
        <button
          type="button"
          onClick={endRant}
          disabled={!canEnd}
          title={canEnd ? "Wrap up and see your summary" : "Send a message first"}
          className="px-[18px] py-[9px] rounded-full text-[14px] font-semibold transition-all enabled:cursor-pointer enabled:hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            border: "1.5px solid #ff2e88",
            background: "rgba(255,46,136,.08)",
            color: "#ff6aa6",
          }}
        >
          {summarizing ? "Ending…" : "End Rant"}
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="rant-scroll flex-1 overflow-y-auto px-5 md:px-7 py-7 flex flex-col items-center">
        <div className="w-full max-w-[760px] flex flex-col gap-[18px]">
          {messages.map((m, i) => {
            if (m.system) {
              return (
                <div
                  key={i}
                  className="rant-msg-in self-center my-1 flex items-center gap-2 text-[12px] text-[#8a7cb8]"
                >
                  <span className="h-px w-8" style={{ background: "#2e2350" }} />
                  {m.content}
                  <span className="h-px w-8" style={{ background: "#2e2350" }} />
                </div>
              );
            }
            if (m.role === "assistant") {
              // Don't render the empty streaming slot — the dots stand in for it.
              if (m.content === "") return null;
              return (
                <div
                  key={i}
                  className="rant-msg-in max-w-[80%] self-start px-[19px] py-[15px] text-[16px] leading-[1.55] whitespace-pre-wrap"
                  style={{
                    borderRadius: "22px 22px 22px 7px",
                    background: "#241a40",
                    color: "#ece6ff",
                  }}
                >
                  {m.content}
                </div>
              );
            }
            return (
              <div
                key={i}
                className="rant-msg-in max-w-[80%] self-end px-[19px] py-[15px] text-[16px] leading-[1.55] text-white whitespace-pre-wrap"
                style={{
                  borderRadius: "22px 22px 7px 22px",
                  background: "linear-gradient(135deg,#ff2e88,#ff7a3c)",
                  boxShadow: "0 8px 22px rgba(255,46,136,.28)",
                }}
              >
                {m.content}
              </div>
            );
          })}

          {/* Typing indicator (greeting load + while awaiting a reply). */}
          {thinking && (
            <div className="rant-msg-in self-start flex gap-1.5 px-1 py-1.5">
              <span className="rant-typing-dot" />
              <span className="rant-typing-dot" style={{ animationDelay: ".2s" }} />
              <span className="rant-typing-dot" style={{ animationDelay: ".4s" }} />
            </div>
          )}

          {error && (
            <div className="self-center text-[13px] text-[#ff8a8a] bg-[#2a1622] border border-[#4a2030] rounded-xl px-4 py-2">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="rant-enter-up flex-none min-h-[96px] px-5 md:px-7 py-[14px] border-t border-[#221940] flex items-center justify-center">
        <div className="w-full max-w-[760px] flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={greetingDone ? "Let it all out…" : "…"}
            disabled={composerDisabled}
            className="rant-scroll flex-1 resize-none overflow-y-auto px-[22px] py-[15px] rounded-[26px] text-[16px] leading-[1.4] text-[#f4f0ff] placeholder:text-[#7d70a6] outline-none disabled:opacity-60 focus:border-[#3a2c63] transition-colors"
            style={{ background: "#1d1535", border: "1px solid #2e2350" }}
          />
          <button
            type="button"
            onClick={send}
            disabled={composerDisabled || input.trim() === ""}
            aria-label="Send"
            className="flex-none w-[52px] h-[52px] rounded-full border-none text-white text-[22px] cursor-pointer flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg,#ff2e88,#ff7a3c)",
              boxShadow: "0 0 22px rgba(255,46,136,.45)",
            }}
          >
            ↑
          </button>
        </div>
      </div>
      </main>
    </div>
  );
}