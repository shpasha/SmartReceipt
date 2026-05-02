import { NextResponse } from "next/server";
import { z } from "zod";
import { rooms } from "@/lib/store";
import { logEvent } from "@/lib/log";

const Body = z.object({ participantId: z.string() });

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const { participantId } = Body.parse(await req.json());
  const before = rooms.get(code);
  const leaver = before?.participants.find((p) => p.id === participantId);
  const result = rooms.removeIfEmpty(code, participantId);
  if (!result) return NextResponse.json({ error: "room not found" }, { status: 404 });
  if (result.removed) {
    logEvent("room.leave", {
      code,
      name: leaver?.name,
      total: result.room.participants.length,
    });
  }
  return NextResponse.json({ room: result.room });
}
