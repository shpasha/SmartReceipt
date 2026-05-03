import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import type { OCRProvider, ParsedReceipt } from "./types";
import { OCRError } from "./types";
import { logEvent } from "@/lib/log";

function getProxyUrls(): string[] {
  const list = process.env.OCR_PROXIES ?? process.env.HTTPS_PROXY ?? process.env.https_proxy ?? "";
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function proxyLabel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || (u.protocol === "https:" ? "443" : "80")}`;
  } catch {
    return "invalid";
  }
}

function buildFetchWith(dispatcher: ProxyAgent): typeof fetch {
  return ((url: string | URL | Request, init?: RequestInit) => {
    const merged = Object.assign({}, init ?? {}, { dispatcher });
    return undiciFetch(url as never, merged as never);
  }) as unknown as typeof fetch;
}

const Schema = z.object({
  currency: z.string().default("RUB"),
  items: z
    .array(
      z.object({
        name: z
          .string()
          .transform((s) => s.trim())
          .pipe(z.string().min(1, "empty item name").catch("Без названия")),
        quantity: z.number().positive().default(1),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .default([]),
  serviceCharge: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  total: z.number().nonnegative().default(0),
});

const SYSTEM = `You are a precise OCR engine for restaurant receipts. Read the image carefully (including non-Latin scripts: Cyrillic, Georgian, Greek, CJK, etc.) and return STRICTLY a single valid JSON object — no prose, no markdown fences.

Schema:
{
  "currency": ISO 4217 code (e.g. "RUB", "USD", "EUR", "GEL", "KZT"),
  "items": [{ "name": string, "quantity": number, "unitPrice": number }],
  "serviceCharge": number,
  "tax": number,
  "total": number
}

Rules:
- Transcribe each item name EXACTLY as printed, in the original script and case. Do NOT translate, transliterate, abbreviate, or invent names. If a character is unclear, use your best guess — never output placeholders like "Item 1", "Unknown", "Position".
- Include only real ordered dishes/drinks. Skip header lines, addresses, table numbers, waiter names, payment-method lines, totals, subtotals, taxes, "Спасибо", thank-you notes, etc.
- "quantity": numeric count of the line. Default 1 if not shown.
- "unitPrice": price per single unit. If the receipt shows only a line total, divide by quantity.
- "serviceCharge": tip / service fee line if explicitly listed, else 0.
- "tax": VAT / sales tax line if explicitly listed, else 0.
- "total": grand total printed on the receipt. If missing, compute sum(items) + serviceCharge + tax.
- All numbers must be plain numbers (no currency symbols, no thousands separators, dot as decimal).
- Detect currency from symbols/codes on the receipt (₽→RUB, $→USD, €→EUR, ₾→GEL, ₸→KZT). Default "RUB" only if truly indeterminable.

Output: the JSON object only.`;

type Channel = { label: string; client: Anthropic };

export class ClaudeOCRProvider implements OCRProvider {
  private channels: Channel[];
  private preferredIndex = 0;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    const proxies = getProxyUrls();
    if (proxies.length === 0) {
      this.channels = [{ label: "direct", client: new Anthropic({ apiKey }) }];
    } else {
      this.channels = proxies.map((url) => ({
        label: proxyLabel(url),
        client: new Anthropic({ apiKey, fetch: buildFetchWith(new ProxyAgent(url)) }),
      }));
    }
  }

  async parse(image: { base64: string; mimeType: string }): Promise<ParsedReceipt> {
    let res: Anthropic.Message | undefined;
    let lastErr: unknown;
    const n = this.channels.length;
    for (let step = 0; step < n; step++) {
      const idx = (this.preferredIndex + step) % n;
      const channel = this.channels[idx];
      try {
        res = await channel.client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: SYSTEM,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: image.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                    data: image.base64,
                  },
                },
                { type: "text", text: "Parse this receipt into JSON matching the schema." },
              ],
            },
          ],
        });
        if (idx !== this.preferredIndex) {
          logEvent("ocr.preferred_changed", { from: this.channels[this.preferredIndex].label, to: channel.label });
          this.preferredIndex = idx;
        }
        break;
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number })?.status;
        const msg = err instanceof Error ? err.message : String(err);
        if (status === 400 && /image|media|could not process|invalid/i.test(msg)) {
          throw new OCRError("not_a_receipt", "На фото не похоже на чек — попробуй ещё раз");
        }
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw new OCRError("parse_failed", "Не удалось распознать чек. Попробуй сделать фото ярче и без бликов");
        }
        logEvent("ocr.channel_failed", {
          channel: channel.label,
          status: status ?? 0,
          error: shortErr(err),
        });
      }
    }
    if (!res) {
      logEvent("ocr.all_channels_failed", {
        channels: this.channels.length,
        error: shortErr(lastErr),
      });
      throw new OCRError("transient", "Сервис распознавания временно недоступен. Попробуй ещё раз через минуту");
    }

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    if (process.env.NODE_ENV !== "production") {
      console.log("[OCR raw]", text);
    }

    let json: unknown;
    try {
      json = extractJSON(text);
    } catch {
      throw new OCRError(
        "parse_failed",
        "Не удалось распознать позиции. Попробуй сделать фото ярче и без бликов",
        text,
      );
    }

    let parsed: ParsedReceipt;
    try {
      parsed = Schema.parse(json);
    } catch {
      throw new OCRError(
        "parse_failed",
        "Не удалось распознать позиции. Попробуй сделать фото ярче и без бликов",
        text,
      );
    }

    if (parsed.items.length === 0 && parsed.total === 0) {
      throw new OCRError(
        "not_a_receipt",
        "На фото не похоже на чек — попробуй ещё раз",
        text,
      );
    }

    parsed.items = mergeDuplicates(parsed.items);
    return parsed;
  }
}

function shortErr(err: unknown): string {
  if (!err) return "unknown";
  if (err instanceof Error) {
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    const code = cause?.code ? `[${cause.code}]` : "";
    return `${err.name}${code}: ${err.message}`.slice(0, 200);
  }
  return String(err).slice(0, 200);
}

function mergeDuplicates<T extends { name: string; quantity: number; unitPrice: number }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = `${item.name.trim().toLowerCase()}|${item.unitPrice}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      map.set(key, { ...item });
    }
  }
  return [...map.values()];
}

function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  return JSON.parse(slice);
}

let singleton: OCRProvider | null = null;
export function getOCRProvider(): OCRProvider {
  if (!singleton) singleton = new ClaudeOCRProvider();
  return singleton;
}
