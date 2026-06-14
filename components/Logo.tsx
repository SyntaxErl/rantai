// components/Logo.tsx
"use client";

// The RantAI bolt mark — gradient lightning with no background, so it sits
// cleanly inline next to the wordmark (and matches the favicon at app/icon.svg).

import { useId } from "react";

export default function Logo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const id = useId(); // unique gradient id so multiple logos can't collide

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff2e88" />
          <stop offset="1" stopColor="#ff7a3c" />
        </linearGradient>
      </defs>
      <path d="M13 2 L3 14 h9 l-1 8 10 -12 h-9 l1 -8 z" fill={`url(#${id})`} />
    </svg>
  );
}