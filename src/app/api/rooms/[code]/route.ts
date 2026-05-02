import { NextResponse } from "next/server";
import { z } from "zod";
import { receipts, rooms } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = rooms.get(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });
  const receipt = receipts.get(room.receiptId);
  if (!receipt) return NextResponse.json({ error: "receipt not found" }, { status: 404 });
  return NextResponse.json({ room, receipt });
}

const PatchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = PatchSchema.parse(await req.json());
  let room = rooms.get(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });
  if (body.name !== undefined) {
    room = rooms.rename(code.toUpperCase(), body.name.trim());
  }
  return NextResponse.json({ room });
}
