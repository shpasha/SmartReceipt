import { NextResponse } from "next/server";
import { z } from "zod";
import { receipts, rooms } from "@/lib/store";
import { logEvent } from "@/lib/log";

const Item = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
});

const Body = z.object({
  receiptId: z.string(),
  hostName: z.string().min(1).max(40),
  name: z.string().min(1).max(60),
  draft: z
    .object({
      items: z.array(Item),
      serviceCharge: z.number().nonnegative(),
      tax: z.number().nonnegative(),
      currency: z.string(),
      comment: z.string().max(500).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  if (!receipts.get(body.receiptId)) {
    return NextResponse.json({ error: "receipt not found" }, { status: 404 });
  }
  if (body.draft) {
    receipts.update(body.receiptId, body.draft);
  }
  const { room, host } = rooms.create(body.receiptId, body.hostName, body.name);
  logEvent("room.create", {
    code: room.code,
    name: room.name,
    host: body.hostName,
    items: body.draft?.items.length,
  });
  return NextResponse.json({ room, you: host });
}
