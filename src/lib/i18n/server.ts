import { cookies, headers } from "next/headers";
import {
  COOKIE_NAME,
  isLocale,
  pickFromAcceptLanguage,
  type Locale,
} from "./locale";

export async function getServerLocale(): Promise<Locale> {
  const c = await cookies();
  const fromCookie = c.get(COOKIE_NAME)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const h = await headers();
  return pickFromAcceptLanguage(h.get("accept-language"));
}
