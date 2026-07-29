"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { DEMO_MODE } from "@/lib/demo";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface SessionState {
  ready: boolean;
  token: string | null;
  userId: string | null;
  needsCaptcha: boolean;
}

export interface Session extends SessionState {
  /** Complete anonymous sign-in, optionally with a Turnstile captcha token. */
  completeSignIn: (captchaToken?: string) => Promise<void>;
}

/**
 * Ensures the visitor has a (frictionless) anonymous Supabase identity.
 * When Supabase enforces captcha, `needsCaptcha` turns true and the UI must
 * render a Turnstile widget, then call `completeSignIn(token)`.
 */
export function useSession(): Session {
  const [state, setState] = useState<SessionState>({
    ready: false,
    token: null,
    userId: null,
    needsCaptcha: false,
  });

  const completeSignIn = useCallback(async (captchaToken?: string) => {
    const { data, error } = await supabase.auth.signInAnonymously(
      captchaToken ? { options: { captchaToken } } : undefined,
    );
    if (error) {
      console.error("Anonymous sign-in failed:", error.message);
      // Keep needsCaptcha so the widget can issue a fresh token and retry.
      setState((s) => ({ ...s, ready: true }));
      return;
    }
    if (data.session) {
      setState({
        ready: true,
        token: data.session.access_token,
        userId: data.session.user.id,
        needsCaptcha: false,
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      // Demo mode has no backend — hand back a ready, tokenless session.
      if (DEMO_MODE) {
        if (active) setState({ ready: true, token: null, userId: null, needsCaptcha: false });
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (active)
          setState({
            ready: true,
            token: data.session.access_token,
            userId: data.session.user.id,
            needsCaptcha: false,
          });
        return;
      }
      // No session yet — sign in anonymously.
      if (SITE_KEY) {
        // Gate on a captcha token supplied by the Turnstile widget.
        if (active) setState((s) => ({ ...s, needsCaptcha: true }));
      } else {
        // Dev fallback — only succeeds if Supabase captcha protection is off.
        await completeSignIn();
      }
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active || !s) return;
      setState({
        ready: true,
        token: s.access_token,
        userId: s.user.id,
        needsCaptcha: false,
      });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [completeSignIn]);

  return { ...state, completeSignIn };
}
