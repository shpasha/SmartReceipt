import { NextResponse } from "next/server";
import { z } from "zod";
import { rooms } from "@/lib/store";
import { bus, roomChannel } from "@/lib/events";

const Body = z.union([
  z.object({
    itemId: z.string(),
    participantId: z.string(),
    units: z.number().min(0),
  }),
  z.object({
    itemId: z.string(),
    participantId: z.string(),
    delta: z.number(),
  }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const body = Body.parse(await req.json());

  const room =
    "delta" in body
      ? rooms.bumpSelection(code, body.itemId, body.participantId, body.delta)
      : rooms.setSelection(code, body);

  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });
  bus.publish(roomChannel(room.code), { type: "room", room });
  return NextResponse.json({ room });
}
