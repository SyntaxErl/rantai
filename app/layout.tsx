// app/layout.tsx
import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import "./globals.css";

// Display font — used for the logo, headings, and buttons.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

// Body font — used for everything else.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "RantAI — Say it. All of it.",
  description: "An AI-powered space to vent, rant, and feel better.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable}`}
    >
      <body style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}