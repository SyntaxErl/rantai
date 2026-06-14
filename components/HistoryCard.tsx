// components/HistoryCard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

// Trash icon (inline SVG, inherits color via currentColor).
function TrashIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export default function HistoryCard({
  rant,
  onDelete,
  defaultOpen = false,
}: {
  rant: RantSession;
  onDelete: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // If opened via a sidebar click: scroll into view, then expand a beat later
  // so the reveal actually animates (rather than appearing already open).
  useEffect(() => {
    if (!defaultOpen) return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(t);
  }, [defaultOpen]);

  function confirmDelete() {
    setConfirmOpen(false);
    setDeleting(true);
    onDelete(rant.id);
  }

  return (
    <div
      ref={cardRef}
      className="rant-msg-in w-full p-5 rounded-[18px] transition-opacity"
      style={{ background: "#1a1232", border: "1px solid #2a2046", opacity: deleting ? 0.5 : 1 }}
    >
      <div className="flex items-start gap-2">
        {/* Clickable area toggles the card open/closed. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex-1 min-w-0 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className="font-semibold text-[17px] text-[#f4f0ff] truncate"
              style={{ fontFamily: display }}
            >
              {rant.title}
            </span>
            <span className="flex-none flex items-center gap-3">
              <span className="text-[13px] text-[#ff7a3c] font-semibold">
                {rant.intensity}/10
              </span>
              <span
                className="text-[#8a7cb8] text-[12px] transition-transform duration-300"
                style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
                aria-hidden="true"
              >
                ▾
              </span>
            </span>
          </div>
          <div className="mt-1.5 text-[13px] text-[#9b8fc4]">
            {formatDate(rant.created_at)} · {VIBE_EMOJI[rant.vibe]} {MOOD_EMOJI[rant.mood]}
          </div>
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
          aria-label="Delete rant"
          title="Delete rant"
          className="flex-none w-9 h-9 rounded-[10px] flex items-center justify-center text-[#8a7cb8] hover:text-[#ff6b6b] hover:bg-[rgba(229,72,77,0.12)] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Animated reveal */}
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
            <p className="m-0 text-[15px] leading-[1.6] text-[#cbbef0]">{rant.summary}</p>
            {rant.villain && (
              <span className="text-[13px] text-[#8a7cb8]">
                Villain:{" "}
                <span className="text-[#ffb38a] font-semibold">{rant.villain}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation modal — portaled to <body> so the card's transform
          (rant-msg-in) doesn't trap this fixed overlay inside the card. */}
      {confirmOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 rant-fade-in"
          style={{ background: "rgba(8,5,18,0.72)" }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="rant-modal-in w-full max-w-[360px] p-6 rounded-[20px] text-center"
            style={{ background: "#1a1232", border: "1px solid #2a2046" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-12 h-12 mx-auto mb-3.5 rounded-full flex items-center justify-center text-[#ff6b6b]"
              style={{ background: "rgba(229,72,77,0.14)" }}
            >
              <TrashIcon size={22} />
            </div>
            <h3 className="m-0 font-bold text-[19px] text-[#f4f0ff]" style={{ fontFamily: display }}>
              Delete this rant?
            </h3>
            <p className="mt-2 mb-1 text-[14px] text-[#cbbef0] truncate">“{rant.title}”</p>
            <p className="mt-0 mb-5 text-[13px] text-[#9b8fc4]">This can&apos;t be undone.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-3 rounded-[14px] font-semibold text-[15px] text-[#cbbef0] bg-transparent cursor-pointer transition-colors hover:bg-[#241a40]"
                style={{ border: "1.5px solid #3a2c63", fontFamily: display }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-[14px] font-semibold text-[15px] text-white border-none cursor-pointer transition-transform hover:-translate-y-0.5"
                style={{ background: "#e5484d", fontFamily: display }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}