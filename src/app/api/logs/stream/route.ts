import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const since = url.searchParams.get("since") || "1 hour ago";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn(
        "journalctl",
        [
          "-u", "smartreceipt",
          "-f",
          "-n", "500",
          "--no-pager",
          "-o", "short-iso",
          "--since", since,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );

      let buf = "";
      const onData = (chunk: Buffer) => {
        buf += chunk.toString();
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (!line.trim()) continue;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`));
        }
      };
      proc.stdout.on("data", onData);
      proc.stderr.on("data", onData);

      const ping = setInterval(
        () => controller.enqueue(encoder.encode(`: ping\n\n`)),
        25000,
      );

      const close = () => {
        clearInterval(ping);
        try { proc.kill("SIGTERM"); } catch {}
        try { controller.close(); } catch {}
      };
      proc.on("close", close);
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
