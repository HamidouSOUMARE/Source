"use client";

import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { ScanSearch, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

/**
 * Full-screen gate shown while establishing the anonymous session. Renders the
 * Cloudflare Turnstile widget and hands the token back via `onToken`.
 * Returns null when no site key is configured (captcha disabled).
 */
export function TurnstileGate({ onToken }: { onToken: (token: string) => void }) {
  const { t } = useI18n();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // bump to remount the widget

  if (!siteKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-border bg-card px-8 py-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <ScanSearch className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-display text-lg font-semibold tracking-tight">Sourcé</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {t("gate.subtitle")}
          </p>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <ShieldAlert className="size-4 shrink-0" />
              <span>{t("gate.fail", { code: error })}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("gate.hint")}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setError(null);
                setAttempt((a) => a + 1);
              }}
            >
              <RefreshCw className="size-3.5" /> {t("gate.retry")}
            </Button>
          </div>
        ) : (
          <Turnstile
            key={attempt}
            siteKey={siteKey}
            onSuccess={onToken}
            onError={(code) => setError(String(code))}
            onExpire={() => setError("expired")}
            options={{ theme: "auto" }}
          />
        )}
      </div>
    </div>
  );
}
