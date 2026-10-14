import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "PLANPOCKET — Finance App" },
      {
        name: "description",
        content:
          "Budgets, expenses, goals, investments, reports and a CFO Helper in one calm finance dashboard.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      page: typeof search['page'] === "string" ? search['page'] : undefined,
    };
  },
  component: AppPage,
});

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

function AppPage() {
  const { page } = Route.useSearch();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync route target and supabase client to iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let authSub: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = client.auth.onAuthStateChange((event, session) => {
          try {
            const win = iframe.contentWindow;
            if (win) {
              win.postMessage({ type: "SUPABASE_AUTH_EVENT", event, session }, "*");
            }
          } catch {}
        });
        authSub = data.subscription;
      }
    }

    const syncPage = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) return;

        // Share Supabase client if configured
        if (isSupabaseConfigured()) {
          const client = getSupabaseClient();
          if (client) {
            (win as unknown as { supabaseClient?: typeof client }).supabaseClient = client;
          }
        }

        // Check search param or window hash
        const target =
          page ||
          (typeof window !== "undefined"
            ? window.location.hash.replace("#", "")
            : "");

        if (target === "signup" || target === "signupPage") {
          win.postMessage("showSignup", "*");
        } else if (target === "login" || target === "loginPage") {
          win.postMessage("showLogin", "*");
        } else if (target === "forgot" || target === "forgotPasswordPage") {
          win.postMessage("showForgotPassword", "*");
        } else if (target === "welcome" || target === "welcomePage") {
          win.postMessage("showWelcome", "*");
        }
      } catch {
        // ignore cross-origin if any
      }
    };

    iframe.addEventListener("load", syncPage);
    syncPage();

    return () => {
      iframe.removeEventListener("load", syncPage);
      authSub?.unsubscribe();
    };
  }, [page]);

  // Compute initial src with target hash
  const initialTarget =
    page ||
    (typeof window !== "undefined"
      ? window.location.hash.replace("#", "")
      : "");
  const iframeSrc = initialTarget
    ? `/planpocket.html#${initialTarget}`
    : "/planpocket.html";

  return (
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      title="PLANPOCKET Finance App"
      className="fixed inset-0 h-screen w-screen border-0"
    />
  );
}
