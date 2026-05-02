import { NextResponse } from "next/server";
import { z } from "zod";
import { receipts, rooms } from "@/lib/store";

const Body = z.object({
  receiptId: z.string(),
  hostName: z.string().min(1).max(40),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  if (!receipts.get(body.receiptId)) {
    return NextResponse.json({ error: "receipt not found" }, { status: 404 });
  }
  const { room, host } = rooms.create(body.receiptId, body.hostName);
  return NextResponse.json({ room, you: host });
}
