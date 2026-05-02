import { NextResponse } from "next/server";
import { z } from "zod";
import { rooms } from "@/lib/store";

const Body = z.object({ participantId: z.string() });

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const { participantId } = Body.parse(await req.json());
  const room = rooms.removeIfEmpty(code, participantId);
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });
  return NextResponse.json({ room });
}
