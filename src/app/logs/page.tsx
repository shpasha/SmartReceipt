"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const SINCE_PRESETS = [
  { label: "10 мин", value: "10 minutes ago" },
  { label: "1 час", value: "1 hour ago" },
  { label: "1 день", value: "1 day ago" },
  { label: "7 дней", value: "7 days ago" },
];

type Line = {
  raw: string;
  ts?: string;
  body: string;
  event?: string;
  fields?: Record<string, string>;
};

export default function LogsPage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [eventOnly, setEventOnly] = useState(false);
  const [paused, setPaused] = useState(false);
  const [since, setSince] = useState(SINCE_PRESETS[1].value);
  const [loading, setLoading] = useState(false);

  const load = useMemo(() => {
    return async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          apiUrl(`/api/logs?since=${encodeURIComponent(since)}&n=500`),
        );
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const text = await res.text();
        const parsed = text
          .split("\n")
          .filter((l) => l.trim())
          .map(parseLine)
          .reverse();
        setLines(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "ошибка");
      } finally {
        setLoading(false);
      }
    };
  }, [since]);

  useEffect(() => {
    if (paused) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [paused, load]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return lines.filter((l) => {
      if (eventOnly && !l.event) return false;
      if (!f) return true;
      return l.raw.toLowerCase().includes(f);
    });
  }, [lines, filter, eventOnly]);

  const counts = lines.reduce<Record<string, number>>((acc, l) => {
    if (l.event) acc[l.event] = (acc[l.event] ?? 0) + 1;
    return acc;
  }, {});
  const eventTypes = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <main className="mx-auto max-w-5xl px-5 pt-8 pb-16">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold">Логи</h1>
          <div className="text-mute text-xs mt-1 flex items-center gap-1.5">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                paused ? "bg-mute" : loading ? "bg-warn animate-pulse" : "bg-success animate-pulse",
              )}
            />
            {lines.length} строк · {filtered.length} после фильтра
            {paused && <span>· пауза</span>}
            {loading && !paused && <span>· подключаюсь…</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="btn btn-ghost"
            title={paused ? "Продолжить" : "Пауза"}
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {paused ? "Старт" : "Пауза"}
          </button>
        </div>
      </div>

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Фильтр по подстроке…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-mute px-2">
          <input type="checkbox" checked={eventOnly} onChange={(e) => setEventOnly(e.target.checked)} />
          только events
        </label>
        <select
          className="input"
          value={since}
          onChange={(e) => setSince(e.target.value)}
        >
          {SINCE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {eventTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {eventTypes.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setFilter(`event=${name}`)}
              className="chip hover:bg-white/10 transition cursor-pointer"
              style={{ borderColor: eventColor(name) + "55" }}
            >
              <span style={{ color: eventColor(name) }}>●</span>
              <span className="font-mono text-xs">{name}</span>
              <span className="text-mute tabular-nums">{count}</span>
            </button>
          ))}
        </div>
      )}

      {error && <div className="text-danger text-sm mb-3">{error}</div>}

      <div className="card p-2 font-mono text-xs leading-relaxed overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="text-mute text-center py-8">Пусто</div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((l, i) => (
              <LogRow key={i} line={l} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function LogRow({ line }: { line: Line }) {
  if (line.event) {
    return (
      <div className="flex items-baseline gap-3 px-2 py-1 rounded hover:bg-white/[0.03]">
        <span className="text-mute shrink-0 tabular-nums">{line.ts}</span>
        <span
          className="font-semibold shrink-0"
          style={{ color: eventColor(line.event) }}
        >
          {line.event}
        </span>
        <span className="flex-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {Object.entries(line.fields ?? {}).map(([k, v]) => (
            <span key={k}>
              <span className="text-mute">{k}=</span>
              <span className="text-ink">{v}</span>
            </span>
          ))}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-3 px-2 py-1 text-mute hover:bg-white/[0.03]">
      <span className="shrink-0 tabular-nums">{line.ts}</span>
      <span className="break-all">{line.body}</span>
    </div>
  );
}

function parseLine(raw: string): Line {
  const m = raw.match(/^(\S+)\s+\S+\s+\S+:\s*(.*)$/);
  let ts: string | undefined;
  let body = raw;
  if (m) {
    ts = m[1].replace("T", " ").slice(5, 16);
    body = m[2];
  }
  const eventMatch = body.match(/event=(\S+)/);
  if (!eventMatch) return { raw, ts, body };
  const event = eventMatch[1];
  const fields: Record<string, string> = {};
  const re = /(\w[\w.]*)=("(?:[^"\\]|\\.)*"|\S+)/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(body)) !== null) {
    if (mm[1] === "event") continue;
    let v = mm[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"');
    fields[mm[1]] = v;
  }
  return { raw, ts, body, event, fields };
}

function eventColor(name: string) {
  const map: Record<string, string> = {
    "room.create": "#a78bfa",
    "room.join": "#34d399",
    "room.leave": "#fb923c",
    "receipt.parsed": "#22d3ee",
    "receipt.parse_failed": "#f87171",
    "state.loaded": "#818cf8",
    "state.flush_failed": "#f87171",
  };
  if (map[name]) return map[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 65%)`;
}
