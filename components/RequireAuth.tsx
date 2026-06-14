// components/RequireAuth.tsx
"use client";

// Wraps a protected screen. While we check the session it shows a tiny holding
// screen; if there's no logged-in user it redirects to /login; otherwise it
// renders the protected content. (If Supabase isn't configured, it can't gate,
// so it lets content through.)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    const configured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!configured) {
      setStatus("ok");
      return;
    }
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setStatus("ok");
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  if (status === "checking") {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "radial-gradient(120% 70% at 50% -8%, #2c1656 0%, #150d2b 42%, #0a0712 100%)",
        }}
      >
        <span className="animate-pulse inline-flex"><Logo size={40} /></span>
      </main>
    );
  }

  return <>{children}</>;
}