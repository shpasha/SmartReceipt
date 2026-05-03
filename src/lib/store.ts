import { nanoid } from "nanoid";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Receipt, Room, ReceiptItem, Participant, Selection } from "./domain/types";
import { bus, roomChannel } from "./events";

type Presence = { count: number; offlineSince: number | null; removeTimer?: NodeJS.Timeout | null };

const PRESENCE_GRACE_MS = 3000;

type Store = {
  receipts: Map<string, Receipt>;
  rooms: Map<string, Room>;
  presence: Map<string, Map<string, Presence>>;
};

const STATE_FILE = process.env.STATE_FILE
  ? resolve(process.env.STATE_FILE)
  : resolve(process.cwd(), "data", "state.json");

const g = globalThis as unknown as {
  __smartreceiptStore?: Partial<Store>;
  __smartreceiptLoaded?: boolean;
  __smartreceiptFlushTimer?: NodeJS.Timeout | null;
};
const existing = g.__smartreceiptStore ?? (g.__smartreceiptStore = {});
existing.receipts ??= new Map();
existing.rooms ??= new Map();
existing.presence ??= new Map();
const store = existing as Store;

if (!g.__smartreceiptLoaded) {
  g.__smartreceiptLoaded = true;
  try {
    const raw = readFileSync(STATE_FILE, "utf8");
    const data = JSON.parse(raw) as { receipts?: Receipt[]; rooms?: Room[] };
    for (const r of data.receipts ?? []) store.receipts.set(r.id, r);
    for (const r of data.rooms ?? []) store.rooms.set(r.code, r);
    console.log(
      `event=state.loaded receipts=${store.receipts.size} rooms=${store.rooms.size} file=${STATE_FILE}`,
    );
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.log(`event=state.load_failed file=${STATE_FILE} error="${(err as Error).message}"`);
    }
  }
}

function persist() {
  if (g.__smartreceiptFlushTimer) return;
  g.__smartreceiptFlushTimer = setTimeout(() => {
    g.__smartreceiptFlushTimer = null;
    try {
      mkdirSync(dirname(STATE_FILE), { recursive: true });
      const payload = JSON.stringify({
        receipts: [...store.receipts.values()],
        rooms: [...store.rooms.values()],
      });
      const tmp = `${STATE_FILE}.tmp`;
      writeFileSync(tmp, payload);
      renameSync(tmp, STATE_FILE);
    } catch (err) {
      console.log(`event=state.flush_failed error="${(err as Error).message}"`);
    }
  }, 500);
}


export const receipts = {
  create(input: Omit<Receipt, "id" | "createdAt">): Receipt {
    const r: Receipt = { id: nanoid(10), createdAt: Date.now(), ...input };
    store.receipts.set(r.id, r);
    persist();
    return r;
  },
  get(id: string) {
    return store.receipts.get(id);
  },
  update(id: string, patch: Partial<Omit<Receipt, "id" | "createdAt">>) {
    const cur = store.receipts.get(id);
    if (!cur) return undefined;
    const next: Receipt = { ...cur, ...patch };
    store.receipts.set(id, next);
    persist();
    return next;
  },
  upsertItem(id: string, item: Partial<ReceiptItem> & { id?: string }) {
    const cur = store.receipts.get(id);
    if (!cur) return undefined;
    let items = cur.items;
    if (item.id && items.some((i) => i.id === item.id)) {
      items = items.map((i) => (i.id === item.id ? { ...i, ...item } as ReceiptItem : i));
    } else {
      const newItem: ReceiptItem = {
        id: item.id ?? nanoid(8),
        name: item.name ?? "Новая позиция",
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
      };
      items = [...items, newItem];
    }
    const next = { ...cur, items };
    store.receipts.set(id, next);
    persist();
    return next;
  },
  removeItem(id: string, itemId: string) {
    const cur = store.receipts.get(id);
    if (!cur) return undefined;
    const next = { ...cur, items: cur.items.filter((i) => i.id !== itemId) };
    store.receipts.set(id, next);
    persist();
    return next;
  },
  replaceItems(id: string, items: ReceiptItem[]) {
    const cur = store.receipts.get(id);
    if (!cur) return undefined;
    const next = { ...cur, items };
    store.receipts.set(id, next);
    persist();
    return next;
  },
};

export const rooms = {
  create(receiptId: string, hostName: string, name: string): { room: Room; host: Participant } {
    const code = generateCode();
    const host: Participant = makeParticipant(hostName);
    const now = Date.now();
    const room: Room = {
      code,
      name,
      receiptId,
      hostId: host.id,
      createdAt: now,
      lastActivity: now,
      participants: [host],
      selections: [],
    };
    store.rooms.set(code, room);
    persist();
    return { room, host };
  },
  get(code: string) {
    return store.rooms.get(code);
  },
  findByReceipt(receiptId: string) {
    return [...store.rooms.values()].filter((r) => r.receiptId === receiptId);
  },
  join(
    code: string,
    name: string,
  ): { room: Room; participant: Participant } | { error: "not_found" | "name_taken" } {
    let room = store.rooms.get(code);
    if (!room) return { error: "not_found" };
    const trimmed = name.trim();
    const taken = room.participants.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (taken) {
      const presenceMap = store.presence.get(code);
      const onlineCount = presenceMap?.get(taken.id)?.count ?? 0;
      const hasSelections = room.selections.some((s) => s.participantId === taken.id);
      if (onlineCount > 0 || hasSelections) return { error: "name_taken" };
      room = {
        ...room,
        participants: room.participants.filter((p) => p.id !== taken.id),
      };
      presenceMap?.delete(taken.id);
    }
    const participant = makeParticipant(trimmed);
    const next: Room = {
      ...room,
      participants: [...room.participants, participant],
      lastActivity: Date.now(),
    };
    store.rooms.set(code, next);
    persist();
    return { room: next, participant };
  },
  setSelection(code: string, sel: Selection): Room | undefined {
    const room = store.rooms.get(code);
    if (!room) return undefined;
    const others = room.selections.filter(
      (s) => !(s.itemId === sel.itemId && s.participantId === sel.participantId),
    );
    const selections = sel.units > 0 ? [...others, sel] : others;
    const next = { ...room, selections, lastActivity: Date.now() };
    store.rooms.set(code, next);
    persist();
    return next;
  },
  bumpSelection(code: string, itemId: string, participantId: string, delta: number): Room | undefined {
    const room = store.rooms.get(code);
    if (!room) return undefined;
    const current = room.selections
      .filter((s) => s.itemId === itemId && s.participantId === participantId)
      .reduce((a, b) => a + b.units, 0);
    const next = Math.max(0, current + delta);
    return this.setSelection(code, { itemId, participantId, units: next });
  },

  removeIfEmpty(
    code: string,
    participantId: string,
  ): { room: Room; removed: boolean } | undefined {
    const room = store.rooms.get(code);
    if (!room) return undefined;
    const present = room.participants.some((p) => p.id === participantId);
    if (!present) return { room, removed: false };
    const hasSelections = room.selections.some((s) => s.participantId === participantId);
    if (hasSelections) return { room, removed: false };
    const next: Room = {
      ...room,
      participants: room.participants.filter((p) => p.id !== participantId),
      lastActivity: Date.now(),
    };
    store.rooms.set(code, next);
    persist();
    bus.publish(roomChannel(code), { type: "room", room: next });
    return { room: next, removed: true };
  },

  openConnection(code: string, participantId: string) {
    let map = store.presence.get(code);
    if (!map) {
      map = new Map();
      store.presence.set(code, map);
    }
    const cur = map.get(participantId) ?? { count: 0, offlineSince: null, removeTimer: null };
    if (cur.removeTimer) {
      clearTimeout(cur.removeTimer);
    }
    map.set(participantId, { count: cur.count + 1, offlineSince: null, removeTimer: null });
  },

  closeConnection(code: string, participantId: string) {
    const map = store.presence.get(code);
    if (!map) return;
    const cur = map.get(participantId);
    if (!cur) return;
    const nextCount = cur.count - 1;
    if (nextCount > 0) {
      map.set(participantId, { ...cur, count: nextCount });
      return;
    }
    if (cur.removeTimer) clearTimeout(cur.removeTimer);
    const timer = setTimeout(() => {
      const m = store.presence.get(code);
      const entry = m?.get(participantId);
      if (!entry || entry.count > 0) return;
      m!.delete(participantId);
      rooms.removeIfEmpty(code, participantId);
    }, PRESENCE_GRACE_MS);
    map.set(participantId, { count: 0, offlineSince: Date.now(), removeTimer: timer });
  },

  rename(code: string, name: string): Room | undefined {
    const room = store.rooms.get(code);
    if (!room) return undefined;
    const next: Room = { ...room, name, lastActivity: Date.now() };
    store.rooms.set(code, next);
    persist();
    bus.publish(roomChannel(code), { type: "room", room: next });
    return next;
  },

  cleanOrphanSelections(receiptId: string, validItemIds: Set<string>): Room[] {
    const affected: Room[] = [];
    for (const room of store.rooms.values()) {
      if (room.receiptId !== receiptId) continue;
      const filtered = room.selections.filter((s) => validItemIds.has(s.itemId));
      if (filtered.length === room.selections.length) continue;
      const next: Room = { ...room, selections: filtered, lastActivity: Date.now() };
      store.rooms.set(room.code, next);
      affected.push(next);
    }
    if (affected.length > 0) persist();
    return affected;
  },
};

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  if (store.rooms.has(code)) return generateCode();
  return code;
}

const palette = [
  "#a78bfa",
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
  "#fb923c",
  "#2dd4bf",
  "#e879f9",
  "#a3e635",
  "#818cf8",
];

function makeParticipant(name: string): Participant {
  return {
    id: nanoid(8),
    name: name.trim() || "Гость",
    color: palette[Math.floor(Math.random() * palette.length)],
    joinedAt: Date.now(),
  };
}
