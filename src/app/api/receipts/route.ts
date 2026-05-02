import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getOCRProvider } from "@/lib/ocr/claude";
import { OCRError } from "@/lib/ocr/types";
import { receipts } from "@/lib/store";
import { logEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "image is required" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const mimeType = file.type || "image/jpeg";

  try {
    const parsed = await getOCRProvider().parse({ base64, mimeType });
    const receipt = receipts.create({
      currency: parsed.currency,
      items: parsed.items.map((i) => ({ id: nanoid(8), ...i })),
      serviceCharge: parsed.serviceCharge,
      tax: parsed.tax,
      total: parsed.total,
    });
    logEvent("receipt.parsed", {
      id: receipt.id,
      items: receipt.items.length,
      total: receipt.total,
      currency: receipt.currency,
    });
    return NextResponse.json({ receipt });
  } catch (err) {
    if (err instanceof OCRError) {
      logEvent("receipt.parse_failed", {
        kind: err.kind,
        error: err.message,
        ...(err.raw && process.env.NODE_ENV !== "production" ? { raw: err.raw.slice(0, 500) } : {}),
      });
      const status = err.kind === "transient" ? 503 : 422;
      return NextResponse.json({ error: err.message, kind: err.kind }, { status });
    }
    const message = err instanceof Error ? err.message : "OCR failed";
    logEvent("receipt.parse_failed", { kind: "unknown", error: message });
    return NextResponse.json(
      { error: "Что-то пошло не так. Попробуй ещё раз", kind: "transient" },
      { status: 500 },
    );
  }
}
