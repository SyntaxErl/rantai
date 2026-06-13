@AGENTS.md

# RantAI — Project Status

An AI chatbot to vent, rant, and feel better. Pick a **vibe** (Hype / Roast /
Supportive / Reframe) and a **mood** (Angry / Sad / Frustrated / Overwhelmed),
rant at the AI, and (eventually) get a summary at the end.

> This file tracks what's built and what's left. Keep it updated as you go.

---

## Stack (as actually built)

| Layer       | Tool                                  | Notes                                              |
| ----------- | ------------------------------------- | -------------------------------------------------- |
| Framework   | **Next.js 16.2.9** (App Router)       | React 19. Newer than most tutorials — see AGENTS.md |
| Styling     | Tailwind CSS v4                       | Plus custom animations in `app/globals.css`         |
| AI API      | **Google Gemini** (`@google/genai`)   | Model `gemini-2.5-flash`. Free tier, no card        |
| Database    | Supabase (Postgres)                   | **Not wired up yet**                                |
| Auth        | Supabase Auth                         | **Not wired up yet**                                |
| Deploy      | Vercel                                | **Not deployed yet**                                |

### Important: we switched off Anthropic → Gemini
The original plan used the Anthropic API, but it has no lasting free tier
(prepaid credits + card required). We swapped the chat backend to **Google
Gemini's free tier**. Only `app/api/chat/route.ts` changed; the UI is
provider-agnostic. `@anthropic-ai/sdk` is still in `package.json` but unused —
safe to remove, or keep in case you switch back later.

### Environment variables (`.env.local`, never commit)
```
GEMINI_API_KEY=AQ...            # required now — from aistudio.google.com/app/apikey
# NEXT_PUBLIC_SUPABASE_URL=     # later (Week 3)
# NEXT_PUBLIC_SUPABASE_ANON_KEY=# later (Week 3)
```

---

## ✅ Done

**Landing / setup screen** — `app/page.tsx`
Vibe + mood pickers (inlined, not using `VibeSelector.tsx`), gradient theme,
glow-pulse Start button (disabled until both picked), fade-up entrance,
focus rings, reduced-motion support. Routes to `/rant?vibe=…&mood=…`.

**Root layout** — `app/layout.tsx`
Space Grotesk (display) + DM Sans (body) via `next/font/google`, metadata.

**Shared lib**
- `lib/types.ts` — `Vibe`, `Mood`, `Message`, `RantSummary`, `RantSession`, labels.
- `lib/prompts.ts` — all 4 vibe prompts + mood context + `buildSystemPrompt()` + summary prompt.
- `lib/supabase.ts` — browser client only (server client to be added in Week 3).

**Chat API** — `app/api/chat/route.ts`  *(core of the project)*
Streaming `POST` handler. Validates `{ messages, vibe, mood }`, builds the
system prompt, calls Gemini with streaming, pipes text deltas into a Web
`ReadableStream`. Peeks the first chunk so bad-key / setup errors return a
clean JSON error instead of a broken stream.

**Chat screen** — `app/rant/page.tsx` + `components/ChatBox.tsx`
- Server component awaits `searchParams` (Next 16) and validates vibe/mood.
- `ChatBox`: live streaming, vibe-specific greeting that **types itself in** on
  load, typing dots, auto-growing Messenger-style input, themed scrollbar,
  entrance animations, friendly error bubble.

**Styles** — `app/globals.css`
Fade-up, glow-pulse, message-in, header/composer entrance, typing dots,
themed `.rant-scroll` scrollbar. All respect `prefers-reduced-motion`.

**Persistence + History (no auth yet)** — `supabase-schema.sql`, `app/history/page.tsx`, `components/HistoryCard.tsx`
After a summary is generated, `ChatBox` saves the rant to Supabase (best-effort —
skips silently if Supabase isn't configured). The History screen reads all rants
back, newest first, as expandable cards. Run `supabase-schema.sql` once in the
Supabase SQL editor. NOTE: RLS policies are permissive (dev-only) since there's
no auth yet — every rant is global. Tighten them when auth lands.
Env: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the new
**publishable** key works in the anon slot).

**Summary API** — `app/api/summary/route.ts`
Non-streaming `POST` with `{ messages }`. Calls Gemini with `SUMMARY_PROMPT`
and **structured output** (`responseMimeType: "application/json"` + a
`responseSchema`), so it returns guaranteed-valid JSON: `title`, `summary`,
`intensity` (clamped 1–10), `villain`.

**Summary screen** — `components/RantSummary.tsx` + End Rant wiring
"Rant Complete" badge, big title, 2–3 sentence summary, 10-segment intensity
meter with a flavor caption, "Villain of the Rant" card, and Rant Again /
View History buttons. `ChatBox`'s End Rant button (enabled once there's a real
message) POSTs to `/api/summary` and swaps the screen for this card.

---

## 🚧 To build

### Next up — Auth (so rants are per-user)
1. **Supabase Auth** — login / signup (email or OAuth).
2. **Set `user_id`** on insert (from the logged-in user) and **tighten RLS** so
   users only read/insert their own rants (replace the dev policies in
   `supabase-schema.sql`).
3. Optional: protect `/rant` and `/history` behind login.

### Polish + ship (Week 4)
9. Vibe-switch mid-session (the "Switch Vibe" link currently just goes home).
10. Rant streak, nicer villain badge.
11. **Deploy to Vercel** (add `GEMINI_API_KEY` + Supabase keys as env vars there).

---

## Conventions & gotchas (learned the hard way)

- **Next.js 16:** `searchParams` and `params` are **Promises** — always `await`.
- **Gemini roles:** the assistant role is `"model"`, not `"assistant"`; content
  is wrapped in `parts: [{ text }]`. The system prompt goes in
  `config.systemInstruction`.
- **Greeting is local only:** it's shown/typed in the UI but NOT sent to the API,
  because the API requires the conversation to start with a `user` message.
  `ChatBox` slices history from the first user message before sending.
- **Empty assistant bubble:** never render an assistant message with empty
  content — the typing dots stand in for it while streaming.
- **Auto-grow textarea:** height = `scrollHeight + vertical border` (box-sizing
  is border-box, so forgetting the border makes it over-scroll by ~2px).
- **API keys:** lazy-init the client and check the env var up front so a missing
  key gives a clear message and `next build` never throws at import.
- **`.env.local` only loads on server start** — restart `npm run dev` after edits.

## File map (quick reference)
```
app/
  page.tsx                 ✅ landing / setup
  layout.tsx               ✅ fonts + metadata
  globals.css              ✅ theme + animations + scrollbar
  rant/page.tsx            ✅ chat screen (server, awaits searchParams)
  history/page.tsx         ✅ history list (reads Supabase)
  api/
    chat/route.ts          ✅ streaming chat (Gemini)
    summary/route.ts       ✅ summary (Gemini structured JSON)
components/
  ChatBox.tsx              ✅ chat UI + End Rant wiring
  VibeSelector.tsx         ⚪ empty/unused (logic inlined in page.tsx — can delete)
  RantSummary.tsx          ✅ summary card
  HistoryCard.tsx          ✅ past-rant card
lib/
  types.ts                 ✅
  prompts.ts               ✅ (summary prompt already here)
  supabase.ts              ✅ browser client
```