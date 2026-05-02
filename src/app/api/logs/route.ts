import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const n = Math.min(2000, Math.max(10, Number(url.searchParams.get("n") ?? "300")));
  const since = url.searchParams.get("since") || "1 day ago";

  const text = await new Promise<string>((resolve, reject) => {
    const p = spawn(
      "journalctl",
      ["-u", "smartreceipt", "-n", String(n), "--no-pager", "-o", "short-iso", "--since", since],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    let err = "";
    p.stdout.on("data", (b) => (out += b.toString()));
    p.stderr.on("data", (b) => (err += b.toString()));
    p.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(err || `journalctl exit ${code}`));
    });
    p.on("error", reject);
  }).catch((e: Error) => `__error__: ${e.message}`);

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
