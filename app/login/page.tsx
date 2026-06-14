// app/login/page.tsx
"use client";

// Auth page.
// - Sign up: username + email + password (+ confirm) with a strength meter.
// - Sign in: "username or email" + password (username is resolved to an email).
// Supabase logs in by email, so username login looks up the email first via
// the email_for_username() function (see supabase-username.sql).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Logo from "@/components/Logo";

const display = "var(--font-space-grotesk), sans-serif";
const inputCls =
  "w-full px-[18px] py-[14px] rounded-[14px] text-[16px] text-[#f4f0ff] placeholder:text-[#7d70a6] outline-none focus:border-[#ff2e88] transition-colors";
const inputStyle = { background: "#1d1535", border: "1px solid #2e2350" };

// 0–4 strength score from length + character variety.
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(s, 4);
  const meta = [
    { label: "Too weak", color: "#ff5a5a" },
    { label: "Weak", color: "#ff5a5a" },
    { label: "Fair", color: "#ff9a3c" },
    { label: "Good", color: "#ffd23c" },
    { label: "Strong", color: "#7fffc4" },
  ][score];
  return { score, ...meta };
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loginId, setLoginId] = useState(""); // sign-in: username or email
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const strength = passwordStrength(password);

  useEffect(() => {
    if (!configured) {
      setChecked(true);
      return;
    }
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        setUserEmail(data.user?.email ?? null);
      } catch {
        /* not signed in */
      } finally {
        setChecked(true);
      }
    })();
  }, [configured]);

  async function submit() {
    if (busy) return;
    setError(null);
    setInfo(null);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        // --- validate ---
        const uname = username.trim();
        if (!uname || !email || !password) {
          setError("Fill in username, email, and password.");
          return;
        }
        if (uname.length < 3) {
          setError("Username must be at least 3 characters.");
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }
        if (password !== confirm) {
          setError("Passwords don't match.");
          return;
        }
        setBusy(true);

        // username already taken?
        const { data: taken } = await supabase.rpc("email_for_username", { uname });
        if (taken) {
          setError("That username is taken — try another.");
          return;
        }

        // create the auth user (username also stored in metadata)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: uname } },
        });
        if (error) throw error;

        // with email confirmation off, we have a session → save the profile
        if (data.session && data.user) {
          const { error: pErr } = await supabase
            .from("profiles")
            .insert({ id: data.user.id, username: uname, email });
          if (pErr) throw pErr;
          router.push("/setup");
          router.refresh();
        } else {
          setInfo("Check your email to confirm your account, then sign in.");
          setMode("signin");
        }
      } else {
        // --- sign in: resolve username -> email if needed ---
        const id = loginId.trim();
        if (!id || !password) {
          setError("Enter your username/email and password.");
          return;
        }
        setBusy(true);

        let loginEmail = id;
        if (!id.includes("@")) {
          const { data: found, error: rpcErr } = await supabase.rpc("email_for_username", {
            uname: id,
          });
          if (rpcErr) throw rpcErr;
          if (!found) {
            setError("No account found with that username.");
            return;
          }
          loginEmail = found as string;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) throw error;
        router.push("/setup");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUserEmail(null);
    } catch {
      /* ignore */
    }
  }

  function switchMode() {
    setMode((m) => (m === "signup" ? "signin" : "signup"));
    setError(null);
    setInfo(null);
    setConfirm("");
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-16 rant-fade-in"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -8%, #2c1656 0%, #150d2b 42%, #0a0712 100%)",
      }}
    >
      <div className="w-full max-w-[400px] flex flex-col items-center gap-6">
        {/* Centered wordmark */}
        <div className="rant-msg-in flex items-center justify-center gap-2" style={{ animationDelay: "0s" }}>
          <Logo size={32} />
          <span
            className="font-bold text-[32px] leading-none tracking-[-0.03em]"
            style={{ fontFamily: display }}
          >
            RantAI
          </span>
        </div>

        {!configured && (
          <p className="text-[#ff8a8a] text-[14px] text-center">
            Supabase isn&apos;t configured — add your keys to .env.local.
          </p>
        )}

        {checked && userEmail ? (
          <div className="w-full flex flex-col gap-4 text-center">
            <p className="rant-msg-in text-[#b7abdb] text-[15px]">
              Signed in as <span className="text-[#f4f0ff] font-semibold">{userEmail}</span>
            </p>
            <button
              type="button"
              onClick={() => router.push("/setup")}
              className="rant-msg-in w-full py-[15px] rounded-[16px] border-none text-white font-bold text-[16px] cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg,#ff2e88,#ff7a3c)", fontFamily: display, animationDelay: "0.06s" }}
            >
              Start ranting
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rant-msg-in w-full py-[13px] rounded-[16px] font-semibold text-[15px] text-[#cbbef0] bg-transparent cursor-pointer"
              style={{ border: "1.5px solid #3a2c63", fontFamily: display, animationDelay: "0.12s" }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="w-full">
            {/* Google placeholder */}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setInfo("Google sign-in is coming soon — use username/email for now.");
              }}
              className="rant-msg-in w-full mb-4 flex items-center justify-center gap-3 py-[14px] rounded-[14px] bg-white text-[#1f1f1f] font-semibold text-[15px] cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ animationDelay: "0.06s" }}
            >
              <span className="font-bold text-[18px]" style={{ color: "#4285F4" }}>G</span>
              Continue with Google
            </button>

            <div className="rant-msg-in flex items-center gap-3 mb-4 text-[12px] text-[#7d70a6]" style={{ animationDelay: "0.12s" }}>
              <span className="flex-1 h-px bg-[#2e2350]" />
              or
              <span className="flex-1 h-px bg-[#2e2350]" />
            </div>

            {/* Sign-in: single "username or email" field */}
            {mode === "signin" && (
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Username or email"
                autoComplete="username"
                className={`rant-msg-in mb-3.5 ${inputCls}`}
                style={{ ...inputStyle, animationDelay: "0.17s" }}
              />
            )}

            {/* Sign-up: username + email */}
            <div
              className="grid"
              style={{
                gridTemplateRows: mode === "signup" ? "1fr" : "0fr",
                opacity: mode === "signup" ? 1 : 0,
                transition: "grid-template-rows 0.3s ease, opacity 0.3s ease",
              }}
            >
              <div className="overflow-hidden">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Username"
                  autoComplete="username"
                  tabIndex={mode === "signup" ? 0 : -1}
                  className={`mb-3.5 ${inputCls}`}
                  style={inputStyle}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="you@email.com"
                  autoComplete="email"
                  tabIndex={mode === "signup" ? 0 : -1}
                  className={`mb-3.5 ${inputCls}`}
                  style={inputStyle}
                />
              </div>
            </div>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={`rant-msg-in mb-3 ${inputCls}`}
              style={{ ...inputStyle, animationDelay: "0.22s" }}
            />

            {/* Strength meter (sign-up only, once typing) */}
            <div
              className="grid"
              style={{
                gridTemplateRows: mode === "signup" && password ? "1fr" : "0fr",
                opacity: mode === "signup" && password ? 1 : 0,
                transition: "grid-template-rows 0.25s ease, opacity 0.25s ease",
              }}
            >
              <div className="overflow-hidden">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex-1 flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="flex-1 h-[5px] rounded-full transition-colors"
                        style={{
                          background: i < strength.score ? strength.color : "#2a2046",
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="text-[12px] font-semibold w-[64px] text-right"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm (sign-up only) */}
            <div
              className="grid"
              style={{
                gridTemplateRows: mode === "signup" ? "1fr" : "0fr",
                opacity: mode === "signup" ? 1 : 0,
                transition: "grid-template-rows 0.3s ease, opacity 0.3s ease",
              }}
            >
              <div className="overflow-hidden">
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  tabIndex={mode === "signup" ? 0 : -1}
                  className={`mb-3.5 ${inputCls}`}
                  style={inputStyle}
                />
              </div>
            </div>

            {error && <p className="m-0 mb-3 text-[13px] text-[#ff8a8a]">{error}</p>}
            {info && <p className="m-0 mb-3 text-[13px] text-[#7fffc4]">{info}</p>}

            <button
              type="button"
              onClick={submit}
              disabled={busy || !configured}
              className="rant-msg-in w-full mb-3.5 py-[15px] rounded-[16px] border-none text-white font-bold text-[16px] cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg,#ff2e88,#ff7a3c)", fontFamily: display, animationDelay: "0.28s" }}
            >
              {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={switchMode}
              className="rant-msg-in block mx-auto text-[14px] text-[#9b8fc4] underline underline-offset-[3px] cursor-pointer bg-transparent border-none"
              style={{ animationDelay: "0.34s" }}
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}