import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getOCRProvider } from "@/lib/ocr/claude";
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
    const message = err instanceof Error ? err.message : "OCR failed";
    logEvent("receipt.parse_failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
