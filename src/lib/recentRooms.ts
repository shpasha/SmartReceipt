const KEY = "smartreceipt:recent";
const MAX = 10;

export type RecentRoom = {
  code: string;
  name: string;
  firstSeenAt: number;
  lastSeenAt: number;
};

function read(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x: unknown): x is { code: string; name: string; lastSeenAt: number; firstSeenAt?: number } =>
          !!x &&
          typeof (x as { code?: unknown }).code === "string" &&
          typeof (x as { name?: unknown }).name === "string" &&
          typeof (x as { lastSeenAt?: unknown }).lastSeenAt === "number",
      )
      .map((x) => ({
        code: x.code,
        name: x.name,
        lastSeenAt: x.lastSeenAt,
        firstSeenAt: typeof x.firstSeenAt === "number" ? x.firstSeenAt : x.lastSeenAt,
      }));
  } catch {
    return [];
  }
}

function write(rooms: RecentRoom[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(rooms.slice(0, MAX)));
  } catch {
    /* ignore quota */
  }
  window.dispatchEvent(new Event("recent-rooms-updated"));
}

export function getRecentRooms(): RecentRoom[] {
  return read().sort((a, b) => b.firstSeenAt - a.firstSeenAt);
}

export function rememberRoom(code: string, name: string) {
  const rooms = read();
  const idx = rooms.findIndex((r) => r.code === code);
  const now = Date.now();
  if (idx >= 0) {
    rooms[idx] = { ...rooms[idx], name: name || rooms[idx].name, lastSeenAt: now };
  } else {
    rooms.unshift({ code, name: name || code, firstSeenAt: now, lastSeenAt: now });
  }
  write(rooms);
}

export function forgetRoom(code: string) {
  write(read().filter((r) => r.code !== code));
}
