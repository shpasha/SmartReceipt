import { receipts, rooms } from "@/lib/store";
import { bus, roomChannel } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const room = rooms.get(code);
  if (!room) return new Response("not found", { status: 404 });

  const url = new URL(req.url);
  const pid = url.searchParams.get("pid") || null;
  if (pid) rooms.openConnection(code, pid);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "snapshot", room, receipt: receipts.get(room.receiptId) });

      const unsubscribe = bus.subscribe(roomChannel(code), (payload) => send(payload));
      const ping = setInterval(() => controller.enqueue(encoder.encode(`: ping\n\n`)), 25000);

      const close = () => {
        clearInterval(ping);
        unsubscribe();
        if (pid) rooms.closeConnection(code, pid);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
