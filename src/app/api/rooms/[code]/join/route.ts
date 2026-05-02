import { NextResponse } from "next/server";
import { z } from "zod";
import { rooms } from "@/lib/store";
import { bus, roomChannel } from "@/lib/events";

const Body = z.object({ name: z.string().min(1).max(40) });

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { name } = Body.parse(await req.json());
  const result = rooms.join(code.toUpperCase(), name);
  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "room not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "name_taken" }, { status: 409 });
  }
  bus.publish(roomChannel(result.room.code), { type: "room", room: result.room });
  return NextResponse.json({ room: result.room, you: result.participant });
}
