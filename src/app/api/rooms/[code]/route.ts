import { NextResponse } from "next/server";
import { receipts, rooms } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = rooms.get(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });
  const receipt = receipts.get(room.receiptId);
  if (!receipt) return NextResponse.json({ error: "receipt not found" }, { status: 404 });
  return NextResponse.json({ room, receipt });
}
