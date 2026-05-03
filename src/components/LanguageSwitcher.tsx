"use client";

import { Languages } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale, useSetLocale, useT } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const ORDER: Locale[] = ["en", "ru"];

export function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT();
  if (pathname !== "/" && pathname !== "/join") return null;
  return (
    <div
      className="mx-auto -mt-16 mb-6 flex w-fit items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-1 text-xs relative"
      role="group"
      aria-label={t("switcher.aria")}
    >
      <Languages className="w-3.5 h-3.5 text-mute mx-1.5" aria-hidden />
      {ORDER.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => setLocale(loc)}
          aria-pressed={locale === loc}
          className={cn(
            "px-2.5 py-1 rounded-full transition font-medium tabular-nums",
            locale === loc
              ? "bg-white/15 text-ink"
              : "text-mute hover:text-ink hover:bg-white/[0.06]",
          )}
        >
          {t(`switcher.${loc}` as const)}
        </button>
      ))}
    </div>
  );
}
