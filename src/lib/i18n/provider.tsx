"use client";

import { createContext, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import { COOKIE_NAME, DEFAULT_LOCALE, type Locale } from "./locale";
import { dict, type Dict } from "./dict";

const Ctx = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale {
  return useContext(Ctx);
}

type DotKeys<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotKeys<T[K]>}`;
    }[keyof T & string]
  : never;

export type TKey = DotKeys<Dict>;

export function useT() {
  const locale = useLocale();
  return useCallback(
    (key: TKey, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );
}

export function useSetLocale() {
  const router = useRouter();
  return useCallback((locale: Locale) => {
    document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${
      60 * 60 * 24 * 365
    }; samesite=lax`;
    router.refresh();
  }, [router]);
}

function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const path = key.split(".");
  const lookup = (loc: Locale): string | undefined => {
    let cur: unknown = dict[loc];
    for (const k of path) {
      if (cur && typeof cur === "object" && k in (cur as object)) {
        cur = (cur as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return typeof cur === "string" ? cur : undefined;
  };
  let val = lookup(locale) ?? lookup(DEFAULT_LOCALE) ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.split(`{${k}}`).join(String(v));
    }
  }
  return val;
}
