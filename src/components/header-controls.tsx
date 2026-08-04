"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n, type Lang } from "@/lib/i18n";

const LANGS: Lang[] = ["fr", "en"];

// `mounted` guards against a server/client icon mismatch: the resolved theme is
// only known in the browser. Read as an external store so no effect is needed.
const subscribeNever = () => () => {};

export function HeaderControls() {
  const { resolvedTheme, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const isDark = (resolvedTheme ?? "dark") !== "light";

  return (
    <div className="flex items-center gap-2">
      {/* Segmented FR | EN toggle — active language highlighted */}
      <div
        role="group"
        aria-label={t("header.lang")}
        className="flex items-center rounded-md border border-border p-0.5"
      >
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            className={cn(
              "rounded px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide transition-colors",
              lang === l
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={t("header.theme")}
        className="size-8 text-muted-foreground"
      >
        {mounted && !isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </Button>
    </div>
  );
}
